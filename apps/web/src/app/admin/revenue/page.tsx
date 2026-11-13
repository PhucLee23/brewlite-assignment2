'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { ProviderLogo, PROVIDERS } from '@/components/ProviderLogo';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatVnd } from '@/lib/format';
import { formatTime } from '@/lib/order-status';
import type { PaymentDisplayStatus, PaymentProvider } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useAuth } from '@/store/auth';

interface Transaction {
  id: number;
  orderId: number;
  amount: number;
  provider: PaymentProvider;
  displayStatus: PaymentDisplayStatus;
  gatewayOrderId: string;
  gatewayRef: string | null;
  bankCode: string | null;
  payType: string | null;
  createdAt: string;
  confirmedAt: string | null;
  customer: { fullName: string; email: string };
}

interface TransactionList {
  received: number;
  refundDue: { count: number; amount: number };
  count: number;
  payments: Transaction[];
}

const LABEL: Record<PaymentDisplayStatus, string> = {
  SUCCESS: 'Thành công',
  REFUND_DUE: 'Cần hoàn tiền',
  PROCESSING: 'Đang chờ',
  FAILED: 'Thất bại',
  EXPIRED: 'Hết hạn',
};

const BADGE: Record<PaymentDisplayStatus, string> = {
  SUCCESS: 'bg-emerald-100 text-emerald-900',
  REFUND_DUE: 'bg-orange-100 text-orange-900',
  PROCESSING: 'bg-amber-100 text-amber-900',
  FAILED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-stone-100 text-stone-500',
};

const AMOUNT: Partial<Record<PaymentDisplayStatus, string>> = {
  SUCCESS: 'text-emerald-700',
  REFUND_DUE: 'text-orange-700 line-through',
};

const FILTERS: (PaymentDisplayStatus | null)[] = [null, 'SUCCESS', 'REFUND_DUE', 'PROCESSING', 'FAILED', 'EXPIRED'];

// FR-26: nhân viên xem giao dịch; tiền chỉ được tính khi cổng xác nhận thành công và đơn không bị hủy
export default function RevenuePage() {
  const ready = useRequireAuth('STAFF');
  const user = useAuth((s) => s.user);
  const [filter, setFilter] = useState<PaymentDisplayStatus | null>(null);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['payments', filter],
    queryFn: () => api<TransactionList>(`/payments${filter ? `?status=${filter}` : ''}`, { auth: true }),
    enabled: ready,
    // Tự làm mới để thấy tiền vào ngay khi cổng xác nhận
    refetchInterval: 5000,
    placeholderData: keepPreviousData,
  });

  if (user && user.role !== 'STAFF') return <EmptyState message="Trang Doanh thu chỉ dành cho nhân viên." />;
  if (!ready) return null;

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Doanh thu</h1>
      <p className="mt-1 text-sm text-roast">
        Tiền chỉ được tính khi cổng MoMo hoặc VNPay xác nhận thanh toán thành công và đơn không bị hủy.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-espresso p-4 text-foam">
          <p className="text-sm opacity-80">Tiền đã vào</p>
          <p className="mt-1 text-2xl font-bold" data-testid="received">
            {data ? formatVnd(data.received) : '…'}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 ${
            data && data.refundDue.count > 0 ? 'border-orange-300 bg-orange-50 text-orange-900' : 'border-latte bg-white'
          }`}
          data-testid="refund-due"
        >
          <p className="text-sm">Cần hoàn tiền tại quầy ({data?.refundDue.count ?? 0} đơn đã hủy)</p>
          <p className="mt-1 text-2xl font-bold">{data ? formatVnd(data.refundDue.amount) : '…'}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Lọc theo trạng thái">
        {FILTERS.map((f) => (
          <button
            key={f ?? 'ALL'}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`min-h-9 rounded-full border px-3 text-sm ${
              filter === f ? 'border-espresso bg-espresso text-foam' : 'border-latte bg-white hover:bg-latte'
            }`}
          >
            {f ? LABEL[f] : 'Tất cả'}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {isPending ? (
          <p className="py-6 text-center text-roast" role="status">
            Đang tải giao dịch…
          </p>
        ) : isError ? (
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        ) : data.payments.length === 0 ? (
          <EmptyState message="Chưa có giao dịch nào" />
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {data.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 rounded-2xl border border-latte bg-white p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProviderLogo provider={p.provider} small />
                    <div className="min-w-0">
                      <p className="truncate font-mono font-semibold">{p.gatewayRef ?? noRefLabel(p.displayStatus, p.id)}</p>
                      <p className="truncate text-sm text-roast">
                        Đơn #{p.orderId} · {p.customer.fullName}
                        {p.bankCode || p.payType
                          ? ` · ${[p.bankCode, p.payType?.toUpperCase()].filter(Boolean).join(' ')}`
                          : ''}
                      </p>
                      <p className="text-xs text-roast">
                        {p.confirmedAt
                          ? `${PROVIDERS[p.provider].name} xác nhận lúc ${formatTime(p.confirmedAt)}`
                          : `Mở phiên lúc ${formatTime(p.createdAt)}`}
                      </p>
                      {p.displayStatus === 'REFUND_DUE' && (
                        <p className="mt-1 text-sm font-medium text-orange-700">Đơn đã hủy – cần hoàn tiền cho khách</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-1">
                    <span className={`font-semibold ${AMOUNT[p.displayStatus] ?? 'text-roast'}`}>
                      {p.displayStatus === 'SUCCESS' ? '+' : ''}
                      {formatVnd(p.amount)}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE[p.displayStatus]}`}>
                      {LABEL[p.displayStatus]}
                    </span>
                    {p.confirmedAt && (
                      <Link href={`/payments/${p.id}/receipt`} className="text-xs font-medium underline">
                        Biên lai
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {data.count > 100 && (
              <p className="mt-3 text-center text-sm text-roast">
                Có {data.count} giao dịch, đang hiện 100 giao dịch gần nhất.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** Phiên chưa kết thúc thì chưa có mã giao dịch của cổng; giao dịch không có mã thì hiện mã nội bộ */
function noRefLabel(status: PaymentDisplayStatus, id: number) {
  return status === 'PROCESSING' || status === 'EXPIRED' ? 'Chưa có mã giao dịch' : `Giao dịch #${id}`;
}
