import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../apps/api/src/prisma/prisma.service';
import { FakeGateways, momoCallback, vnpayCallback } from './fake-gateways';
import { createProduct, postOrder, uniqueKey } from './fixtures';

export interface PaymentBody {
  id: number;
  amount: number;
  provider: 'MOMO' | 'VNPAY';
  gatewayOrderId: string;
}

export function postPayment(app: INestApplication, token: string, orderId: number, key = uniqueKey('tt'), provider = 'VNPAY') {
  return request(app.getHttpServer())
    .post('/payments')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', key)
    .send({ orderId, provider });
}

/** Tham số có chữ ký mà cổng gắn vào link khi chuyển khách về BrewLite */
export function signedCallback(payment: PaymentBody, status: 'SUCCESS' | 'FAILED') {
  return payment.provider === 'MOMO' ? momoCallback(payment, status) : vnpayCallback(payment, status);
}

/**
 * Khách trả xong (hoặc bấm hủy) trên trang cổng, cổng chuyển khách về BrewLite và web gửi kết quả lên
 * POST /payments/:id/return; API kiểm chữ ký rồi tra cứu lại cổng (cổng giả) trước khi chốt.
 */
export function payAtGateway(
  app: INestApplication,
  gateways: FakeGateways,
  token: string,
  payment: PaymentBody,
  status: 'SUCCESS' | 'FAILED',
) {
  gateways.resolve(payment, status);
  return request(app.getHttpServer())
    .post(`/payments/${payment.id}/return`)
    .set('Authorization', `Bearer ${token}`)
    .send({ params: signedCallback(payment, status) });
}

/** VNPay gọi IPN (server gọi server) với kết quả có chữ ký */
export function vnpayIpn(app: INestApplication, params: Record<string, string>) {
  return request(app.getHttpServer()).get('/payments/vnpay/ipn').query(params);
}

/** Tạo một đơn PENDING (món riêng, đủ hàng) cho khách */
export async function createPendingOrder(app: INestApplication, prisma: PrismaService, token: string, price = 30000, qty = 2) {
  const product = await createProduct(prisma, { stock: 50, price });
  const res = await postOrder(app, token, { items: [{ productId: product.id, size: 'S', qty }] }).expect(201);
  return res.body as { id: number; total: number; status: string };
}
