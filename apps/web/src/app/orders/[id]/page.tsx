'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProviderLogo } from '@/components/ProviderLogo';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { api, ApiError } from '@/lib/api';
import { formatVnd } from '@/lib/format';
import { CANCELLABLE, formatTime, StatusBadge } from '@/lib/order-status';
import type { Order } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';

// Đơn đang được xử lý thì tự cập nhật trạng thái để khách thấy khi nước sẵn sàng (FR-14, FR-22)
const LIVE: Order['status'][] = ['PENDING', 'PAID', 'PREPARING'];

// FR-14, FR-15, FR-16: màn hình xác nhận và chi tiết đơn
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const ready = useRequireAuth();
  const queryClient = useQueryClient();
  const { data: order, isPending, isError, error, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api<Order>(`/orders/${id}`, { auth: true }),
    enabled: ready,
    refetchInterval: (q) => (q.state.data && LIVE.includes(q.state.data.status) ? 5000 : false),
  });

  const cancel = useMutation({
    mutationFn: () => api<Order>(`/orders/${id}/cancel`, { method: 'POST', auth: true }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['orders', 'me'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  if (!ready || isPending) return <p className="py-10 text-center text-roast" role="status">Đang tải đơn hàng…</p>;
  if (isError) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      return (
        <EmptyState message="Không tìm thấy đơn hàng">
          <Link href="/orders" className="mt-4 inline-block font-semibold text-roast underline">
            Về danh sách đơn
          </Link>
        </EmptyState>
      );
    }
    return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  }

  const earned = order.loyalty.find((l) => l.type === 'EARN')?.points ?? 0;
  const paidLike = ['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(order.status);

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      {paidLike && (
        <div className="rounded-2xl bg-green-50 p-4 text-green-900" role="status">
          <p className="text-lg font-bold">{order.status === 'READY' ? 'Nước của bạn đã sẵn sàng!' : 'Đặt món thành công'}</p>
          <p className="mt-1 text-sm">
            Mã đơn <strong>#{order.id}</strong>. {order.status === 'COMPLETED' ? 'Cảm ơn bạn!' : 'Vui lòng tới quầy và đọc mã đơn để nhận nước.'}
          </p>
          {earned > 0 && <p className="mt-1 text-sm">Bạn vừa được cộng {earned} điểm thưởng.</p>}
        </div>
      )}
      {order.status === 'PAYMENT_FAILED' && (
        <div className="rounded-2xl bg-red-50 p-4 text-red-800" role="alert">
          Thanh toán chưa thành công. Giỏ hàng của bạn vẫn được giữ nguyên, bạn có thể thanh toán lại cho đơn này.
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 border border-latte">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Đơn #{order.id}</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="text-sm text-roast">{formatTime(order.createdAt)}</p>

        <ul className="mt-3 divide-y divide-latte">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-2 text-sm">
              <span>
                <strong>{item.qty}×</strong> {item.productName} (size {item.size})
                {item.toppings.length > 0 && <span className="block text-roast">+ {item.toppings.join(', ')}</span>}
              </span>
              <span className="shrink-0">{formatVnd(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-1 border-t border-latte pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Tạm tính</dt>
            <dd>{formatVnd(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>Giảm giá ({order.promotionCode})</dt>
              <dd>−{formatVnd(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <dt>Tổng tiền</dt>
            <dd data-testid="order-total">{formatVnd(order.total)}</dd>
          </div>
        </dl>
      </div>

      {order.payments.length > 0 && (
        // FR-26: bằng chứng giao dịch do cổng xác nhận
        <Link
          href={`/payments/${order.payments[0].id}/receipt`}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-latte bg-white font-semibold text-espresso hover:bg-latte"
        >
          <ProviderLogo provider={order.payments[0].provider} small />
          Xem biên lai thanh toán
        </Link>
      )}
      {cancel.isError && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
          {cancel.error.message}
        </p>
      )}
      {(order.status === 'PENDING' || order.status === 'PAYMENT_FAILED') && (
        <Link
          href={`/checkout?orderId=${order.id}`}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-espresso font-semibold text-white"
        >
          Thanh toán lại
        </Link>
      )}
      {CANCELLABLE.includes(order.status) && (
        <button
          type="button"
          disabled={cancel.isPending}
          onClick={() => {
            if (window.confirm(`Hủy đơn #${order.id}?`)) cancel.mutate();
          }}
          className="min-h-12 w-full rounded-xl border border-red-200 bg-white font-semibold text-red-700 disabled:opacity-50"
        >
          Hủy đơn
        </button>
      )}
      <Link href="/orders" className="block text-center text-sm font-medium text-roast underline">
        Xem tất cả đơn hàng
      </Link>
    </section>
  );
}
