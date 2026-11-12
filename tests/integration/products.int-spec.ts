import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './support/app';

// API-T01: GET /products, GET /products/:id trên CSDL seed (FR-01, FR-03, NFR-01)
describe('API-T01 sản phẩm', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /products trả danh sách đủ trường, sắp theo id tăng dần, không cần đăng nhập', async () => {
    const res = await request(app.getHttpServer()).get('/products').expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const p of res.body) {
      expect(Object.keys(p).sort()).toEqual(['description', 'id', 'imageUrl', 'name', 'price', 'stock']);
    }
    const ids = res.body.map((p: { id: number }) => p.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  it('GET /products/:id trả món kèm bảng giá size S, M, L và danh sách topping', async () => {
    const res = await request(app.getHttpServer()).get('/products/2').expect(200);
    expect(res.body).toMatchObject({ id: 2, name: 'Cà phê sữa đá', price: 29000 });
    expect(res.body.sizes).toEqual([
      { size: 'S', surcharge: 0, price: 29000, stock: expect.any(Number) },
      { size: 'M', surcharge: 5000, price: 34000, stock: expect.any(Number) },
      { size: 'L', surcharge: 10000, price: 39000, stock: expect.any(Number) },
    ]);
    expect(res.body.toppings.length).toBeGreaterThan(0);
    expect(res.body.toppings[0]).toEqual({
      id: expect.any(Number),
      name: expect.any(String),
      price: expect.any(Number),
      stock: expect.any(Number),
    });
  });

  it('số ly còn bán được tính từ nguyên liệu: Cold brew còn 5 ly S, 4 ly M, 3 ly L; Trà bưởi hồng hết hàng (BR-09)', async () => {
    const coldBrew = await request(app.getHttpServer()).get('/products/4').expect(200);
    expect(coldBrew.body.stock).toBe(5);
    expect(coldBrew.body.sizes.map((s: { stock: number }) => s.stock)).toEqual([5, 4, 3]);

    const list = await request(app.getHttpServer()).get('/products').expect(200);
    expect(list.body.find((p: { id: number }) => p.id === 10).stock).toBe(0);
  });

  it('id không phải số trả 400', async () => {
    const res = await request(app.getHttpServer()).get('/products/abc').expect(400);
    expect(res.body.message).toMatch(/không hợp lệ/);
  });

  it('id không tồn tại trả 404', async () => {
    const res = await request(app.getHttpServer()).get('/products/99999').expect(404);
    expect(res.body.message).toBe('Không tìm thấy sản phẩm');
  });

  it('NFR-01: p95 thời gian phản hồi ≤ 500 ms', async () => {
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const started = Date.now();
      await request(app.getHttpServer()).get(i % 2 ? '/products' : '/products/1').expect(200);
      times.push(Date.now() - started);
    }
    times.sort((a, b) => a - b);
    expect(times[Math.ceil(times.length * 0.95) - 1]).toBeLessThanOrEqual(500);
  });
});
