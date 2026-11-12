import { beforeEach, describe, expect, it } from 'vitest';
import { cartCount, cartTotal, qtyOfProduct, useCart, type NewCartLine } from './cart';

const latteM: NewCartLine = {
  productId: 5,
  name: 'Latte',
  imageUrl: '/images/latte.jpg',
  size: 'M',
  toppings: [
    { id: 3, name: 'Kem cheese', price: 10000 },
    { id: 1, name: 'Trân châu đen', price: 8000 },
  ],
  unitPrice: 68000,
};

// CT-03: store giỏ hàng – gộp dòng, tổng tiền, lưu khi tải lại (FR-04, FR-05)
describe('CT-03 store giỏ hàng', () => {
  beforeEach(() => {
    localStorage.clear();
    useCart.setState({ lines: [] });
  });

  it('cùng món, cùng size, cùng bộ topping (khác thứ tự) thì gộp thành một dòng', () => {
    useCart.getState().add(latteM, 1);
    useCart.getState().add({ ...latteM, toppings: [...latteM.toppings].reverse() }, 2);
    expect(useCart.getState().lines).toHaveLength(1);
    expect(useCart.getState().lines[0].qty).toBe(3);
  });

  it('khác size hoặc khác topping thì là dòng mới; tổng tiền và số ly cập nhật', () => {
    useCart.getState().add(latteM, 2);
    useCart.getState().add({ ...latteM, size: 'L', unitPrice: 73000 }, 1);
    useCart.getState().add({ ...latteM, toppings: [], unitPrice: 50000 }, 1);
    const { lines } = useCart.getState();
    expect(lines).toHaveLength(3);
    expect(cartCount(lines)).toBe(4);
    expect(cartTotal(lines)).toBe(68000 * 2 + 73000 + 50000);
    expect(qtyOfProduct(lines, 5)).toBe(4);
  });

  it('sửa số lượng tối thiểu 1, tối đa 20; xóa dòng', () => {
    useCart.getState().add(latteM, 1);
    const key = useCart.getState().lines[0].key;
    useCart.getState().setQty(key, 0);
    expect(useCart.getState().lines[0].qty).toBe(1);
    useCart.getState().setQty(key, 99);
    expect(useCart.getState().lines[0].qty).toBe(20);
    useCart.getState().remove(key);
    expect(useCart.getState().lines).toEqual([]);
  });

  it('giỏ được lưu vào localStorage và khôi phục khi tải lại trang', async () => {
    useCart.getState().add(latteM, 2);
    const saved = localStorage.getItem('brewlite-cart')!;
    expect(JSON.parse(saved).state.lines[0]).toMatchObject({ productId: 5, qty: 2 });

    // Mô phỏng tải lại trang: bộ nhớ trang mất, chỉ còn dữ liệu trong localStorage
    useCart.setState({ lines: [] });
    localStorage.setItem('brewlite-cart', saved);
    await useCart.persist.rehydrate();
    expect(useCart.getState().lines[0]).toMatchObject({ productId: 5, size: 'M', qty: 2 });
  });
});
