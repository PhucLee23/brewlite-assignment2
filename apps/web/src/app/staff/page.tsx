'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatTime, StatusBadge } from '@/lib/order-status';
import type { Order, OrderStatus } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useAuth } from '@/store/auth';

type StaffOrder = Order & { user: { fullName: string } };

/** FR-19: 5 nhóm của màn hình quầy, theo thứ tự đơn đi qua quầy */
const TABS: { status: OrderStatus; label: string; empty: string }[] = [
  { status: 'PAID', label: 'Chờ pha', empty: 'Chưa có đơn nào chờ pha' },
  { status: 'PREPARING', label: 'Đang pha', empty: 'Không có đơn đang pha' },
  { status: 'READY', label: 'Sẵn sàng', empty: 'Không có đơn chờ khách nhận' },
  { status: 'COMPLETED', label: 'Đã giao', empty: 'Chưa giao đơn nào' },
  { status: 'CANCELLED', label: 'Đã hủy', empty: 'Không có đơn bị hủy' },
];

/** Nút chuyển sang trạng thái kế tiếp theo BR-06 */
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  PAID: { to: 'PREPARING', label: 'Bắt đầu pha' },
  PREPARING: { to: 'READY', label: 'Báo sẵn sàng' },
  READY: { to: 'COMPLETED', label: 'Đã giao nước' },
};

const REFRESH_MS = 10_000; // FR-19: tự làm mới tối thiểu mỗi 15 giây

// FR-19: màn hình quầy – đơn chia 5 nhóm, hàng chờ cũ nhất trước
export default function StaffPage() {
  const ready = useRequireAuth('STAFF');
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<OrderStatus>('PAID');
  const [error, setError] = useState<string | null>(null);
  const { data, isPending, isError, error: loadError, refetch } = useQuery({
    queryKey: ['staff-orders', tab],
    queryFn: () => api<StaffOrder[]>(`/orders?status=${tab}`, { auth: true }),
    enabled: ready,
    refetchInterval: REFRESH_MS,
  });
  const { data: counts } = useQuery({
    queryKey: ['staff-counts'],
    queryFn: () => api<Record<OrderStatus, number>>('/orders/counts', { auth: true }),
    enabled: ready,
    refetchInterval: REFRESH_MS,
  });

  const advance = useMutation({
    mutationFn: ({ id, to }: { id: number; to: OrderStatus }) =>
      api<Order>(`/orders/${id}/status`, { method: 'PATCH', auth: true, body: { status: to } }),
    onMutate: () => setError(null),
    onError: (e) => setError(e.message),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['staff-counts'] });
    },
  });

  // Đơn đã trả tiền nhưng chưa pha: hủy thì trả kho, thu hồi điểm, tiền hiện ở mục "Cần hoàn tiền" (FR-26)
  function cancel(order: StaffOrder) {
    if (window.confirm(`Hủy đơn #${order.id}? Nhớ hoàn lại ${order.total.toLocaleString('vi-VN')}đ cho khách tại quầy.`)) {
      advance.mutate({ id: order.id, to: 'CANCELLED' });
    }
  }

  if (user && user.role !== 'STAFF') {
    return <EmptyState message="Màn hình quầy chỉ dành cho nhân viên." />;
  }
  if (!ready) return <p className="py-10 text-center text-roast" role="status">Đang tải đơn cần pha…</p>;

  const current = TABS.find((t) => t.status === tab)!;

  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quầy pha chế</h1>
        <span className="text-xs text-roast">Tự làm mới mỗi 10 giây</span>
      </div>
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.status}
            type="button"
            role="tab"
            aria-selected={tab === t.status}
            onClick={() => {
              setTab(t.status);
              setError(null);
            }}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm ${
              tab === t.status ? 'bg-espresso font-semibold text-white' : 'bg-white text-espresso'
            }`}
          >
            {t.label} ({counts?.[t.status] ?? '…'})
          </button>
        ))}
      </div>
      {error && (
        <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {isPending ? (
        <p className="py-10 text-center text-roast" role="status">Đang tải đơn…</p>
      ) : isError ? (
        <ErrorState message={loadError.message} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState message={current.empty} />
      ) : (
        <ul className="space-y-3">
          {data.map((order) => {
            const next = NEXT[order.status];
            return (
              <li key={order.id} className="rounded-2xl bg-white p-4 border border-latte" data-testid={`staff-order-${order.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-bold">#{order.id}</span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-sm text-roast">
                  {order.user.fullName} · {formatTime(order.createdAt)}
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <strong>{item.qty}×</strong> {item.productName} – size {item.size}
                      {item.toppings.length > 0 && <span className="text-roast"> + {item.toppings.join(', ')}</span>}
                    </li>
                  ))}
                </ul>
                {next && (
                  <button
                    type="button"
                    disabled={advance.isPending}
                    onClick={() => advance.mutate({ id: order.id, to: next.to })}
                    className="mt-3 min-h-12 w-full rounded-xl bg-espresso font-semibold text-white disabled:opacity-50"
                  >
                    {next.label}
                  </button>
                )}
                {order.status === 'PAID' && (
                  <button
                    type="button"
                    disabled={advance.isPending}
                    onClick={() => cancel(order)}
                    className="mt-2 min-h-11 w-full rounded-xl border border-red-200 text-sm font-medium text-red-700 disabled:opacity-50"
                  >
                    Hủy đơn
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
