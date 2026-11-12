import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OrderLifecycleService } from '../../apps/api/src/orders/order-lifecycle.service';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { createTestApp } from './support/app';
import { FakeGateways } from './support/fake-gateways';
import { createProduct, postOrder, stockOf as ingredientStock } from './support/fixtures';
import { payAtGateway, postPayment } from './support/payments';
import { loginStaff, registerCustomer } from './support/users';

describe('Vòng đời đơn: hủy, nhân viên cập nhật, tự hủy', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let gateways: FakeGateways;
  let token: string;
  let staffToken: string;

  const stockOf = (productId: number) => ingredientStock(prisma, productId);
  const statusOf = async (id: number) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;
  const cancel = (id: number, t = token) =>
    request(app.getHttpServer()).post(`/orders/${id}/cancel`).set('Authorization', `Bearer ${t}`);
  const setStatus = (id: number, status: string, t = staffToken) =>
    request(app.getHttpServer()).patch(`/orders/${id}/status`).set('Authorization', `Bearer ${t}`).send({ status });

  /** Đơn 2 ly của một món riêng (tồn kho ban đầu 10) */
  async function newOrder(t = token) {
    const product = await createProduct(prisma, { stock: 10, price: 25000 });
    const order = (await postOrder(app, t, { items: [{ productId: product.id, size: 'S', qty: 2 }] }).expect(201)).body;
    return { order, product };
  }

  async function paidOrder(t = token) {
    const { order, product } = await newOrder(t);
    const payment = (await postPayment(app, t, order.id).expect(201)).body;
    await payAtGateway(app, gateways, t, payment, 'SUCCESS').expect(200);
    return { order, product };
  }

  beforeAll(async () => {
    ({ app, prisma, gateways } = await createTestApp());
    ({ token } = await registerCustomer(app));
    staffToken = await loginStaff(app);
  });

  afterAll(async () => {
    await app.close();
  });

  // API-T10: hủy đơn trả kho, chặn hủy khi đang thanh toán (FR-16)
  describe('API-T10 hủy đơn', () => {
    it('hủy đơn PENDING: CANCELLED, trả nguyên liệu về kho', async () => {
      const { order, product } = await newOrder();
      expect(await stockOf(product.id)).toBe(8);
      const res = await cancel(order.id).expect(200);
      expect(res.body.status).toBe('CANCELLED');
      expect(await stockOf(product.id)).toBe(10);
    });

    it('đơn đang có phiên thanh toán còn hạn không hủy được (409); phiên hết hạn thì hủy được', async () => {
      const { order } = await newOrder();
      const payment = (await postPayment(app, token, order.id).expect(201)).body;
      const res = await cancel(order.id).expect(409);
      expect(res.body.message).toBe('Đơn đang chờ cổng thanh toán báo kết quả, chưa thể hủy');

      await prisma.payment.update({ where: { id: payment.id }, data: { createdAt: new Date(Date.now() - 16 * 60 * 1000) } });
      await cancel(order.id).expect(200);
    });

    it('đơn PREPARING trả 409; đơn của người khác trả 404', async () => {
      const { order } = await paidOrder();
      await setStatus(order.id, 'PREPARING').expect(200);
      await cancel(order.id).expect(409);

      const other = await registerCustomer(app);
      const mine = await newOrder();
      await cancel(mine.order.id, other.token).expect(404);
    });

    // API-T08 (thu hồi): hủy đơn đã PAID ghi REVOKE đúng số điểm đã cộng
    it('API-T08 hủy đơn PAID: trả nguyên liệu và thu hồi đúng số điểm đã cộng', async () => {
      const customer = await registerCustomer(app);
      const { order, product } = await paidOrder(customer.token);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: customer.user.id } })).loyaltyPoints).toBe(50);

      await cancel(order.id, customer.token).expect(200);
      expect(await stockOf(product.id)).toBe(10);
      const tx = await prisma.loyaltyTransaction.findMany({ where: { orderId: order.id }, orderBy: { id: 'asc' } });
      expect(tx.map((t) => [t.type, t.points])).toEqual([
        ['EARN', 50],
        ['REVOKE', -50],
      ]);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: customer.user.id } })).loyaltyPoints).toBe(0);
    });
  });

  // API-T11: nhân viên đổi trạng thái (FR-17, FR-18, FR-19)
  describe('API-T11 nhân viên cập nhật trạng thái', () => {
    it('PAID → PREPARING → READY → COMPLETED', async () => {
      const { order } = await paidOrder();
      for (const status of ['PREPARING', 'READY', 'COMPLETED']) {
        expect((await setStatus(order.id, status).expect(200)).body.status).toBe(status);
      }
    });

    it('khách gọi trả 403; đặt PAID trả 400; chuyển sai sơ đồ trả 409', async () => {
      const { order } = await paidOrder();
      await setStatus(order.id, 'PREPARING', token).expect(403);
      const paid = await setStatus(order.id, 'PAID').expect(400);
      expect(paid.body.message).toEqual(expect.arrayContaining([expect.stringContaining('PREPARING, READY, COMPLETED')]));
      await setStatus(order.id, 'READY').expect(409);

      const { order: pending } = await newOrder();
      await setStatus(pending.id, 'PREPARING').expect(409);
    });

    it('hai yêu cầu đổi trạng thái cùng lúc: chỉ một thành công', async () => {
      const { order } = await paidOrder();
      const results = await Promise.all([setStatus(order.id, 'PREPARING'), setStatus(order.id, 'PREPARING')]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(await statusOf(order.id)).toBe('PREPARING');
    });

    it('GET /orders?status= cho nhân viên: đơn cần pha, cũ nhất trước; khách gọi trả 403', async () => {
      const a = await paidOrder();
      const b = await paidOrder();
      const res = await request(app.getHttpServer()).get('/orders').set('Authorization', `Bearer ${staffToken}`).expect(200);
      const ids = res.body.map((o: { id: number }) => o.id);
      expect(ids.indexOf(a.order.id)).toBeLessThan(ids.indexOf(b.order.id));
      expect(res.body.every((o: { status: string }) => ['PAID', 'PREPARING', 'READY'].includes(o.status))).toBe(true);
      expect(res.body[0].user).toEqual({ fullName: expect.any(String) });

      const ready = await request(app.getHttpServer())
        .get('/orders?status=READY')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
      expect(ready.body.every((o: { status: string }) => o.status === 'READY')).toBe(true);
      await request(app.getHttpServer()).get('/orders').set('Authorization', `Bearer ${token}`).expect(403);
    });

    it('nhân viên hủy đơn PAID: trả nguyên liệu, thu hồi điểm; đơn đã giao, đã hủy xếp mới nhất trước; số đơn mỗi nhóm', async () => {
      const counts = async () =>
        (await request(app.getHttpServer()).get('/orders/counts').set('Authorization', `Bearer ${staffToken}`).expect(200)).body;
      const list = async (status: string) =>
        (await request(app.getHttpServer()).get(`/orders?status=${status}`).set('Authorization', `Bearer ${staffToken}`).expect(200))
          .body.map((o: { id: number }) => o.id);
      const before = await counts();

      const customer = await registerCustomer(app);
      const first = await paidOrder(customer.token);
      const second = await paidOrder(customer.token);
      await setStatus(first.order.id, 'CANCELLED').expect(200);
      await setStatus(second.order.id, 'CANCELLED').expect(200);
      expect(await stockOf(first.product.id)).toBe(10);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: customer.user.id } })).loyaltyPoints).toBe(0);

      const after = await counts();
      expect(Object.keys(after).sort()).toEqual(['CANCELLED', 'COMPLETED', 'PAID', 'PREPARING', 'READY']);
      expect(after.CANCELLED - before.CANCELLED).toBe(2);
      const cancelled = await list('CANCELLED');
      expect(cancelled.indexOf(second.order.id)).toBeLessThan(cancelled.indexOf(first.order.id));

      // Đã bắt đầu pha thì nhân viên cũng không hủy được
      const { order } = await paidOrder();
      await setStatus(order.id, 'PREPARING').expect(200);
      await setStatus(order.id, 'CANCELLED').expect(409);
      await request(app.getHttpServer()).get('/orders/counts').set('Authorization', `Bearer ${token}`).expect(403);
    });
  });

  // API-T12: tự hủy đơn chưa thanh toán quá 15 phút, trả kho (FR-20, BR-08)
  describe('API-T12 tự hủy đơn quá hạn', () => {
    const age = (id: number, minutes: number) =>
      prisma.$executeRaw`UPDATE "Order" SET "updatedAt" = now() - make_interval(mins => ${minutes}::int) WHERE id = ${id}`;

    it('đơn PENDING và PAYMENT_FAILED quá 15 phút bị hủy, nguyên liệu về kho; đơn mới chưa quá hạn giữ nguyên', async () => {
      const stale = await newOrder();
      const failed = await newOrder();
      const failedPayment = (await postPayment(app, token, failed.order.id).expect(201)).body;
      await payAtGateway(app, gateways, token, failedPayment, 'FAILED').expect(200);
      const fresh = await newOrder();
      await age(stale.order.id, 16);
      await age(failed.order.id, 16);

      await app.get(OrderLifecycleService).releaseExpiredOrders();
      expect(await statusOf(stale.order.id)).toBe('CANCELLED');
      expect(await statusOf(failed.order.id)).toBe('CANCELLED');
      expect(await stockOf(stale.product.id)).toBe(10);
      expect(await stockOf(failed.product.id)).toBe(10);
      expect(await statusOf(fresh.order.id)).toBe('PENDING');
    });

    it('bỏ qua đơn đang có phiên thanh toán còn hạn', async () => {
      const { order } = await newOrder();
      await postPayment(app, token, order.id).expect(201);
      await age(order.id, 16);
      await app.get(OrderLifecycleService).releaseExpiredOrders();
      expect(await statusOf(order.id)).toBe('PENDING');
    });

    it('việc kiểm tra cũng chạy khi có đơn mới (POST /orders)', async () => {
      const { order } = await newOrder();
      await age(order.id, 20);
      await newOrder();
      expect(await statusOf(order.id)).toBe('CANCELLED');
    });
  });
});
