import { Injectable, NotFoundException } from '@nestjs/common';
import { cupNeeds, RECIPE_SELECT, RecipeLine, servingsLeft, stockMap } from '../ingredients/inventory';
import { PrismaService } from '../prisma/prisma.service';
import { SIZE_SURCHARGE, SIZES, unitPrice } from './pricing';

const LIST_FIELDS = {
  id: true,
  name: true,
  description: true,
  price: true,
  imageUrl: true,
  recipe: RECIPE_SELECT,
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** FR-01: danh sách món, sắp theo id tăng dần */
  async findAll() {
    const products = await this.prisma.product.findMany({ select: LIST_FIELDS, orderBy: { id: 'asc' } });
    return products.map(withStock);
  }

  /** FR-03: chi tiết món kèm bảng giá, số ly còn của từng size và danh sách topping */
  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id }, select: LIST_FIELDS });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    const toppings = await this.prisma.topping.findMany({
      select: { id: true, name: true, price: true, recipe: RECIPE_SELECT },
      orderBy: { id: 'asc' },
    });
    const stock = stockMap(product.recipe);
    // Size lớn tốn nhiều nguyên liệu hơn nên số ly còn lại tính riêng cho từng size (FR-05)
    const sizes = SIZES.map((size) => ({
      size,
      surcharge: SIZE_SURCHARGE[size],
      price: unitPrice(product.price, size),
      stock: servingsLeft(cupNeeds(product.recipe, size), stock),
    }));
    return {
      ...withStock(product),
      sizes,
      toppings: toppings.map(({ recipe, ...t }) => ({
        ...t,
        stock: servingsLeft(cupNeeds([], 'S', [recipe]), stockMap(recipe)),
      })),
    };
  }
}

/** `stock` là số ly size S còn bán được, tính từ nguyên liệu; công thức không trả ra ngoài (FR-01, FR-02) */
function withStock<T extends { recipe: RecipeLine[] }>({ recipe, ...product }: T) {
  return { ...product, stock: servingsLeft(cupNeeds(recipe, 'S'), stockMap(recipe)) };
}
