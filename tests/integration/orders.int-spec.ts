import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { createTestApp } from './support/app';
import { createProduct, postOrder, stockOf, uniqueKey } from './support/fixtures';
import { registerCustomer } from './support/users';

describe('Đặt đơn', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ token } = await registerCustomer(app));
  });

  afterAll(async () => {
    await app.close();
  });

  // API-T03: validate, server tính giá, trừ nguyên liệu, 409 khi thiếu hàng (FR-08, BR-01 – BR-04, BR-09, NFR-04)
  describe('API-T03 tạo đơn', () => {
    it('401 khi không có JWT', async () => {
      await request(app.getHttpServer()).post('/orders').send({ items: [] }).expect(401);
    });

    it('tính giá từ CSDL theo size, topping, mã giảm giá; trừ nguyên liệu; đơn PENDING', async () => {
      const product = await createProduct(prisma, { stock: 10, price: 30000 });
      const toppings = await prisma.topping.findMany({ where: { name: { in: ['Trân châu đen', 'Kem cheese'] } } });
      const res = await postOrder(app, token, {
        items: [
          { productId: product.id, size: 'L', toppingIds: toppings.map((t) => t.id), qty: 2 },
          { productId: product.id, size: 'S', qty: 1 },
        ],
        promotionCode: 'brew10',
      }).expect(201);

      // L: 30.000 + 10.000 + 8.000 + 10.000 = 58.000 × 2 = 116.000; S: 30.000 → tạm tính 146.000, giảm 10%
      expect(res.body).toMatchObject({ status: 'PENDING', subtotal: 146000, discount: 14600, total: 131400, promotionCode: 'BREW10' });
      expect(res.body.items[0]).toMatchObject({ productName: product.name, size: 'L', qty: 2, unitPrice: 58000, lineTotal: 116000 });
      expect(res.body.items[0].toppings.sort()).toEqual(['Kem cheese', 'Trân châu đen']);
      expect(await stockOf(prisma, product.id)).toBe(7);
    });

    it.each([
      ['số lượng 21', { items: [{ productId: 1, size: 'M', qty: 21 }] }, 'Số lượng mỗi dòng từ 1 đến 20'],
      ['size sai', { items: [{ productId: 1, size: 'XL', qty: 1 }] }, 'Size phải là S, M hoặc L'],
      ['quá 5 topping', { items: [{ productId: 1, size: 'S', qty: 1, toppingIds: [1, 2, 3, 4, 5, 6] }] }, 'Mỗi ly tối đa 5 topping'],
      ['giỏ rỗng', { items: [] }, 'Đơn hàng phải có ít nhất một món'],
      ['quá 30 dòng', { items: Array.from({ length: 31 }, () => ({ productId: 1, size: 'S', qty: 1 })) }, 'Mỗi đơn tối đa 30 dòng'],
      ['gửi kèm giá', { items: [{ productId: 1, size: 'S', qty: 1, unitPrice: 1 }] }, 'Trường "items.0.unitPrice" không được phép gửi lên'],
    ])('400 khi %s', async (_name, body, message) => {
      const res = await postOrder(app, token, body).expect(400);
      expect(res.body.message).toEqual(expect.arrayContaining([message]));
    });

    it('400 khi món, topping hoặc mã giảm giá không hợp lệ', async () => {
      expect((await postOrder(app, token, { items: [{ productId: 999999, size: 'S', qty: 1 }] }).expect(400)).body.message).toBe(
        'Món #999999 không tồn tại',
      );
      expect(
        (await postOrder(app, token, { items: [{ productId: 1, size: 'S', qty: 1, toppingIds: [99999] }] }).expect(400)).body.message,
      ).toBe('Topping #99999 không tồn tại');
      expect(
        (await postOrder(app, token, { items: [{ productId: 1, size: 'S', qty: 1 }], promotionCode: 'HETHAN' }).expect(400)).body.message,
      ).toBe('Mã giảm giá đã hết hạn');
    });

    it('size M, L trừ 125%, 150% nguyên liệu; ghi lại lượng đã trừ của đơn', async () => {
      const product = await createProduct(prisma, { stock: 1000, perCup: 200, scalesWithSize: true });
      const res = await postOrder(app, token, {
        items: [
          { productId: product.id, size: 'L', qty: 1 },
          { productId: product.id, size: 'M', qty: 1 },
        ],
      }).expect(201);
      // L 300 ml + M 250 ml = 550 ml
      expect(await stockOf(prisma, product.id)).toBe(450);
      const used = await prisma.orderIngredient.findMany({ where: { orderId: res.body.id } });
      expect(used.map((u) => u.amount)).toEqual([550]);

      const short = await postOrder(app, token, { items: [{ productId: product.id, size: 'L', qty: 2 }] }).expect(409);
      expect(short.body.message).toBe(`${product.name} size L chỉ còn 1 ly`);
    });

    it('409 khi một món thiếu hàng; không tạo đơn, không trừ nguyên liệu nào', async () => {
      const enough = await createProduct(prisma, { stock: 10 });
      const scarce = await createProduct(prisma, { stock: 2, name: `Cold brew test ${Date.now()}` });
      const before = await prisma.order.count();
      const res = await postOrder(app, token, {
        items: [
          { productId: enough.id, size: 'S', qty: 3 },
          { productId: scarce.id, size: 'M', qty: 3 },
        ],
      }).expect(409);
      expect(res.body.message).toBe(`${scarce.name} size M chỉ còn 2 ly`);
      expect(await prisma.order.count()).toBe(before);
      expect(await stockOf(prisma, enough.id)).toBe(10);
      expect(await stockOf(prisma, scarce.id)).toBe(2);
    });
  });

  // API-T04: 10 yêu cầu đặt đồng thời món còn 3 phần (NFR-06)
  it('API-T04 10 đơn đồng thời món còn 3 phần: đúng 3 thành công, nguyên liệu về 0', async () => {
    const product = await createProduct(prisma, { stock: 3 });
    const customers = await Promise.all(Array.from({ length: 10 }, () => registerCustomer(app)));
    const results = await Promise.all(
      customers.map((c) => postOrder(app, c.token, { items: [{ productId: product.id, size: 'S', qty: 1 }] })),
    );
    const codes = results.map((r) => r.status).sort();
    expect(codes.filter((c) => c === 201)).toHaveLength(3);
    expect(codes.filter((c) => c === 409)).toHaveLength(7);
    expect(await stockOf(prisma, product.id)).toBe(0);
    expect(await prisma.orderItem.count({ where: { productId: product.id } })).toBe(3);
  });

  // API-T05: gửi lại POST /orders cùng khóa chỉ tạo một đơn (FR-10)
  describe('API-T05 chống tạo đơn trùng', () => {
    it('gửi lại tuần tự cùng khóa: nhận lại đúng đơn cũ, không trừ nguyên liệu lần hai', async () => {
      const product = await createProduct(prisma, { stock: 10 });
      const key = uniqueKey('don');
      const body = { items: [{ productId: product.id, size: 'S', qty: 2 }] };
      const first = await postOrder(app, token, body, key).expect(201);
      const second = await postOrder(app, token, body, key).expect(201);
      expect(second.body.id).toBe(first.body.id);
      expect(await stockOf(prisma, product.id)).toBe(8);
    });

    it('5 yêu cầu cùng khóa đến đồng thời chỉ tạo một đơn', async () => {
      const product = await createProduct(prisma, { stock: 10 });
      const key = uniqueKey('dong-thoi');
      const body = { items: [{ productId: product.id, size: 'S', qty: 1 }] };
      const results = await Promise.all(Array.from({ length: 5 }, () => postOrder(app, token, body, key)));
      expect(results.every((r) => r.status === 201)).toBe(true);
      expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
      expect(await stockOf(prisma, product.id)).toBe(9);
    });

    it('cùng khóa nhưng người dùng khác tạo đơn riêng; khóa sai định dạng trả 400', async () => {
      const product = await createProduct(prisma, { stock: 10 });
      const key = uniqueKey('chung');
      const other = await registerCustomer(app);
      const body = { items: [{ productId: product.id, size: 'S', qty: 1 }] };
      const a = await postOrder(app, token, body, key).expect(201);
      const b = await postOrder(app, other.token, body, key).expect(201);
      expect(a.body.id).not.toBe(b.body.id);
      await postOrder(app, token, body, 'ngan').expect(400);
      await postOrder(app, token, body, 'co dau cach!!').expect(400);
    });
  });

  // API-T09: lịch sử đơn, không xem được đơn người khác (FR-15)
  it('API-T09 GET /orders/me mới nhất trước; GET /orders/:id của người khác trả 404', async () => {
    const owner = await registerCustomer(app);
    const stranger = await registerCustomer(app);
    const product = await createProduct(prisma, { stock: 10 });
    const body = { items: [{ productId: product.id, size: 'S', qty: 1 }] };
    const first = await postOrder(app, owner.token, body).expect(201);
    const second = await postOrder(app, owner.token, body).expect(201);

    const mine = await request(app.getHttpServer()).get('/orders/me').set('Authorization', `Bearer ${owner.token}`).expect(200);
    expect(mine.body.map((o: { id: number }) => o.id)).toEqual([second.body.id, first.body.id]);

    await request(app.getHttpServer()).get(`/orders/${first.body.id}`).set('Authorization', `Bearer ${owner.token}`).expect(200);
    await request(app.getHttpServer()).get(`/orders/${first.body.id}`).set('Authorization', `Bearer ${stranger.token}`).expect(404);
    await request(app.getHttpServer()).get('/orders/999999').set('Authorization', `Bearer ${owner.token}`).expect(404);
    const empty = await request(app.getHttpServer()).get('/orders/me').set('Authorization', `Bearer ${stranger.token}`).expect(200);
    expect(empty.body).toEqual([]);
  });
});
