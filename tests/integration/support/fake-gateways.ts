import { GatewayHttp } from '../../../apps/api/src/payments/gateways/gateway';
import { momoCallbackSignature, momoConfig } from '../../../apps/api/src/payments/gateways/momo';
import { vnpayConfig, vnpayQueryResponseSignature, vnpaySign } from '../../../apps/api/src/payments/gateways/vnpay';

type Outcome = 'SUCCESS' | 'FAILED';

export interface GatewayPayment {
  amount: number;
  gatewayOrderId: string;
}

let txn = 15_700_000;

/**
 * Cổng giả thay API của MoMo, VNPay trong integration test (ADR-010): không gọi Internet.
 * Test đặt sẵn kết quả của từng giao dịch (khách đã trả xong hoặc bị từ chối trên trang cổng),
 * cổng giả trả lời API tra cứu với chữ ký giống hệt cổng thật.
 */
export class FakeGateways extends GatewayHttp {
  private readonly outcomes = new Map<string, { status: Outcome; amount: number; transId: string }>();
  momoCreates = 0;
  failNextCreate = false;

  /** Khách đã trả xong (hoặc bị từ chối) trên trang cổng; trả về mã giao dịch của cổng */
  resolve(payment: GatewayPayment, status: Outcome) {
    const transId = String(++txn);
    this.outcomes.set(payment.gatewayOrderId, { status, amount: payment.amount, transId });
    return transId;
  }

  postJson<T>(url: string, body: Record<string, string>): Promise<T> {
    return Promise.resolve(this.answer(url, body) as T);
  }

  private answer(url: string, body: Record<string, string>) {
    if (url.endsWith('/v2/gateway/api/create')) {
      this.momoCreates++;
      if (this.failNextCreate) {
        this.failNextCreate = false;
        return { resultCode: 99, message: 'Lỗi không xác định' };
      }
      return { resultCode: 0, message: 'Thành công.', payUrl: `https://test-payment.momo.vn/v2/gateway/pay?t=${body.orderId}` };
    }
    if (url.endsWith('/v2/gateway/api/query')) {
      const o = this.outcomes.get(body.orderId);
      if (!o) return { orderId: body.orderId, resultCode: 1000, message: 'Giao dịch đã được khởi tạo, chờ người dùng xác nhận.' };
      const resultCode = o.status === 'SUCCESS' ? 0 : 1006;
      return { orderId: body.orderId, amount: o.amount, transId: Number(o.transId), payType: 'napas', resultCode, message: '' };
    }
    // VNPay querydr
    const o = this.outcomes.get(body.vnp_TxnRef);
    if (!o) return { vnp_ResponseCode: '91', vnp_Message: 'Transaction not found' };
    const res: Record<string, string> = {
      vnp_ResponseId: 'R1',
      vnp_Command: 'querydr',
      vnp_ResponseCode: '00',
      vnp_Message: 'QueryDR success',
      vnp_TmnCode: vnpayConfig().tmnCode,
      vnp_TxnRef: body.vnp_TxnRef,
      vnp_Amount: String(o.amount * 100),
      vnp_BankCode: 'NCB',
      vnp_PayDate: '20261027154209',
      vnp_TransactionNo: o.transId,
      vnp_TransactionType: '01',
      vnp_TransactionStatus: o.status === 'SUCCESS' ? '00' : '02',
      vnp_OrderInfo: body.vnp_OrderInfo,
    };
    return { ...res, vnp_SecureHash: vnpayQueryResponseSignature(res) };
  }
}

/** Tham số VNPay gắn vào link quay về và gửi IPN, ký bằng chuỗi bí mật như VNPay */
export function vnpayCallback(payment: GatewayPayment, status: Outcome, transId = String(++txn), amount = payment.amount) {
  const params: Record<string, string> = {
    vnp_Amount: String(amount * 100),
    vnp_BankCode: 'NCB',
    vnp_BankTranNo: `VNP${transId}`,
    vnp_CardType: 'ATM',
    vnp_OrderInfo: 'Thanh toan don BrewLite',
    vnp_PayDate: '20261027154209',
    // 24: khách bấm hủy giao dịch trên trang VNPay
    vnp_ResponseCode: status === 'SUCCESS' ? '00' : '24',
    vnp_TmnCode: vnpayConfig().tmnCode,
    vnp_TransactionNo: status === 'SUCCESS' ? transId : '0',
    vnp_TransactionStatus: status === 'SUCCESS' ? '00' : '02',
    vnp_TxnRef: payment.gatewayOrderId,
  };
  return { ...params, vnp_SecureHash: vnpaySign(params) };
}

/** Tham số MoMo gắn vào link quay về (cũng là body IPN), ký HMAC-SHA256 như MoMo */
export function momoCallback(payment: GatewayPayment, status: Outcome, transId = String(++txn)) {
  const params: Record<string, string> = {
    partnerCode: momoConfig().partnerCode,
    orderId: payment.gatewayOrderId,
    requestId: payment.gatewayOrderId,
    amount: String(payment.amount),
    orderInfo: 'Thanh toán đơn BrewLite',
    orderType: 'momo_wallet',
    transId,
    resultCode: status === 'SUCCESS' ? '0' : '1006',
    message: status === 'SUCCESS' ? 'Successful.' : 'Transaction denied by user.',
    payType: 'napas',
    responseTime: String(Date.now()),
    extraData: '',
  };
  return { ...params, signature: momoCallbackSignature(params) };
}
