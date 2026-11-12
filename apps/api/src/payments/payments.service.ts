import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Payment, PaymentProvider, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuthUser } from '../auth/current-user.decorator';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { lockOrder } from '../orders/lock-order';
import { transitionOrder } from '../orders/order-transitions';
import { PrismaService } from '../prisma/prisma.service';
import { GatewayError, GatewayHttp, GatewayResult, PaymentGateway } from './gateways/gateway';
import { MomoGateway } from './gateways/momo';
import { VnpayGateway } from './gateways/vnpay';
import { expireStaleSessions, sessionExpiresAt } from './payment-session';
import { CreatePaymentDto, PaymentDisplayStatus } from './payments.dto';

const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 };
/** Trang chờ hỏi mỗi 1,5 giây, nhưng API chỉ tra cứu cổng tối đa mỗi chừng này một lần cho một phiên */
const GATEWAY_CHECK_INTERVAL_MS = 4_000;

export const PROVIDER_NAME: Record<PaymentProvider, string> = { MOMO: 'MoMo', VNPAY: 'VNPay' };

/** Trạng thái hiển thị: phiên FAILED mà cổng chưa từng xác nhận là phiên hết hạn */
export function displayStatus(p: Pick<Payment, 'status' | 'confirmedAt'>): PaymentDisplayStatus {
  return p.status === 'FAILED' && !p.confirmedAt ? 'EXPIRED' : p.status;
}

