'use client';

import { useMounted } from '@/lib/use-mounted';
import { useAuth } from '@/store/auth';
import { CartLink } from './CartLink';
import { NavLink } from './NavLink';

/** Menu và Giỏ hàng trên header; khổ điện thoại không đủ chỗ thì nhân viên chỉ thấy Quầy, Kho, Doanh thu (NFR-08) */
export function ShopLinks() {
  const mounted = useMounted();
  const staff = useAuth((s) => s.user?.role === 'STAFF');

  return (
    <span className={`${mounted && staff ? 'hidden sm:flex' : 'flex'} items-center gap-1 sm:gap-3`}>
      <NavLink href="/">Menu</NavLink>
      <CartLink />
    </span>
  );
}
