import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { createTestApp } from './support/app';
import { createProduct, postOrder, stockOf } from './support/fixtures';
import { loginStaff, registerCustomer } from './support/users';

// API-T17: kho nguyên liệu và nhập kho, chỉ nhân viên (FR-24, BR-09)
describe('API-T17 kho nguyên liệu', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let staffToken: string;
  let customerToken: string;

  const overview = (t: string) => request(app.getHttpServer()).get('/ingredients').set('Authorization', `Bearer ${t}`);
  const restock = (id: number | string, amount: unknown, t = staffToken) =>
    request(app.getHttpServer()).post(`/ingredients/${id}/restock`).set('Authorization', `Bearer ${t}`).send({ amount });

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    staffToken = await loginStaff(app);
    ({ token: customerToken } = await registerCustomer(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 khi chưa đăng nhập, 403 với khách hàng', async () => {
    await request(app.getHttpServer()).get('/ingredients').expect(401);
    await overview(customerToken).expect(403);
    await restock(1, 10, customerToken).expect(403);
  });

  it('nhân viên xem tồn từng nguyên liệu, món dùng nó, số ly còn bán được và nguyên liệu hết trước', async () => {
    const res = (await overview(staffToken).expect(200)).body;
    const coldBrew = res.ingredients.find((i: { name: string }) => i.name === 'Cold brew ủ sẵn');
    expect(coldBrew).toMatchObject({ unit: 'ml', usedBy: ['Cold brew'] });
    expect(res.products.find((p: { id: number }) => p.id === 10)).toMatchObject({ stock: 0, limitedBy: 'Tép bưởi hồng' });
    expect(res.ingredients[0]).not.toHaveProperty('version');
  });

  it('nhập thêm hàng cộng vào tồn kho; số ly còn bán được tăng theo và đặt được ngay', async () => {
    const product = await createProduct(prisma, { stock: 0 });
    const line = await prisma.productIngredient.findFirstOrThrow({ where: { productId: product.id } });
    await postOrder(app, customerToken, { items: [{ productId: product.id, size: 'S', qty: 1 }] }).expect(409);

    const res = await restock(line.ingredientId, 5).expect(200);
    expect(res.body).toMatchObject({ id: line.ingredientId, stock: 5 });
    const after = (await overview(staffToken).expect(200)).body;
    expect(after.products.find((p: { id: number }) => p.id === product.id).stock).toBe(5);

    await postOrder(app, customerToken, { items: [{ productId: product.id, size: 'S', qty: 5 }] }).expect(201);
    expect(await stockOf(prisma, product.id)).toBe(0);
  });

  it('số lượng nhập phải là số nguyên 1 – 1.000.000; nguyên liệu không tồn tại trả 404', async () => {
    expect((await restock(1, 0).expect(400)).body.message).toEqual(['Số lượng nhập tối thiểu là 1']);
    expect((await restock(1, 1.5).expect(400)).body.message).toEqual(['Số lượng nhập phải là số nguyên']);
    await restock(1, 2_000_000).expect(400);
    await restock('abc', 10).expect(400);
    expect((await restock(999999, 10).expect(404)).body.message).toBe('Không tìm thấy nguyên liệu');
  });

  it('nhập kho cùng lúc với đặt đơn không làm mất lượng vừa nhập (optimistic locking)', async () => {
    const product = await createProduct(prisma, { stock: 20 });
    const line = await prisma.productIngredient.findFirstOrThrow({ where: { productId: product.id } });
    const customers = await Promise.all(Array.from({ length: 5 }, () => registerCustomer(app)));
    await Promise.all([
      ...customers.map((c) => postOrder(app, c.token, { items: [{ productId: product.id, size: 'S', qty: 2 }] }).expect(201)),
      restock(line.ingredientId, 100).expect(200),
    ]);
    expect(await stockOf(prisma, product.id)).toBe(20 - 10 + 100);
  });
});
