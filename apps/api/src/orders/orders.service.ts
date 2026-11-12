import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/current-user.decorator';
import { cupNeeds, RECIPE_SELECT } from '../ingredients/inventory';
import { PrismaService } from '../prisma/prisma.service';
import { lineTotal, unitPrice } from '../products/pricing';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateOrderDto, OrderItemDto } from './orders.dto';

// Mỗi lần optimistic lock thất bại nghĩa là một đơn khác vừa trừ cùng nguyên liệu thành công
const STOCK_RETRIES = 20;

/** Trường trả ra ngoài của một đơn (không lộ khóa idempotency) */
export const ORDER_SELECT = {
  id: true,
  userId: true,
  status: true,
  subtotal: true,
  discount: true,
  total: true,
  promotionCode: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
      productId: true,
      productName: true,
      size: true,
      toppings: true,
      qty: true,
      unitPrice: true,
      lineTotal: true,
    },
  },
} satisfies Prisma.OrderSelect;

type PricedItem = Omit<Prisma.OrderItemCreateManyOrderInput, 'id'> & { productName: string };

/** Một dòng của đơn: nguyên liệu cho 1 ly và số ly đặt, dùng để báo lỗi thiếu hàng dễ hiểu */
interface CupUsage {
  label: string;
  qty: number;
  perCup: Map<number, number>;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionsService,
  ) {}

  /**
   * FR-08, FR-10: tính giá ở server, trừ nguyên liệu theo công thức và tạo đơn PENDING trong một transaction.
   * Cùng người dùng gửi lại cùng Idempotency-Key thì nhận lại đơn cũ, không trừ kho lần hai.
   */
  async create(userId: number, dto: CreateOrderDto, key?: string) {
    const scopedKey = key ? `${userId}:${key}` : undefined;
    if (scopedKey) {
      const existing = await this.findByKey(scopedKey);
      if (existing) return existing;
    }

    const { items, cups } = await this.priceItems(dto.items);
    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    let discount = 0;
    let promotionCode: string | null = null;
    if (dto.promotionCode) {
      const result = await this.promotions.evaluate(dto.promotionCode, subtotal);
      if (!result.valid) throw new BadRequestException(result.reason);
      discount = result.discount;
      promotionCode = result.code;
    }

    // Cộng dồn nguyên liệu cả đơn: hai món dùng chung một nguyên liệu thì trừ chung một lần
    const need = new Map<number, number>();
    for (const cup of cups) {
      for (const [id, amount] of cup.perCup) need.set(id, (need.get(id) ?? 0) + amount * cup.qty);
    }
    // Luôn khóa nguyên liệu theo id tăng dần để hai đơn dùng chung nguyên liệu không deadlock (ADR-006)
    const ingredientIds = [...need.keys()].sort((a, b) => a - b);

    try {
      return await this.prisma.$transaction(async (tx) => {
        for (const id of ingredientIds) await this.reserveIngredient(tx, id, need.get(id)!, cups);
        return tx.order.create({
          data: {
            userId,
            subtotal,
            discount,
            total: subtotal - discount,
            promotionCode,
            idempotencyKey: scopedKey,
            items: { create: items },
            ingredients: { create: ingredientIds.map((id) => ({ ingredientId: id, amount: need.get(id)! })) },
          },
          select: ORDER_SELECT,
        });
      });
    } catch (e) {
      // Hai yêu cầu cùng khóa đến đồng thời: yêu cầu thua bị UNIQUE chặn, transaction đã hoàn kho → trả đơn của yêu cầu thắng
      if (scopedKey && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const existing = await this.findByKey(scopedKey);
        if (existing) return existing;
      }
      throw e;
    }
  }

  /** FR-15: đơn của chính người dùng, mới nhất trước */
  findMine(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: ORDER_SELECT,
    });
  }

  /** Đơn của người khác hoặc không tồn tại đều trả 404; nhân viên quầy xem được mọi đơn */
  async findOneFor(user: AuthUser, id: number) {
    const order = await this.prisma.order.findUnique({ where: { id }, select: ORDER_SELECT });
    if (!order || (order.userId !== user.id && user.role !== 'STAFF')) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return order;
  }

  private findByKey(idempotencyKey: string) {
    return this.prisma.order.findUnique({ where: { idempotencyKey }, select: ORDER_SELECT });
  }

  /** BR-01, BR-02: giá lấy từ CSDL; món hoặc topping không tồn tại trả 400. Kèm nguyên liệu cho 1 ly của từng dòng (BR-09) */
  private async priceItems(lines: OrderItemDto[]): Promise<{ items: PricedItem[]; cups: CupUsage[] }> {
    const productIds = [...new Set(lines.map((l) => l.productId))];
    const toppingIds = [...new Set(lines.flatMap((l) => l.toppingIds))];
    const [products, toppings] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: productIds } }, include: { recipe: RECIPE_SELECT } }),
      this.prisma.topping.findMany({ where: { id: { in: toppingIds } }, include: { recipe: RECIPE_SELECT } }),
    ]);
    const productById = new Map(products.map((p) => [p.id, p]));
    const toppingById = new Map(toppings.map((t) => [t.id, t]));

    const cups: CupUsage[] = [];
    const items = lines.map((line) => {
      const product = productById.get(line.productId);
      if (!product) throw new BadRequestException(`Món #${line.productId} không tồn tại`);
      if (product.recipe.length === 0) throw new ConflictException(`${product.name} tạm hết hàng`);
      const chosen = line.toppingIds.map((id) => {
        const topping = toppingById.get(id);
        if (!topping) throw new BadRequestException(`Topping #${id} không tồn tại`);
        return topping;
      });
      const extras = chosen.length ? ` thêm ${chosen.map((t) => t.name.toLowerCase()).join(', ')}` : '';
      cups.push({
        label: `${product.name} size ${line.size}${extras}`,
        qty: line.qty,
        perCup: cupNeeds(
          product.recipe,
          line.size,
          chosen.map((t) => t.recipe),
        ),
      });
      const unit = unitPrice(
        product.price,
        line.size,
        chosen.map((t) => t.price),
      );
      return {
        productId: product.id,
        productName: product.name,
        size: line.size,
        toppings: chosen.map((t) => t.name),
        qty: line.qty,
        unitPrice: unit,
        lineTotal: lineTotal(unit, line.qty),
      };
    });
    return { items, cups };
  }

  /**
   * ADR-006: trừ một nguyên liệu bằng optimistic locking, chỉ cập nhật khi `version` chưa đổi kể từ lúc đọc.
   * Thiếu nguyên liệu thì ném 409, transaction rollback nên không nguyên liệu nào bị trừ.
   */
  private async reserveIngredient(tx: Prisma.TransactionClient, ingredientId: number, amount: number, cups: CupUsage[]) {
    for (let attempt = 0; attempt < STOCK_RETRIES; attempt++) {
      const ingredient = await tx.ingredient.findUniqueOrThrow({
        where: { id: ingredientId },
        select: { name: true, stock: true, version: true },
      });
      if (ingredient.stock < amount) throw new ConflictException(shortageMessage(ingredientId, ingredient, cups));
      const res = await tx.ingredient.updateMany({
        where: { id: ingredientId, version: ingredient.version },
        data: { stock: { decrement: amount }, version: { increment: 1 } },
      });
      if (res.count === 1) return;
    }
    throw new ConflictException('Có nhiều người đặt cùng lúc, vui lòng thử lại');
  }
}

/** Chỉ một dòng dùng nguyên liệu bị thiếu thì báo số ly còn làm được; nhiều dòng dùng chung thì nêu tên nguyên liệu */
function shortageMessage(ingredientId: number, ingredient: { name: string; stock: number }, cups: CupUsage[]) {
  const users = cups.filter((c) => c.perCup.has(ingredientId));
  if (users.length === 1) {
    const left = Math.floor(ingredient.stock / users[0].perCup.get(ingredientId)!);
    return left === 0 ? `Đã hết nguyên liệu cho ${users[0].label}` : `${users[0].label} chỉ còn ${left} ly`;
  }
  return `Không đủ ${ingredient.name.toLowerCase()} cho các món trong đơn, vui lòng giảm số lượng`;
}
