// Tính số ly còn bán được từ tồn kho nguyên liệu theo công thức (BR-09, ADR-011).
// Dùng chung cho menu, tạo đơn và trang Kho nên mọi nơi ra cùng một con số.
import { Size } from '../products/pricing';

/** Lượng nguyên liệu của size M, L so với công thức size S (%), BR-09 */
export const SIZE_RECIPE_PERCENT: Record<Size, number> = { S: 100, M: 125, L: 150 };

/** Đọc công thức của món hoặc topping kèm tồn kho từng nguyên liệu */
export const RECIPE_SELECT = {
  select: {
    ingredientId: true,
    amount: true,
    ingredient: { select: { name: true, stock: true, scalesWithSize: true } },
  },
} as const;

export interface RecipeLine {
  ingredientId: number;
  amount: number;
  ingredient: { name: string; stock: number; scalesWithSize: boolean };
}

/** Lượng cho 1 ly theo size, làm tròn lên; ly nhựa (scalesWithSize = false) luôn 1 cái mỗi ly */
export function amountForSize(line: RecipeLine, size: Size): number {
  if (!line.ingredient.scalesWithSize) return line.amount;
  return Math.ceil((line.amount * SIZE_RECIPE_PERCENT[size]) / 100);
}

/** Nguyên liệu cho 1 ly: công thức món theo size cộng một phần mỗi topping (topping không đổi theo size) */
export function cupNeeds(recipe: RecipeLine[], size: Size, toppingRecipes: RecipeLine[][] = []): Map<number, number> {
  const needs = new Map<number, number>();
  const add = (id: number, amount: number) => needs.set(id, (needs.get(id) ?? 0) + amount);
  for (const line of recipe) add(line.ingredientId, amountForSize(line, size));
  for (const lines of toppingRecipes) for (const line of lines) add(line.ingredientId, line.amount);
  return needs;
}

/** Số phần làm được với tồn kho hiện tại: nguyên liệu hết trước quyết định; chưa có công thức thì không bán */
export function servingsLeft(needs: Map<number, number>, stockById: Map<number, number>): number {
  if (needs.size === 0) return 0;
  let min = Infinity;
  for (const [id, amount] of needs) min = Math.min(min, Math.floor((stockById.get(id) ?? 0) / amount));
  return min;
}

/** Tồn kho hiện tại của các nguyên liệu xuất hiện trong các công thức */
export function stockMap(...recipes: RecipeLine[][]): Map<number, number> {
  return new Map(recipes.flat().map((l) => [l.ingredientId, l.ingredient.stock]));
}
