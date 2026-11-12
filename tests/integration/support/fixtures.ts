import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../apps/api/src/prisma/prisma.service';

let counter = 0;

/**
 * Tạo món riêng cho từng test, kèm một nguyên liệu riêng để số tồn kho không phụ thuộc lần chạy trước.
 * Mặc định mỗi ly dùng 1 phần nguyên liệu bất kể size, nên `stock` chính là số ly còn bán được.
 */
export async function createProduct(
  prisma: PrismaService,
  data: { stock: number; price?: number; name?: string; perCup?: number; scalesWithSize?: boolean },
) {
  counter += 1;
  const name = data.name ?? `Món test ${Date.now()}-${counter}`;
  const ingredient = await prisma.ingredient.create({
    data: { name: `Nguyên liệu ${name}`, unit: 'phần', stock: data.stock, scalesWithSize: data.scalesWithSize ?? false },
  });
  return prisma.product.create({
    data: {
      name,
      description: 'Dữ liệu kiểm thử',
      price: data.price ?? 30000,
      imageUrl: '/images/espresso.jpg',
      recipe: { create: { ingredientId: ingredient.id, amount: data.perCup ?? 1 } },
    },
  });
}

/** Tồn kho hiện tại của nguyên liệu riêng của món tạo bằng createProduct */
export async function stockOf(prisma: PrismaService, productId: number) {
  const line = await prisma.productIngredient.findFirstOrThrow({ where: { productId }, include: { ingredient: true } });
  return line.ingredient.stock;
}

/** Gọi POST /orders bằng token của khách */
export function postOrder(app: INestApplication, token: string, body: object, key?: string) {
  const req = request(app.getHttpServer()).post('/orders').set('Authorization', `Bearer ${token}`);
  if (key) req.set('Idempotency-Key', key);
  return req.send(body);
}

export function uniqueKey(prefix = 'key') {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}
