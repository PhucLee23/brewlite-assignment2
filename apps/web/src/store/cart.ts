import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Size } from '@/lib/types';

export const MAX_QTY_PER_LINE = 20; // BR-03

export interface CartTopping {
  id: number;
  name: string;
  price: number;
}

export interface CartLine {
  /** Cùng món, cùng size, cùng bộ topping thì cùng key và được gộp thành một dòng (FR-04) */
  key: string;
  productId: number;
  name: string;
  imageUrl: string;
  size: Size;
  toppings: CartTopping[];
  /** Đơn giá tham khảo để hiển thị; số tiền thật do server tính khi đặt đơn (BR-02) */
  unitPrice: number;
  qty: number;
}

export type NewCartLine = Omit<CartLine, 'key' | 'qty'>;

interface CartState {
  lines: CartLine[];
  add: (line: NewCartLine, qty: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

export function lineKey(productId: number, size: Size, toppingIds: number[]): string {
  return `${productId}|${size}|${[...toppingIds].sort((a, b) => a - b).join(',')}`;
}

const clampQty = (qty: number) => Math.max(1, Math.min(MAX_QTY_PER_LINE, Math.floor(qty)));

// Lưu bằng localStorage nên tải lại trang hay đóng mở trình duyệt vẫn còn giỏ (FR-04)
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line, qty) =>
        set((state) => {
          const key = lineKey(line.productId, line.size, line.toppings.map((t) => t.id));
          const existing = state.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: state.lines.map((l) => (l.key === key ? { ...l, qty: clampQty(l.qty + qty) } : l)),
            };
          }
          return { lines: [...state.lines, { ...line, key, qty: clampQty(qty) }] };
        }),
      setQty: (key, qty) =>
        set((state) => ({ lines: state.lines.map((l) => (l.key === key ? { ...l, qty: clampQty(qty) } : l)) })),
      remove: (key) => set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'brewlite-cart', storage: createJSONStorage(() => localStorage) },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.qty, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);

/** Số ly của một món đang có trong giỏ, cộng mọi size và topping (FR-05) */
export const qtyOfProduct = (lines: CartLine[], productId: number) =>
  lines.filter((l) => l.productId === productId).reduce((sum, l) => sum + l.qty, 0);