@Injectable()
export class PaymentsService {
  private readonly gateways: Record<PaymentProvider, PaymentGateway>;
  private readonly lastChecked = new Map<number, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyService,
    http: GatewayHttp,
  ) {
    this.gateways = { MOMO: new MomoGateway(http), VNPAY: new VnpayGateway(http) };
  }

  /** FR-11: phiên quá 15 phút chưa có kết quả bị đánh FAILED */
  expireStaleSessions(db: Prisma.TransactionClient = this.prisma, orderId?: number) {
    return expireStaleSessions(db, orderId);
  }

  /**
   * FR-11, FR-12: mở phiên thanh toán ở cổng MoMo hoặc VNPay (bên thứ ba).
   * 1. Giữ chỗ Idempotency-Key bằng bản ghi Payment PROCESSING (UNIQUE); đơn vẫn PENDING.
   * 2. Gọi cổng tạo giao dịch, trả về link trang thanh toán của cổng.
   * Gửi lại cùng khóa, hoặc đơn đang có phiên còn hạn, thì nhận lại đúng phiên đó.
   */
  async open(user: AuthUser, dto: CreatePaymentDto, key: string, clientIp: string) {
    const existing = await this.findByKey(key);
    if (existing) return this.replay(existing, user, dto);

    let reserved: { payment: Payment; replayed: boolean };
    try {
      reserved = await this.prisma.$transaction(async (tx) => {
        const order = await lockOrder(tx, dto.orderId);
        if (!order || order.userId !== user.id) throw new NotFoundException('Không tìm thấy đơn hàng');

        await expireStaleSessions(tx, order.id);
        const active = await tx.payment.findFirst({ where: { orderId: order.id, status: 'PROCESSING' } });
        if (active) {
          if (active.provider !== dto.provider) {
            const name = PROVIDER_NAME[active.provider];
            throw new ConflictException(
              `Đơn đang có phiên thanh toán ${name} chưa kết thúc. Tiếp tục trên ${name} hoặc bấm hủy giao dịch ở đó rồi chọn lại.`,
            );
          }
          return { payment: active, replayed: true };
        }

        if (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') {
          throw new ConflictException('Đơn không ở trạng thái chờ thanh toán');
        }
        // A5: thanh toán lại đơn PAYMENT_FAILED – đơn về PENDING khi mở phiên mới
        if (order.status === 'PAYMENT_FAILED') await transitionOrder(tx, order.id, 'PAYMENT_FAILED', 'PENDING');

        const created = await tx.payment.create({
          data: {
            orderId: order.id,
            idempotencyKey: key,
            amount: order.total,
            provider: dto.provider,
            gatewayOrderId: newGatewayOrderId(),
          },
        });
        return { payment: created, replayed: false };
      }, TX_OPTIONS);
    } catch (e) {
      // Hai yêu cầu cùng khóa đến đồng thời: yêu cầu thua bị UNIQUE chặn, trả phiên của yêu cầu thắng
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const winner = await this.findByKey(key);
        if (winner) return this.replay(winner, user, dto);
      }
      throw e;
    }

    let payment = reserved.payment;
    if (!reserved.replayed) payment = await this.openAtGateway(payment, returnOrigin(dto.returnOrigin), clientIp);
    return this.view(payment, reserved.replayed);
  }

  /**
   * Trang chờ hỏi kết quả mỗi 1,5 giây (FR-11). Phiên còn mở thì API tự tra cứu cổng (server gọi server),
   * nên khách trả bằng app trên điện thoại thì trang trên máy tính vẫn biết kết quả.
   */
  async getForUser(user: AuthUser, id: number) {
    const found = await this.prisma.payment.findUnique({ where: { id }, include: { order: { select: { userId: true } } } });
    if (!found || (found.order.userId !== user.id && user.role !== 'STAFF')) {
      throw new NotFoundException('Không tìm thấy phiên thanh toán');
    }
    await expireStaleSessions(this.prisma, found.orderId);
    let payment = await this.prisma.payment.findUniqueOrThrow({ where: { id } });
    const last = this.lastChecked.get(id) ?? 0;
    if (payment.status === 'PROCESSING' && payment.payUrl && Date.now() - last >= GATEWAY_CHECK_INTERVAL_MS) {
      this.lastChecked.set(id, Date.now());
      // Cổng chậm hoặc mất mạng thì giữ nguyên trạng thái, lần hỏi sau thử lại
      await this.refreshFromGateway(payment).catch(() => undefined);
      payment = await this.prisma.payment.findUniqueOrThrow({ where: { id } });
    }
    return this.view(payment, false);
  }

  /**
   * Cổng chuyển khách về BrewLite kèm kết quả có chữ ký. Kiểm tra chữ ký để chặn kết quả tự chế,
   * rồi hỏi lại cổng bằng API tra cứu; kết quả đã chốt mới cập nhật đơn (BR-07).
   */
  async confirmReturn(user: AuthUser, id: number, params: Record<string, unknown>) {
    const payment = await this.prisma.payment.findFirst({ where: { id, order: { userId: user.id } } });
    if (!payment) throw new NotFoundException('Không tìm thấy phiên thanh toán');
    const gateway = this.gateways[payment.provider];
    const callback = gateway.parseCallback(params);
    if (!callback) throw new BadRequestException('Chữ ký kết quả thanh toán không hợp lệ');
    if (callback.gatewayOrderId !== payment.gatewayOrderId) throw new BadRequestException('Kết quả không thuộc giao dịch này');

    const queried = await gateway.query(payment.gatewayOrderId, payment.createdAt).catch(() => null);
    const result = queried && queried.status !== 'PENDING' ? queried : callback;
    if (result.status !== 'PENDING') await this.settle(payment.id, result);
    this.lastChecked.set(payment.id, Date.now());
    return this.view(await this.prisma.payment.findUniqueOrThrow({ where: { id } }), false);
  }

  /** IPN của MoMo (MoMo gọi khi API có địa chỉ công khai); sai chữ ký trả 400 */
  async momoIpn(body: Record<string, unknown>) {
    const result = this.gateways.MOMO.parseCallback(body);
    if (!result) throw new BadRequestException('Chữ ký IPN không hợp lệ');
    const payment = await this.prisma.payment.findUnique({ where: { gatewayOrderId: result.gatewayOrderId } });
    if (!payment) throw new NotFoundException('Không tìm thấy phiên thanh toán');
    if (result.status !== 'PENDING') await this.settle(payment.id, result);
  }

  /** IPN của VNPay: RspCode 97 sai chữ ký, 01 không thấy giao dịch, 04 sai số tiền (VNPay gửi lại), 02 đã xử lý */
  async vnpayIpn(query: Record<string, unknown>) {
    const result = this.gateways.VNPAY.parseCallback(query);
    if (!result) return { RspCode: '97', Message: 'Invalid signature' };
    const payment = await this.prisma.payment.findUnique({ where: { gatewayOrderId: result.gatewayOrderId } });
    if (!payment) return { RspCode: '01', Message: 'Order not found' };
    if (payment.amount !== result.amount) return { RspCode: '04', Message: 'invalid amount' };
    const { duplicate } = await this.settle(payment.id, result);
    return duplicate ? { RspCode: '02', Message: 'Order already confirmed' } : { RspCode: '00', Message: 'Confirm Success' };
  }

  /**
   * Ghi kết quả cổng đã chốt. Cổng báo lặp (link quay về, IPN, tra cứu cùng lúc) chỉ được xử lý một lần,
   * nên không cộng điểm hai lần (FR-12). Khóa đơn như khi hủy đơn để hai việc không chạy chồng nhau (ADR-006).
   */
  private async settle(paymentId: number, result: GatewayResult) {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (result.amount !== payment.amount) throw new BadRequestException('Số tiền không khớp với phiên thanh toán');

    return this.prisma.$transaction(async (tx) => {
      const order = await lockOrder(tx, payment.orderId);
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      const success = result.status === 'SUCCESS';
      // BrewLite đã cho phiên hết hạn (FAILED, chưa có xác nhận) mà cổng vẫn báo đã trừ tiền: vẫn phải ghi nhận
      const lateSuccess = success && current.status === 'FAILED' && current.confirmedAt === null;
      if (current.status !== 'PROCESSING' && !lateSuccess) return { duplicate: true };

      await tx.payment.update({
        where: { id: current.id },
        data: {
          status: success ? 'SUCCESS' : 'FAILED',
          gatewayRef: result.transactionNo,
          bankCode: result.bankCode,
          payType: result.payType,
          gatewayResult: result.raw as Prisma.InputJsonValue,
          confirmedAt: new Date(),
        },
      });

      if (!success) {
        if (order.status === 'PENDING') await transitionOrder(tx, order.id, 'PENDING', 'PAYMENT_FAILED');
        return { duplicate: false };
      }
      let status = order.status;
      if (status === 'PAYMENT_FAILED') {
        await transitionOrder(tx, order.id, 'PAYMENT_FAILED', 'PENDING');
        status = 'PENDING';
      }
      // Đơn đã hủy trong lúc chờ thì giữ nguyên: tiền hiện ở mục "Cần hoàn tiền" (FR-26)
      if (status === 'PENDING') {
        await transitionOrder(tx, order.id, 'PENDING', 'PAID');
        await this.loyalty.earn(tx, order);
      }
      return { duplicate: false };
    }, TX_OPTIONS);
  }

  private async refreshFromGateway(payment: Payment) {
    const result = await this.gateways[payment.provider].query(payment.gatewayOrderId, payment.createdAt);
    if (result.status !== 'PENDING') await this.settle(payment.id, result);
  }

  private async openAtGateway(payment: Payment, origin: string, clientIp: string) {
    try {
      const payUrl = await this.gateways[payment.provider].createSession({
        gatewayOrderId: payment.gatewayOrderId,
        amount: payment.amount,
        // VNPay chỉ nhận mô tả không dấu
        orderInfo:
          payment.provider === 'VNPAY'
            ? `Thanh toan don ${payment.orderId} BrewLite`
            : `Thanh toán đơn #${payment.orderId} BrewLite`,
        returnUrl: `${origin}/payments/${payment.id}`,
        createdAt: payment.createdAt,
        expiresAt: sessionExpiresAt(payment.createdAt),
        clientIp,
      });
      return await this.prisma.payment.update({ where: { id: payment.id }, data: { payUrl } });
    } catch (e) {
      // Không mở được phiên ở cổng: bỏ bản ghi giữ chỗ để khách bấm thanh toán lại được ngay
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      if (e instanceof GatewayError) throw new BadGatewayException(e.message);
      throw e;
    }
  }

  private findByKey(idempotencyKey: string) {
    return this.prisma.payment.findUnique({ where: { idempotencyKey }, include: { order: { select: { userId: true } } } });
  }

  /** Khóa đã dùng: cùng đơn của cùng người thì trả lại phiên cũ, khác đơn thì 409 (FR-12) */
  private async replay(payment: Payment & { order: { userId: number } }, user: AuthUser, dto: CreatePaymentDto) {
    if (payment.order.userId !== user.id || payment.orderId !== dto.orderId) {
      throw new ConflictException('Idempotency-Key này đã được dùng cho một đơn khác');
    }
    await expireStaleSessions(this.prisma, payment.orderId);
    return this.view(await this.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }), true);
  }

  /** Link sang cổng chỉ có khi phiên còn PROCESSING và chưa hết hạn; không trả khóa idempotency, dữ liệu gốc */
  private async view(payment: Payment, replayed: boolean) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: payment.orderId },
      select: { id: true, status: true, total: true },
    });
    const expiresAt = sessionExpiresAt(payment.createdAt);
    const open = payment.status === 'PROCESSING' && expiresAt.getTime() > Date.now();
    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      provider: payment.provider,
      status: payment.status,
      displayStatus: displayStatus(payment),
      gatewayOrderId: payment.gatewayOrderId,
      gatewayRef: payment.gatewayRef,
      confirmedAt: payment.confirmedAt,
      paymentUrl: open ? payment.payUrl : null,
      expiresAt,
      replayed,
      order,
    };
  }
}

/**
 * Mã đơn gửi sang cổng. Cả nhóm dùng chung tài khoản sandbox (khóa test MoMo còn dùng chung toàn Internet)
 * mà CSDL mỗi máy đều đánh số đơn từ 1, nên gửi mã ngẫu nhiên kèm thời gian thay cho số đơn.
 */
function newGatewayOrderId() {
  return `BL${Date.now().toString(36).toUpperCase()}${randomBytes(4).toString('hex').toUpperCase()}`;
}

/** Cổng chuyển khách về đúng địa chỉ web khách đang mở, miễn là nằm trong FRONTEND_URL (chống chuyển hướng lạ) */
function returnOrigin(requested?: string) {
  const allowed = (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',').map((s) => s.trim());
  return requested && allowed.includes(requested) ? requested : allowed[0];
}
