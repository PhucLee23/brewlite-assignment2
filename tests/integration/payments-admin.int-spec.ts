import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { transitionOrder } from '../../apps/api/src/orders/order-transitions';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { createTestApp } from './support/app';
import { FakeGateways, vnpayCallback } from './support/fake-gateways';
import { createPendingOrder, payAtGateway, postPayment, vnpayIpn } from './support/payments';
import { loginStaff, registerCustomer } from './support/users';

// API-T16: GET /payments – chỉ nhân viên, lọc theo trạng thái, tổng tiền chỉ tính SUCCESS của đơn chưa hủy; biên lai (FR-26)
describe('API-T16 danh sách giao dịch và biên lai', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let gateways: FakeGateways;
  let staffToken: string;

  const list = (token: string, query = '') =>
    request(app.getHttpServer()).get(`/payments${query}`).set('Authorization', `Bearer ${token}`);
  const ids = async (status: string) =>
    (await list(staffToken, `?status=${status}`).expect(200)).body.payments.map((p: { id: number }) => p.id);

  beforeAll(async () => {
    ({ app, prisma, gateways } = await createTestApp());
    staffToken = await loginStaff(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 khi chưa đăng nhập, 403 với khách hàng', async () => {
    const { token } = await registerCustomer(app);
    await request(app.getHttpServer()).get('/payments').expect(401);
    const res = await list(token).expect(403);
    expect(res.body.message).toBe('Bạn không có quyền thực hiện thao tác này');
  });

  it('lọc SUCCESS / FAILED / PROCESSING / EXPIRED; tổng đã nhận chỉ cộng SUCCESS; có cổng và mã giao dịch', async () => {
    const { token } = await registerCustomer(app, 'Khách Doanh Thu');
    const before = (await list(staffToken).expect(200)).body.received;

    const paid = await createPendingOrder(app, prisma, token, 20000, 1);
    const ok = (await postPayment(app, token, paid.id, undefined, 'MOMO').expect(201)).body;
    await payAtGateway(app, gateways, token, ok, 'SUCCESS').expect(200);

    const declined = await createPendingOrder(app, prisma, token, 30000, 1);
    const failed = (await postPayment(app, token, declined.id).expect(201)).body;
    await payAtGateway(app, gateways, token, failed, 'FAILED').expect(200);

    const waiting = await createPendingOrder(app, prisma, token, 40000, 1);
    const processing = (await postPayment(app, token, waiting.id).expect(201)).body;

    const stale = await createPendingOrder(app, prisma, token, 50000, 1);
    const expired = (await postPayment(app, token, stale.id).expect(201)).body;
    await prisma.payment.update({ where: { id: expired.id }, data: { createdAt: new Date(Date.now() - 20 * 60 * 1000) } });

    const all = (await list(staffToken).expect(200)).body;
    expect(all.received - before).toBe(20000);
    expect(all.payments.length).toBeLessThanOrEqual(100);
    expect(all.payments.find((p: { id: number }) => p.id === ok.id)).toMatchObject({
      provider: 'MOMO',
      displayStatus: 'SUCCESS',
      gatewayOrderId: ok.gatewayOrderId,
      gatewayRef: expect.any(String),
      payType: 'napas',
      customer: { fullName: 'Khách Doanh Thu' },
    });
    expect(all.payments[0]).not.toHaveProperty('idempotencyKey');

    expect(await ids('SUCCESS')).toContain(ok.id);
    expect(await ids('FAILED')).toEqual(expect.arrayContaining([failed.id]));
    expect(await ids('FAILED')).not.toContain(expired.id);
    expect(await ids('PROCESSING')).toContain(processing.id);
    expect(await ids('EXPIRED')).toContain(expired.id);
    await list(staffToken, '?status=ABC').expect(400);
  });

  it('đơn đã thanh toán rồi bị hủy: không tính vào tiền đã nhận, hiện là REFUND_DUE', async () => {
    const { token } = await registerCustomer(app, 'Khách Hủy Đơn');
    const before = (await list(staffToken).expect(200)).body;

    const order = await createPendingOrder(app, prisma, token, 25000, 1);
    const payment = (await postPayment(app, token, order.id).expect(201)).body;
    await payAtGateway(app, gateways, token, payment, 'SUCCESS').expect(200);
    await transitionOrder(prisma, order.id, 'PAID', 'CANCELLED');

    const all = (await list(staffToken).expect(200)).body;
    expect(all.received).toBe(before.received);
    expect(all.refundDue.count - before.refundDue.count).toBe(1);
    expect(all.refundDue.amount - before.refundDue.amount).toBe(25000);
    expect(all.payments.find((p: { id: number }) => p.id === payment.id)).toMatchObject({
      status: 'SUCCESS',
      displayStatus: 'REFUND_DUE',
    });
    expect(await ids('REFUND_DUE')).toContain(payment.id);
    expect(await ids('SUCCESS')).not.toContain(payment.id);
  });

  it('cổng báo đã trừ tiền sau khi phiên hết hạn và đơn đã hủy: vẫn ghi nhận, vào mục cần hoàn tiền', async () => {
    const { token } = await registerCustomer(app);
    const order = await createPendingOrder(app, prisma, token, 15000, 1);
    const payment = (await postPayment(app, token, order.id).expect(201)).body;
    await prisma.payment.update({ where: { id: payment.id }, data: { createdAt: new Date(Date.now() - 20 * 60 * 1000) } });
    await list(staffToken).expect(200);
    await transitionOrder(prisma, order.id, 'PENDING', 'CANCELLED');

    const res = await vnpayIpn(app, vnpayCallback(payment, 'SUCCESS')).expect(200);
    expect(res.body.RspCode).toBe('00');
    expect(await ids('REFUND_DUE')).toContain(payment.id);
  });

  it('biên lai: khách xem của mình, nhân viên xem mọi giao dịch, người khác 404; có dữ liệu gốc của cổng', async () => {
    const owner = await registerCustomer(app, 'Khách Biên Lai');
    const order = await createPendingOrder(app, prisma, owner.token, 32000, 1);
    const payment = (await postPayment(app, owner.token, order.id).expect(201)).body;
    await payAtGateway(app, gateways, owner.token, payment, 'SUCCESS').expect(200);

    const receipt = (t: string) =>
      request(app.getHttpServer()).get(`/payments/${payment.id}/receipt`).set('Authorization', `Bearer ${t}`);
    const mine = (await receipt(owner.token).expect(200)).body;
    expect(mine).toMatchObject({
      payment: { provider: 'VNPAY', displayStatus: 'SUCCESS', bankCode: 'NCB', gatewayOrderId: payment.gatewayOrderId },
      order: { id: order.id, total: 32000 },
      customer: { fullName: 'Khách Biên Lai' },
      gatewayResult: { vnp_TxnRef: payment.gatewayOrderId },
    });
    expect(mine.payment).not.toHaveProperty('idempotencyKey');
    await receipt(staffToken).expect(200);
    const stranger = await registerCustomer(app);
    await receipt(stranger.token).expect(404);
  });
});
