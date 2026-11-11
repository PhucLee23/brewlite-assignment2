// Quy tắc tính giá BR-01. Giá luôn được server tính lại từ CSDL (BR-02).

export type Size = 'S' | 'M' | 'L';

export const SIZES: Size[] = ['S', 'M', 'L'];

/** Phụ thu theo size, cộng vào giá size S của món (VNĐ) */
export const SIZE_SURCHARGE: Record<Size, number> = { S: 0, M: 5000, L: 10000 };

/** Đơn giá một ly = giá size S + phụ thu size + tổng giá topping đã chọn */
export function unitPrice(basePrice: number, size: Size, toppingPrices: number[] = []): number {
  return basePrice + SIZE_SURCHARGE[size] + toppingPrices.reduce((sum, p) => sum + p, 0);
}

/** Thành tiền dòng = đơn giá × số lượng */
export function lineTotal(unit: number, qty: number): number {
  return unit * qty;
}
