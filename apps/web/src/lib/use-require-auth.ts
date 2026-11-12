'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isTokenExpired, useAuth } from '@/store/auth';
import { useMounted } from './use-mounted';

/**
 * Trang cần đăng nhập (thanh toán, đơn hàng): chưa đăng nhập hoặc token hết hạn thì chuyển tới trang
 * đăng nhập, đăng nhập xong quay lại đúng trang này (FR-07, luồng A1 của UC-06).
 * Trả về true khi đã sẵn sàng hiển thị nội dung cần đăng nhập.
 */
export function useRequireAuth(role?: 'STAFF'): boolean {
  const mounted = useMounted();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();

  const valid = !!token && !isTokenExpired(token);
  useEffect(() => {
    if (!mounted || valid) return;
    if (token) logout();
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [mounted, valid, token, logout, router, pathname]);

  return mounted && valid && (!role || user?.role === role);
}
