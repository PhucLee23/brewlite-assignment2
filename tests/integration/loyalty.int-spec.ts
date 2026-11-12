import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { createTestApp } from './support/app';
import { FakeGateways } from './support/fake-gateways';
import { createPendingOrder, payAtGateway, postPayment } from './support/payments';
import { registerCustomer } from './support/users';

// API-T08: giao dịch điểm EARN khi đơn PAID (FR-13, BR-05)
describe('API-T08 điểm thưởng', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let gateways: FakeGateways;

  beforeAll(async () => {
    ({ app, prisma, gateways } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('đơn PAID cộng 1 điểm / 1.000đ, ghi một giao dịch EARN; số dư bằng tổng giao dịch', async () => {
    const { token, user } = await registerCustomer(app);
    const order = await createPendingOrder(app, prisma, token, 37500, 2); // tổng 75.000đ
    const payment = (await postPayment(app, token, order.id).expect(201)).body;
    await payAtGateway(app, gateways, token, payment, 'SUCCESS').expect(200);

    const tx = await prisma.loyaltyTransaction.findMany({ where: { orderId: order.id } });
    expect(tx).toEqual([expect.objectContaining({ userId: user.id, type: 'EARN', points: 75 })]);

    const me = await request(app.getHttpServer()).get('/loyalty/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body.balance).toBe(75);
    expect(me.body.transactions.reduce((s: number, t: { points: number }) => s + t.points, 0)).toBe(me.body.balance);

    const detail = await request(app.getHttpServer()).get(`/orders/${order.id}`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(detail.body.loyalty).toEqual([{ type: 'EARN', points: 75 }]);
  });

  it('thanh toán thất bại không cộng điểm', async () => {
    const { token, user } = await registerCustomer(app);
    const order = await createPendingOrder(app, prisma, token);
    const payment = (await postPayment(app, token, order.id).expect(201)).body;
    await payAtGateway(app, gateways, token, payment, 'FAILED').expect(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).loyaltyPoints).toBe(0);
    expect(await prisma.loyaltyTransaction.count({ where: { orderId: order.id } })).toBe(0);
  });
});
