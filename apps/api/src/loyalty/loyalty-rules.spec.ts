import { pointsFor } from './loyalty-rules';

// UT-04: tính điểm thưởng (BR-05)
describe('UT-04 điểm thưởng', () => {
  it('1 điểm cho mỗi 1.000đ, làm tròn xuống', () => {
    expect(pointsFor(58000)).toBe(58);
    expect(pointsFor(131400)).toBe(131);
    expect(pointsFor(999)).toBe(0);
  });

  it('không bao giờ âm', () => {
    expect(pointsFor(0)).toBe(0);
    expect(pointsFor(-5000)).toBe(0);
  });
});
