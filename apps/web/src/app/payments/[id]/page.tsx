'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { PaymentForm } from '@/components/PaymentForm';
import { ProviderLogo, PROVIDERS } from '@/components/ProviderLogo';
import { ErrorState } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatVnd } from '@/lib/format';
import { forgetCartOrder, isCartOrder } from '@/lib/idempotency';
import { startPayment } from '@/lib/payment';
import type { PaymentProvider, PaymentSession } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useAuth, type SessionUser } from '@/store/auth';
import { useCart } from '@/store/cart';

const POLL_MS = 1500; // FR-11: hỏi kết quả mỗi 1,5 giây; API tự tra cứu cổng nên trả bằng app trên điện thoại vẫn thấy

export default function PaymentPage() {
  return (
    <Suspense fallback={<Waiting label="Đang mở phiên thanh toán…" />}>
      <PaymentStatus />
    </Suspense>
  );
}

/**
 * UC-06 bước 10–13: trang chờ kết quả. Cổng MoMo/VNPay chuyển khách về đây kèm kết quả có chữ ký;
 * trang chỉ chuyển tham số đó cho API, API kiểm tra chữ ký và hỏi lại cổng rồi mới đổi trạng thái đơn (BR-07).
 */
function PaymentStatus() {
  const { id } = useParams<{ id: string }>();
  const ready = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const clearCart = useCart((s) => s.clear);
  const updateUser = useAuth((s) => s.updateUser);
  const [now, setNow] = useState(() => Date.now());
  const [returnError, setReturnError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Tham số cổng gắn vào link khi chuyển khách về (VNPay: vnp_*, MoMo: partnerCode, signature…)
  const callback = Object.fromEntries(searchParams.entries());
  const fromGateway = 'vnp_SecureHash' in callback || ('partnerCode' in callback && 'signature' in callback);
  const sent = useRef(false);

  useEffect(() => {
    if (!ready || !fromGateway || sent.current) return;
    sent.current = true;
    api<PaymentSession>(`/payments/${id}/return`, { method: 'POST', auth: true, body: { params: callback } })
      .then((session) => queryClient.setQueryData(['payment', id], session))
      .catch((e: Error) => setReturnError(e.message))
      // Bỏ tham số khỏi thanh địa chỉ để tải lại trang không gửi lại kết quả cũ
      .finally(() => router.replace(`/payments/${id}`));
  }, [ready, fromGateway]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => api<PaymentSession>(`/payments/${id}`, { auth: true }),
    enabled: ready && !fromGateway,
    // Phiên còn mở thì tiếp tục hỏi
    refetchInterval: (q) => (q.state.data?.paymentUrl ? POLL_MS : false),
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Thành công: xóa giỏ (nếu đơn tạo từ giỏ hiện tại), cập nhật điểm trên header, sang màn hình xác nhận (FR-14)
  const paidOrderId = data?.order.status === 'PAID' ? data.orderId : null;
  useEffect(() => {
    if (!paidOrderId) return;
    if (isCartOrder(paidOrderId)) {
      clearCart();
      forgetCartOrder();
    }
    api<SessionUser>('/auth/me', { auth: true })
      .then((me) => updateUser({ loyaltyPoints: me.loyaltyPoints }))
      .catch(() => undefined);
    router.replace(`/orders/${paidOrderId}`);
  }, [paidOrderId, clearCart, updateUser, router]);

  const pay = async (provider: PaymentProvider) => {
    setBusy(true);
    setPayError(null);
    try {
      await startPayment(data!.orderId, provider);
    } catch (e) {
      setPayError((e as Error).message);
      setBusy(false);
    }
  };

  if (!ready || fromGateway) return <Waiting label="Đang xác nhận kết quả với cổng thanh toán…" />;
  if (isPending) return <Waiting label="Đang mở phiên thanh toán…" />;
  if (isError) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  if (data.order.status === 'PAID') return <Waiting label="Thanh toán thành công, đang mở đơn hàng…" />;

  const brand = PROVIDERS[data.provider];
  const secondsLeft = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - now) / 1000));
  const unpaid = data.order.status === 'PENDING' || data.order.status === 'PAYMENT_FAILED';

  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-latte bg-white">
      {/* Thanh tiêu đề theo màu của cổng, giống trang thanh toán của MoMo/VNPay */}
      <div className="flex items-center gap-3 px-5 py-4 text-white" style={{ background: brand.color }}>
        <ProviderLogo provider={data.provider} />
        <div>
          <p className="font-semibold">Cổng thanh toán {brand.name}</p>
          <p className="text-xs opacity-80">Môi trường thử nghiệm (sandbox)</p>
        </div>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[1fr_1.1fr]">
        <section className="rounded-2xl bg-foam p-4">
          <h2 className="font-semibold">Thông tin đơn hàng</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <Row label="Nhà cung cấp" value="BrewLite" />
            <Row label="Mã đơn hàng" value={`#${data.orderId}`} />
            <Row label={`Mã giao dịch gửi ${brand.name}`} value={data.gatewayOrderId} mono />
            <div>
              <dt className="text-roast">Số tiền</dt>
              <dd className="text-2xl font-bold" style={{ color: brand.color }} data-testid="payment-amount">
                {formatVnd(data.amount)}
              </dd>
            </div>
          </dl>
          {data.paymentUrl && (
            <p className="mt-4 text-sm">
              Đơn hàng sẽ hết hạn sau{' '}
              <b className="rounded bg-espresso px-1.5 py-0.5 font-mono text-foam">
                {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
              </b>
            </p>
          )}
        </section>

        <section className="flex flex-col justify-center">
          {returnError && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {returnError}
            </p>
          )}
          {data.paymentUrl ? (
            <>
              <h1 className="text-xl font-bold">Đang chờ {brand.name} xác nhận</h1>
              <p className="mt-2 text-sm text-roast">
                Hoàn tất trên trang {brand.name}. Nếu bạn đã trả bằng app trên điện thoại, trang này tự cập nhật khi {brand.name}{' '}
                xác nhận.
              </p>
              <p className="mt-4 flex items-center gap-2 text-sm text-roast" role="status">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
                Đang kiểm tra với {brand.name}…
              </p>
              <a
                href={data.paymentUrl}
                className="mt-5 flex min-h-12 items-center justify-center rounded-xl px-5 text-center font-semibold text-white hover:opacity-90"
                style={{ background: brand.color }}
              >
                Tiếp tục thanh toán trên {brand.name}
              </a>
              <Link
                href={`/orders/${data.orderId}`}
                className="mt-3 flex min-h-12 items-center justify-center rounded-xl border border-espresso/20 bg-white px-5 font-medium text-espresso hover:bg-latte"
              >
                Xem đơn hàng
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold">
                {data.order.status === 'PAYMENT_FAILED'
                  ? 'Thanh toán không thành công'
                  : data.order.status === 'PENDING'
                    ? 'Phiên thanh toán đã hết hạn'
                    : `Đơn #${data.orderId} không còn chờ thanh toán`}
              </h1>
              {unpaid ? (
                <>
                  <p className="mb-4 mt-2 text-sm text-roast">
                    Đơn #{data.orderId} chưa được thanh toán, giỏ hàng vẫn giữ nguyên. Chọn cổng để thanh toán lại.
                  </p>
                  <PaymentForm total={data.order.total} submitting={busy} error={payError} onPay={(p) => void pay(p)} />
                </>
              ) : (
                <Link
                  href={`/orders/${data.orderId}`}
                  className="mt-4 flex min-h-12 items-center justify-center rounded-xl border border-espresso/20 bg-white px-5 font-medium text-espresso hover:bg-latte"
                >
                  Xem đơn hàng
                </Link>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Waiting({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-roast">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-crema border-t-transparent" />
      {label}
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-roast">{label}</dt>
      <dd className={`font-semibold ${mono ? 'break-all font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
