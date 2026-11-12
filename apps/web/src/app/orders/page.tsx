'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatVnd } from '@/lib/format';
import { formatTime, StatusBadge } from '@/lib/order-status';
import type { Order } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';

// FR-15: lịch sử đơn của khách, mới nhất trước
export default function OrdersPage() {
  const ready = useRequireAuth();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['orders', 'me'],
    queryFn: () => api<Order[]>('/orders/me', { auth: true }),
    enabled: ready,
  });

  if (!ready || isPending) return <p className="py-10 text-center text-roast" role="status">Đang tải đơn hàng…</p>;
  if (isError) return <ErrorState message={error.message} onRetry={() => void refetch()} />;

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Đơn hàng của tôi</h1>
      {data.length === 0 ? (
        <EmptyState message="Bạn chưa có đơn hàng nào">
          <Link href="/" className="mt-4 inline-block rounded-xl bg-espresso px-5 py-3 font-medium text-white">
            Đặt món ngay
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {data.map((order) => (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className="block rounded-2xl bg-white p-4 border border-latte transition hover:border-crema">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">Đơn #{order.id}</span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 truncate text-sm text-roast">
                  {order.items.map((i) => `${i.qty}× ${i.productName}`).join(', ')}
                </p>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-roast">{formatTime(order.createdAt)}</span>
                  <span className="font-semibold">{formatVnd(order.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
