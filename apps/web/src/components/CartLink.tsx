'use client';

import { useMounted } from '@/lib/use-mounted';
import { cartCount, useCart } from '@/store/cart';
import { NavLink } from './NavLink';

/** Nút giỏ hàng trên header, số ly cập nhật ngay khi giỏ thay đổi (FR-04) */
export function CartLink() {
  const mounted = useMounted();
  const count = useCart((s) => cartCount(s.lines));

  return (
    <NavLink href="/cart" className="relative" aria-label="Giỏ hàng">
      Giỏ hàng
      {mounted && count > 0 && (
        <span
          data-testid="cart-count"
          className="absolute -right-1.5 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-crema px-1 text-xs font-semibold text-white"
        >
          {count}
        </span>
      )}
    </NavLink>
  );
}
