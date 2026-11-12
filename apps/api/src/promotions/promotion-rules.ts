// Quy tắc mã giảm giá BR-04, viết thành hàm thuần để unit test (UT-02)

export interface PromotionRule {
  code: string;
  percentOff: number;
  minTotal: number;
  active: boolean;
  expiresAt: Date | null;
}

export type Evaluation = { valid: true; discount: number } | { valid: false; reason: string };

const vnd = new Intl.NumberFormat('vi-VN');

/** Mã áp dụng khi đang hoạt động, chưa hết hạn và tạm tính đạt mức tối thiểu; giảm = tạm tính × %, làm tròn xuống */
export function evaluatePromotion(promo: PromotionRule | null, subtotal: number, now = new Date()): Evaluation {
  if (!promo) return { valid: false, reason: 'Mã giảm giá không tồn tại' };
  if (!promo.active) return { valid: false, reason: 'Mã giảm giá đã ngừng áp dụng' };
  if (promo.expiresAt && promo.expiresAt.getTime() <= now.getTime()) {
    return { valid: false, reason: 'Mã giảm giá đã hết hạn' };
  }
  if (subtotal < promo.minTotal) {
    return { valid: false, reason: `Đơn cần tạm tính tối thiểu ${vnd.format(promo.minTotal)}đ để dùng mã này` };
  }
  return { valid: true, discount: Math.floor((subtotal * promo.percentOff) / 100) };
}
