'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const BASE = 'rounded-lg px-2 py-1.5 hover:bg-latte';
// Gạch chân mục đang mở để khách biết mình đang ở trang nào
const ACTIVE = 'font-semibold underline decoration-2 underline-offset-[6px]';

type Props = Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string };

/** Link trên header; mục Menu sáng cả khi đang xem chi tiết món */
export function NavLink({ href, className = '', children, ...rest }: Props) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' || pathname.startsWith('/products') : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`${BASE} ${active ? ACTIVE : ''} ${className}`}
      aria-current={active ? 'page' : undefined}
      {...rest}
    >
      {children}
    </Link>
  );
}
