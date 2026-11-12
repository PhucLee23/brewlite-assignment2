// Mở phiên ở cổng rồi chuyển khách sang trang thanh toán của MoMo hoặc VNPay (FR-11, UC-06 bước 8–9).
// Trả xong, cổng chuyển khách về /payments/:id kèm kết quả có chữ ký.
import { api } from './api';
import { newPaymentKey } from './idempotency';
import type { PaymentSession } from './types';

export async function startPayment(orderId: number, provider: 'MOMO' | 'VNPAY') {
  const session = await api<PaymentSession>('/payments', {
    method: 'POST',
    auth: true,
    idempotencyKey: newPaymentKey(),
    // Cổng chuyển khách về đúng địa chỉ đang mở (localhost hoặc IP mạng LAN khi dùng điện thoại)
    body: { orderId, provider, returnOrigin: window.location.origin },
  });
  window.location.assign(session.paymentUrl ?? `/payments/${session.id}`);
}
