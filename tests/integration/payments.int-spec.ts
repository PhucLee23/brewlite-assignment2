import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { vnpaySign } from '../../apps/api/src/payments/gateways/vnpay';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { createTestApp } from './support/app';
import { FakeGateways, momoCallback, vnpayCallback } from './support/fake-gateways';
import { createProduct, postOrder, uniqueKey } from './support/fixtures';
import { createPendingOrder, payAtGateway, postPayment, signedCallback, vnpayIpn } from './support/payments';
import { registerCustomer } from './support/users';

describe('Thanh toán qua cổng MoMo, VNPay', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let gateways: FakeGateways;
  let token: string;

  const getPayment = (id: number, t = token) =>
    request(app.getHttpServer()).get(`/payments/${id}`).set('Authorization', `Bearer ${t}`);
  const orderStatus = async (id: number) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;

  beforeAll(async () => {
    ({ app, prisma, gateways } = await createTestApp());
    ({ token } = await registerCustomer(app));
  });

  afterAll(async () => {
    await app.close();
  });

  // API-T06: mở phiên, cổng xác nhận SUCCESS/FAILED, thanh toán lại, hết hạn phiên (FR-11, NFR-02)
  describe('API-T06 luồng thanh toán', () => {
    it('VNPay: trả link sang VNPay có chữ ký đúng, hạn 15 phút, quay về đúng trang chờ; đơn vẫn PENDING', async () => {
      const order = await createPendingOrder(app, prisma, token);
      const res = await postPayment(app, token, order.id).expect(201);
      expect(res.body).toMatchObject({ orderId: order.id, amount: order.total, provider: 'VNPAY', status: 'PROCESSING', replayed: false });
      expect(res.body.gatewayOrderId).toMatch(/^BL[0-9A-Z]+$/);

      const url = new URL(res.body.paymentUrl);
      expect(url.origin).toBe('https://sandbox.vnpayment.vn');
      const link = Object.fromEntries(url.searchParams);
      expect(link).toMatchObject({
        vnp_Amount: String(order.total * 100),
        vnp_TxnRef: res.body.gatewayOrderId,
        vnp_ReturnUrl: `http://localhost:3000/payments/${res.body.id}`,
      });
      expect(vnpaySign(link)).toBe(link.vnp_SecureHash);
      expect(vnpaySign({ ...link, vnp_Amount: '100' })).not.toBe(link.vnp_SecureHash);
      expect(new Date(res.body.expiresAt).getTime() - Date.now()).toBeGreaterThan(14 * 60 * 1000);
      expect(await orderStatus(order.id)).toBe('PENDING');
    });

    it('MoMo: API gọi MoMo tạo giao dịch và trả payUrl; MoMo lỗi thì 502 và mở lại được ngay', async () => {
      const order = await createPendingOrder(app, prisma, token);
      gateways.failNextCreate = true;
      const failed = await postPayment(app, token, order.id, uniqueKey(), 'MOMO').expect(502);
      expect(failed.body.message).toMatch(/MoMo từ chối tạo giao dịch/);

      const res = await postPayment(app, token, order.id, uniqueKey(), 'MOMO').expect(201);
      expect(res.body.paymentUrl).toMatch(/^https:\/\/test-payment\.momo\.vn\//);
      expect(await prisma.payment.count({ where: { orderId: order.id, status: 'PROCESSING' } })).toBe(1);
    });

    it('cổng xác nhận SUCCESS: thanh toán SUCCESS, đơn PAID, lưu mã giao dịch, ngân hàng và dữ liệu gốc', async () => {
      const order = await createPendingOrder(app, prisma, token);
      const payment = (await postPayment(app, token, order.id).expect(201)).body;
      const back = await payAtGateway(app, gateways, token, payment, 'SUCCESS').expect(200);
      expect(back.body).toMatchObject({ status: 'SUCCESS', order: { status: 'PAID' }, paymentUrl: null });

      const saved = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(saved).toMatchObject({ gatewayRef: expect.any(String), bankCode: 'NCB', confirmedAt: expect.any(Date) });
      expect(saved.gatewayResult).toMatchObject({ vnp_TxnRef: payment.gatewayOrderId });
    });

    it('khách trả bằng app trên điện thoại: trang chờ hỏi GET /payments/:id, API tự tra cứu cổng và thấy kết quả', async () => {
      const order = await createPendingOrder(app, prisma, token);
      const payment = (await postPayment(app, token, order.id, uniqueKey(), 'MOMO').expect(201)).body;
      gateways.resolve(payment, 'SUCCESS');
      const polled = await getPayment(payment.id).expect(200);
      expect(polled.body).toMatchObject({ status: 'SUCCESS', order: { status: 'PAID' } });
      expect(polled.body.confirmedAt).toEqual(expect.any(String));
    });

    it('khách bấm hủy trên cổng: đơn PAYMENT_FAILED; thanh toán lại bằng khóa mới thành công, vẫn một đơn', async () => {
      const order = await createPendingOrder(app, prisma, token);
      const first = (await postPayment(app, token, order.id).expect(201)).body;
      await payAtGateway(app, gateways, token, first, 'FAILED').expect(200);
      expect(await orderStatus(order.id)).toBe('PAYMENT_FAILED');

      const retry = (await postPayment(app, token, order.id, uniqueKey(), 'MOMO').expect(201)).body;
      expect(retry.id).not.toBe(first.id);
      expect(await orderStatus(order.id)).toBe('PENDING');
      await payAtGateway(app, gateways, token, retry, 'SUCCESS').expect(200);
      expect(await orderStatus(order.id)).toBe('PAID');
      expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(2);
    });

    it('phiên quá 15 phút chưa có kết quả bị đánh FAILED (hiển thị EXPIRED) và mở được phiên mới', async () => {
      const order = await createPendingOrder(app, prisma, token);
      const old = (await postPayment(app, token, order.id).expect(201)).body;
      await prisma.payment.update({ where: { id: old.id }, data: { createdAt: new Date(Date.now() - 16 * 60 * 1000) } });

      const polled = await getPayment(old.id).expect(200);
      expect(polled.body).toMatchObject({ status: 'FAILED', displayStatus: 'EXPIRED', paymentUrl: null, order: { status: 'PENDING' } });
      const fresh = (await postPayment(app, token, order.id).expect(201)).body;
      expect(fresh).toMatchObject({ status: 'PROCESSING', replayed: false });
      expect(fresh.id).not.toBe(old.id);
    });

    it('401 khi thiếu JWT; 400 khi thiếu Idempotency-Key hoặc sai cổng; 404 với đơn người khác', async () => {
      const order = await createPendingOrder(app, prisma, token);
      await request(app.getHttpServer()).post('/payments').send({ orderId: order.id, provider: 'VNPAY' }).expect(401);
      const missing = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order.id, provider: 'VNPAY' })
        .expect(400);
      expect(missing.body.message).toBe('Thiếu header Idempotency-Key');
      const wrong = await postPayment(app, token, order.id, uniqueKey(), 'CASH').expect(400);
      expect(wrong.body.message).toEqual(['Cổng thanh toán phải là MOMO hoặc VNPAY']);

      const stranger = await registerCustomer(app);
      await postPayment(app, stranger.token, order.id).expect(404);
    });

    it('NFR-02: POST /orders + POST /payments ≤ 1 giây; xác nhận kết quả ≤ 500 ms', async () => {
      const product = await createProduct(prisma, { stock: 10 });
      const started = Date.now();
      const order = await postOrder(app, token, { items: [{ productId: product.id, size: 'M', qty: 1 }] }).expect(201);
      const payment = (await postPayment(app, token, order.body.id).expect(201)).body;
      expect(Date.now() - started).toBeLessThanOrEqual(1000);
      const confirmStarted = Date.now();
      await payAtGateway(app, gateways, token, payment, 'SUCCESS').expect(200);
      expect(Date.now() - confirmStarted).toBeLessThanOrEqual(500);
    });
  });

  // API-T07: idempotency của POST /payments và kết quả từ cổng (FR-12, NFR-06)
  describe('API-T07 thanh toán idempotent', () => {
    it('gửi lại cùng khóa trả đúng phiên cũ với replayed: true, không tạo bản ghi mới', async () => {
      const order = await createPendingOrder(app, prisma, token);
      const key = uniqueKey('lap');
      const first = (await postPayment(app, token, order.id, key).expect(201)).body;
      const again = (await postPayment(app, token, order.id, key).expect(201)).body;
      expect(again).toMatchObject({ id: first.id, paymentUrl: first.paymentUrl, replayed: true });
      expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
    });

    it('5 yêu cầu cùng khóa đến đồng thời chỉ tạo một bản ghi thanh toán', async () => {
      const order = await createPendingOrder(app, prisma, token);
      const key = uniqueKey('dong-thoi');
      const results = await Promise.all(Array.from({ length: 5 }, () => postPayment(app, token, order.id, key)));
      expect(results.every((r) => r.status === 201)).toBe(true);
      expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
      expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
    });

    it('dùng lại khóa cho đơn khác trả 409; khóa khác khi đơn đang có phiên còn hạn nhận lại phiên đó', async () => {
      const a = await createPendingOrder(app, prisma, token);
      const b = await createPendingOrder(app, prisma, token);
      const key = uniqueKey('chung');
      const first = (await postPayment(app, token, a.id, key).expect(201)).body;
      const conflict = await postPayment(app, token, b.id, key).expect(409);
      expect(conflict.body.message).toBe('Idempotency-Key này đã được dùng cho một đơn khác');

      const other = (await postPayment(app, token, a.id, uniqueKey('khac')).expect(201)).body;
      expect(other).toMatchObject({ id: first.id, replayed: true });
      const switched = await postPayment(app, token, a.id, uniqueKey('doi-cong'), 'MOMO').expect(409);
      expect(switched.body.message).toMatch(/Đơn đang có phiên thanh toán VNPay chưa kết thúc/);
    });

    it('link quay về, IPN và tra cứu cùng báo SUCCESS chỉ được xử lý một lần', async () => {
      const customer = await registerCustomer(app);
      const order = await createPendingOrder(app, prisma, customer.token, 45000, 1);
      const payment = (await postPayment(app, customer.token, order.id).expect(201)).body;
      const transId = gateways.resolve(payment, 'SUCCESS');
      const params = vnpayCallback(payment, 'SUCCESS', transId);

      const first = await vnpayIpn(app, params).expect(200);
      expect(first.body).toEqual({ RspCode: '00', Message: 'Confirm Success' });
      const again = await vnpayIpn(app, params).expect(200);
      expect(again.body).toEqual({ RspCode: '02', Message: 'Order already confirmed' });
      await request(app.getHttpServer())
        .post(`/payments/${payment.id}/return`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ params })
        .expect(200);
      await getPayment(payment.id, customer.token).expect(200);

      expect(await orderStatus(order.id)).toBe('PAID');
    });
  });

  // API-T15: kết quả không có chữ ký hợp lệ của cổng bị từ chối, không đổi trạng thái (FR-11, BR-07, NFR-04)
  describe('API-T15 bảo vệ kết quả thanh toán', () => {
    it('link quay về sai chữ ký trả 400; IPN VNPay sai chữ ký trả RspCode 97; IPN MoMo sai chữ ký trả 400', async () => {
      const order = await createPendingOrder(app, prisma, token);
      const payment = (await postPayment(app, token, order.id).expect(201)).body;
      const forged = { ...signedCallback(payment, 'SUCCESS'), vnp_Amount: '100' };

      const back = await request(app.getHttpServer())
        .post(`/payments/${payment.id}/return`)
        .set('Authorization', `Bearer ${token}`)
        .send({ params: forged })
        .expect(400);
      expect(back.body.message).toBe('Chữ ký kết quả thanh toán không hợp lệ');
      expect((await vnpayIpn(app, forged).expect(200)).body).toEqual({ RspCode: '97', Message: 'Invalid signature' });

      const momo = { ...momoCallback(payment, 'SUCCESS'), signature: 'a'.repeat(64) };
      await request(app.getHttpServer()).post('/payments/momo/ipn').send(momo).expect(400);

      expect(await orderStatus(order.id)).toBe('PENDING');
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PROCESSING');
    });

    it('chữ ký đúng nhưng số tiền khác số tiền của phiên: IPN trả RspCode 04, không đổi trạng thái', async () => {
      const order = await createPendingOrder(app, prisma, token);
      const payment = (await postPayment(app, token, order.id).expect(201)).body;
      const res = await vnpayIpn(app, vnpayCallback(payment, 'SUCCESS', undefined, payment.amount - 1000)).expect(200);
      expect(res.body).toEqual({ RspCode: '04', Message: 'invalid amount' });
      expect(await orderStatus(order.id)).toBe('PENDING');
    });

    it('kết quả của giao dịch khác hoặc của người khác không dùng được', async () => {
      const a = await createPendingOrder(app, prisma, token);
      const b = await createPendingOrder(app, prisma, token);
      const pa = (await postPayment(app, token, a.id).expect(201)).body;
      const pb = (await postPayment(app, token, b.id).expect(201)).body;
      const res = await request(app.getHttpServer())
        .post(`/payments/${pa.id}/return`)
        .set('Authorization', `Bearer ${token}`)
        .send({ params: vnpayCallback(pb, 'SUCCESS') })
        .expect(400);
      expect(res.body.message).toBe('Kết quả không thuộc giao dịch này');

      const stranger = await registerCustomer(app);
      await payAtGateway(app, gateways, stranger.token, pa, 'SUCCESS').expect(404);
      expect(await orderStatus(a.id)).toBe('PENDING');
    });
  });
});
