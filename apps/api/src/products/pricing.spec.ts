import { lineTotal, SIZE_SURCHARGE, unitPrice } from './pricing';

// UT-01: tính đơn giá theo size và topping (BR-01)
describe('UT-01 pricing', () => {
  it('size S giữ nguyên giá gốc', () => {
    expect(unitPrice(29000, 'S')).toBe(29000);
  });

  it('size M cộng 5.000đ, size L cộng 10.000đ', () => {
    expect(SIZE_SURCHARGE).toEqual({ S: 0, M: 5000, L: 10000 });
    expect(unitPrice(29000, 'M')).toBe(34000);
    expect(unitPrice(29000, 'L')).toBe(39000);
  });

  it('cộng tổng giá các topping đã chọn', () => {
    expect(unitPrice(45000, 'L', [8000, 10000])).toBe(73000);
  });

  it('thành tiền dòng = đơn giá × số lượng', () => {
    expect(lineTotal(unitPrice(25000, 'M', [7000]), 3)).toBe(111000);
  });
});
