'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { PaymentForm } from '@/components/PaymentForm';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatVnd } from '@/lib/format';
import { orderKeyFor, rememberCartOrder } from '@/lib/idempotency';
import { startPayment } from '@/lib/payment';
import type { Order, PaymentProvider } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';
import { cartTotal, useCart } from '@/store/cart';

interface PromotionResult {
  code: string;
  valid: boolean;
  discount?: number;
  reason?: string;
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  );
}

// UC-06: áp mã giảm giá, chọn cổng MoMo hoặc VNPay, tạo đơn rồi sang trang thanh toán của cổng (FR-08, FR-09, FR-11)
function Checkout() {
  const ready = useRequireAuth();
  const retryOrderId = useSearchParams().get('orderId');
  const lines = useCart((s) => s.lines);
  const [code, setCode] = useState('');
  const [promotion, setPromotion] = useState<PromotionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // A5: thanh toán lại một đơn đã có (PENDING / PAYMENT_FAILED), không tạo đơn mới
  const existing = useQuery({
    queryKey: ['order', retryOrderId],
    queryFn: () => api<Order>(`/orders/${retryOrderId}`, { auth: true }),
    enabled: ready && !!retryOrderId,
  });

  if (!ready) return null;
  if (retryOrderId && existing.isPending) return <p className="py-10 text-center" role="status">Đang tải đơn hàng…</p>;
  if (retryOrderId && existing.isError) return <ErrorState message={existing.error.message} onRetry={() => void existing.refetch()} />;
  if (!retryOrderId && lines.length === 0) {
    return (
      <EmptyState message="Giỏ hàng đang trống">
        <Link href="/" className="mt-4 inline-block rounded-xl bg-espresso px-5 py-3 font-medium text-white">
          Xem menu
        </Link>
      </EmptyState>
    );
  }

  const order = existing.data;
  const subtotal = order ? order.subtotal : cartTotal(lines);
  const discount = order ? order.discount : promotion?.valid ? (promotion.discount ?? 0) : 0;
  const total = subtotal - discount;

  const applyCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setPromotion(null);
    try {
      setPromotion(await api<PromotionResult>(`/promotions/${encodeURIComponent(code.trim())}?subtotal=${subtotal}`));
    } catch (err) {
      setPromotion({ code, valid: false, reason: (err as Error).message });
    }
  };

  const pay = async (provider: PaymentProvider) => {
    setSubmitting(true);
    setError(null);
    try {
      let orderId = order?.id;
      if (!orderId) {
        const promotionCode = promotion?.valid ? promotion.code : '';
        const created = await api<Order>('/orders', {
          method: 'POST',
          auth: true,
          idempotencyKey: orderKeyFor(lines, promotionCode),
          body: {
            items: lines.map((l) => ({ productId: l.productId, size: l.size, toppingIds: l.toppings.map((t) => t.id), qty: l.qty })),
            ...(promotionCode ? { promotionCode } : {}),
          },
        });
        orderId = created.id;
        rememberCartOrder(orderId);
      }
      // Sang trang của cổng; giỏ hàng giữ nguyên, chỉ xóa khi cổng đã xác nhận thanh toán thành công
      await startPayment(orderId, provider);
    } catch (e) {
      // Giỏ hàng giữ nguyên để khách sửa hoặc thử lại (UC-06, E1 – E8)
      setError((e as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-[1fr_1.1fr]">
      <section>
        <h1 className="mb-4 text-2xl font-bold">{order ? `Thanh toán lại đơn #${order.id}` : 'Thanh toán'}</h1>
        <ul className="divide-y divide-latte rounded-2xl border border-latte bg-white">
          {order
            ? order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 p-3 text-sm">
                  <span>
                    <span className="font-medium">
                      {i.productName} {i.size} × {i.qty}
                    </span>
                    {i.toppings.length > 0 && <span className="block text-roast">{i.toppings.join(', ')}</span>}
                  </span>
                  <span className="whitespace-nowrap">{formatVnd(i.lineTotal)}</span>
                </li>
              ))
            : lines.map((l) => (
                <li key={l.key} className="flex justify-between gap-3 p-3 text-sm">
                  <span>
                    <span className="font-medium">
                      {l.name} {l.size} × {l.qty}
                    </span>
                    {l.toppings.length > 0 && <span className="block text-roast">{l.toppings.map((t) => t.name).join(', ')}</span>}
                  </span>
                  <span className="whitespace-nowrap">{formatVnd(l.unitPrice * l.qty)}</span>
                </li>
              ))}
        </ul>

        {!order && (
          <>
            <form onSubmit={(e) => void applyCode(e)} className="mt-4 flex gap-2">
              <input
                id="promo"
                aria-label="Mã giảm giá"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setPromotion(null);
                }}
                placeholder="Mã giảm giá (VD: BREW10)"
                maxLength={30}
                className="min-h-11 w-full min-w-0 rounded-xl border border-latte bg-white px-3.5 outline-none focus:border-crema focus:ring-2 focus:ring-crema/30"
              />
              <button
                type="submit"
                className="min-h-11 whitespace-nowrap rounded-xl border border-espresso/20 bg-white px-4 font-medium text-espresso hover:bg-latte"
              >
                Áp dụng
              </button>
            </form>
            {promotion && !promotion.valid && (
              <p className="mt-2 text-sm text-red-700" role="status">
                {promotion.reason}
              </p>
            )}
            {promotion?.valid && (
              <p className="mt-2 flex justify-between text-sm text-green-700" role="status">
                <span>
                  Đã áp mã <b>{promotion.code}</b>: giảm {formatVnd(promotion.discount ?? 0)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPromotion(null);
                    setCode('');
                  }}
                  className="underline"
                >
                  Bỏ mã
                </button>
              </p>
            )}
          </>
        )}

        <dl className="mt-4 space-y-1 border-t border-latte pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-roast">Tạm tính</dt>
            <dd>{formatVnd(subtotal)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>Giảm giá</dt>
              <dd>−{formatVnd(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-2 text-lg font-bold">
            <dt>Tổng</dt>
            <dd data-testid="checkout-total">{formatVnd(total)}</dd>
          </div>
        </dl>
        {!order && <p className="mt-1 text-xs text-roast">Số tiền cuối cùng do hệ thống tính lại khi tạo đơn.</p>}
      </section>

      <section className="rounded-2xl border border-latte bg-white p-5">
        <PaymentForm total={total} submitting={submitting} error={error} onPay={(p) => void pay(p)} />
      </section>
    </div>
  );
}
