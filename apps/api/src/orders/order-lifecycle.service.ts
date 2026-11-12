import { ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../auth/current-user.decorator';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { LockedOrder, lockOrder } from './lock-order';
import { transitionOrder } from './order-transitions';
import { ORDER_SELECT } from './order-select';
import { COUNTER_QUEUE, COUNTER_STATUSES } from './order-status.dto';

const UNPAID_TTL_MS = 15 * 60 * 1000; // BR-08
const SWEEP_INTERVAL_MS = 60 * 1000;
const SWEEP_BATCH = 20;

/** Hủy đơn, tự hủy đơn quá hạn và nhân viên quầy cập nhật trạng thái (FR-16 – FR-20) */
@Injectable()
export class OrderLifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderLifecycleService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly loyalty: LoyaltyService,
  ) {}

  // FR-20: kiểm tra định kỳ mỗi phút (test gọi trực tiếp releaseExpiredOrders nên không bật bộ hẹn giờ)
  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      this.releaseExpiredOrders().catch((e: Error) => this.logger.error(`Tự hủy đơn lỗi: ${e.message}`));
    }, SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** FR-16: khách hủy đơn của mình khi đơn ở PENDING, PAYMENT_FAILED hoặc PAID */
  async cancelByCustomer(user: AuthUser, id: number) {
    await this.prisma.$transaction(async (tx) => {
      const order = await lockOrder(tx, id);
      if (!order || order.userId !== user.id) throw new NotFoundException('Không tìm thấy đơn hàng');
      await this.cancelLocked(tx, order);
    });
    return this.prisma.order.findUniqueOrThrow({ where: { id }, select: ORDER_SELECT });
  }

  /** FR-18: nhân viên chỉ đặt PREPARING, READY, COMPLETED, CANCELLED (BR-07); chuyển sai trả 409 */
  async changeStatus(id: number, to: OrderStatus) {
    await this.prisma.$transaction(async (tx) => {
      const order = await lockOrder(tx, id);
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      if (to === 'CANCELLED') await this.cancelLocked(tx, order);
      else await transitionOrder(tx, order.id, order.status, to);
    });
    return this.prisma.order.findUniqueOrThrow({ where: { id }, select: ORDER_SELECT });
  }

  /** FR-19: danh sách đơn cho màn hình quầy; hàng chờ cũ nhất trước (trả tiền trước pha trước), đơn đã xong mới nhất trước */
  listForStaff(statuses: OrderStatus[]) {
    const dir = statuses.every((s) => COUNTER_QUEUE.includes(s)) ? 'asc' : 'desc';
    return this.prisma.order.findMany({
      where: { status: { in: statuses } },
      orderBy: [{ createdAt: dir }, { id: dir }],
      take: 100,
      select: { ...ORDER_SELECT, user: { select: { fullName: true } } },
    });
  }

  /** FR-19: số đơn của từng nhóm trên màn hình quầy */
  async countsForStaff(): Promise<Record<OrderStatus, number>> {
    const rows = await this.prisma.order.groupBy({
      by: ['status'],
      where: { status: { in: COUNTER_STATUSES } },
      _count: { _all: true },
    });
    const counts = Object.fromEntries(COUNTER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
    for (const row of rows) counts[row.status] = row._count._all;
    return counts;
  }

  /**
   * FR-20, BR-08: đơn PENDING / PAYMENT_FAILED không cập nhật quá 15 phút thì hủy và trả nguyên liệu về kho.
   * Bỏ qua đơn đang có phiên thanh toán còn hạn (khách có thể đang trả tiền ở MoMo, VNPay).
   */
  async releaseExpiredOrders(): Promise<number> {
    const candidates = await this.prisma.order.findMany({
      where: { status: { in: ['PENDING', 'PAYMENT_FAILED'] }, updatedAt: { lt: new Date(Date.now() - UNPAID_TTL_MS) } },
      orderBy: { id: 'asc' },
      take: SWEEP_BATCH,
      select: { id: true },
    });
    let cancelled = 0;
    for (const { id } of candidates) {
      const done = await this.prisma.$transaction(async (tx) => {
        const order = await lockOrder(tx, id);
        if (!order || (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED')) return false;
        await this.payments.expireStaleSessions(tx, id);
        if (await this.hasActivePayment(tx, id)) return false;
        await this.cancelLocked(tx, order);
        return true;
      });
      if (done) cancelled++;
    }
    if (cancelled > 0) this.logger.log(`Tự hủy ${cancelled} đơn chưa thanh toán quá 15 phút`);
    return cancelled;
  }

  /** Đơn đã khóa: chặn hủy khi còn phiên thanh toán, đổi sang CANCELLED, trả nguyên liệu, thu hồi điểm nếu đã PAID */
  private async cancelLocked(tx: Prisma.TransactionClient, order: LockedOrder) {
    await this.payments.expireStaleSessions(tx, order.id);
    if (await this.hasActivePayment(tx, order.id)) {
      throw new ConflictException('Đơn đang chờ cổng thanh toán báo kết quả, chưa thể hủy');
    }
    await transitionOrder(tx, order.id, order.status, 'CANCELLED');

    // Trả lại đúng lượng nguyên liệu đã trừ lúc đặt, theo ingredientId tăng dần như lúc trừ để tránh deadlock (ADR-006)
    const used = await tx.orderIngredient.findMany({ where: { orderId: order.id }, orderBy: { ingredientId: 'asc' } });
    for (const u of used) {
      await tx.ingredient.update({
        where: { id: u.ingredientId },
        data: { stock: { increment: u.amount }, version: { increment: 1 } },
      });
    }
    if (order.status === 'PAID') await this.loyalty.revoke(tx, order.id);
  }

  private async hasActivePayment(tx: Prisma.TransactionClient, orderId: number) {
    return (await tx.payment.count({ where: { orderId, status: 'PROCESSING' } })) > 0;
  }
}
