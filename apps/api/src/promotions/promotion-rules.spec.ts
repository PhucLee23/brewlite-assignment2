import { evaluatePromotion, PromotionRule } from './promotion-rules';

const now = new Date('2026-06-01T00:00:00Z');
const base: PromotionRule = { code: 'BREW10', percentOff: 10, minTotal: 0, active: true, expiresAt: null };

// UT-02: đánh giá mã giảm giá (BR-04)
describe('UT-02 mã giảm giá', () => {
  it('hợp lệ: giảm theo phần trăm, làm tròn xuống', () => {
    expect(evaluatePromotion(base, 99999, now)).toEqual({ valid: true, discount: 9999 });
  });

  it('không tồn tại', () => {
    expect(evaluatePromotion(null, 50000, now)).toEqual({ valid: false, reason: 'Mã giảm giá không tồn tại' });
  });

  it('đã ngừng áp dụng', () => {
    expect(evaluatePromotion({ ...base, active: false }, 50000, now)).toMatchObject({ valid: false, reason: 'Mã giảm giá đã ngừng áp dụng' });
  });

  it('hết hạn (kể cả đúng thời điểm hết hạn)', () => {
    expect(evaluatePromotion({ ...base, expiresAt: new Date('2026-01-01') }, 50000, now)).toMatchObject({ reason: 'Mã giảm giá đã hết hạn' });
    expect(evaluatePromotion({ ...base, expiresAt: now }, 50000, now)).toMatchObject({ valid: false });
    expect(evaluatePromotion({ ...base, expiresAt: new Date('2027-01-01') }, 50000, now)).toMatchObject({ valid: true });
  });

  it('chưa đạt mức tối thiểu; đạt đúng mức thì hợp lệ', () => {
    const promo = { ...base, percentOff: 20, minTotal: 100000 };
    expect(evaluatePromotion(promo, 99000, now)).toEqual({
      valid: false,
      reason: 'Đơn cần tạm tính tối thiểu 100.000đ để dùng mã này',
    });
    expect(evaluatePromotion(promo, 100000, now)).toEqual({ valid: true, discount: 20000 });
  });
});
