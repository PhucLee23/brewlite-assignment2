'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMounted } from '@/lib/use-mounted';
import { isTokenExpired, useAuth } from '@/store/auth';
import { NavLink } from './NavLink';

/** Đăng nhập / tài khoản trên header; token hết hạn thì tự đăng xuất (FR-07) */
export function AccountMenu() {
  const mounted = useMounted();
  const { token, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (token && isTokenExpired(token)) logout();
  }, [token, logout]);

  if (!mounted) return null;
  if (!user) {
    return (
      <Link href="/login" className="ml-1 rounded-lg bg-espresso px-3 py-1.5 font-medium text-foam hover:bg-roast">
        Đăng nhập
      </Link>
    );
  }
  return (
    <>
      {/* Nhân viên cũng mua được nên vẫn có Đơn hàng; khổ điện thoại không đủ chỗ thì nhân viên chỉ thấy Quầy */}
      <NavLink href="/orders" className={user.role === 'STAFF' ? 'hidden sm:inline' : ''}>
        Đơn hàng
      </NavLink>
      {user.role === 'STAFF' && <NavLink href="/staff">Quầy</NavLink>}
      <div className="flex items-center gap-2 sm:ml-1 sm:border-l sm:border-latte sm:pl-3">
        <span className="hidden text-right leading-tight sm:block">
          <span className="block font-medium">{user.fullName}</span>
          <span className="block text-xs text-roast">
            <span data-testid="loyalty-points">{user.loyaltyPoints}</span> điểm thưởng
          </span>
        </span>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="rounded-lg px-2 py-1.5 text-roast hover:bg-latte"
        >
          Đăng xuất
        </button>
      </div>
    </>
  );
}
