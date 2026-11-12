import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { cupNeeds, RECIPE_SELECT, servingsLeft, stockMap } from './inventory';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  /** FR-24: tồn từng nguyên liệu và số ly size S còn bán được của từng món */
  async overview() {
    const [ingredients, products] = await Promise.all([
      this.prisma.ingredient.findMany({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          name: true,
          unit: true,
          stock: true,
          products: { select: { amount: true, product: { select: { name: true } } }, orderBy: { productId: 'asc' } },
          toppings: { select: { amount: true, topping: { select: { name: true } } }, orderBy: { toppingId: 'asc' } },
        },
      }),
      this.prisma.product.findMany({ orderBy: { id: 'asc' }, select: { id: true, name: true, recipe: RECIPE_SELECT } }),
    ]);

    return {
      ingredients: ingredients.map(({ products: p, toppings: t, ...ingredient }) => {
        const uses = [
          ...p.map((u) => ({ name: u.product.name, amount: u.amount })),
          ...t.map((u) => ({ name: `topping ${u.topping.name}`, amount: u.amount })),
        ];
        return {
          ...ingredient,
          usedBy: uses.map((u) => u.name),
          // Đủ cho bao nhiêu phần của món tốn nguyên liệu này nhất; null khi chưa món nào dùng
          servings: uses.length ? Math.min(...uses.map((u) => Math.floor(ingredient.stock / u.amount))) : null,
        };
      }),
      products: products.map(({ recipe, ...product }) => {
        const stock = servingsLeft(cupNeeds(recipe, 'S'), stockMap(recipe));
        // Nguyên liệu hết trước quyết định số ly còn bán được
        const limitedBy = recipe.find((l) => Math.floor(l.ingredient.stock / l.amount) === stock)?.ingredient.name ?? null;
        return { ...product, stock, limitedBy };
      }),
    };
  }

  /**
   * FR-24: cộng thêm hàng vào kho trong một câu UPDATE. Tăng version để đơn nào đang trừ nguyên liệu này
   * cùng lúc (optimistic locking, ADR-006) phải đọc lại tồn mới, không ghi đè mất lượng vừa nhập.
   */
  async restock(id: number, amount: number) {
    const { count } = await this.prisma.ingredient.updateMany({
      where: { id },
      data: { stock: { increment: amount }, version: { increment: 1 } },
    });
    if (count === 0) throw new NotFoundException('Không tìm thấy nguyên liệu');
    return this.prisma.ingredient.findUniqueOrThrow({ where: { id }, select: { id: true, name: true, unit: true, stock: true } });
  }
}
