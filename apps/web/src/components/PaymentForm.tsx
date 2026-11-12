'use client';

import { useState } from 'react';
import { ProviderLogo, PROVIDERS } from '@/components/ProviderLogo';
import { formatVnd } from '@/lib/format';
import type { PaymentProvider } from '@/lib/types';

interface Props {
  total: number;
  submitting: boolean;
  error: string | null;
  onPay: (provider: PaymentProvider) => void;
}

/** Chọn cổng MoMo hoặc VNPay rồi sang trang thanh toán của cổng (FR-11). Dùng chung cho trang Thanh toán và thanh toán lại */
export function PaymentForm({ total, submitting, error, onPay }: Props) {
  const [provider, setProvider] = useState<PaymentProvider>('MOMO');
  const chosen = PROVIDERS[provider];

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 font-semibold">Thanh toán qua</legend>
        <div className="flex flex-col gap-2">
          {(Object.keys(PROVIDERS) as PaymentProvider[]).map((p) => (
            <label
              key={p}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-white px-4 py-3 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-crema ${
                provider === p ? '' : 'border-latte hover:bg-latte'
              }`}
              style={provider === p ? { borderColor: PROVIDERS[p].color } : undefined}
            >
              <input
                type="radio"
                name="provider"
                value={p}
                checked={provider === p}
                onChange={() => setProvider(p)}
                className="sr-only"
              />
              <ProviderLogo provider={p} />
              <span className="min-w-0">
                <span className="block font-semibold">{PROVIDERS[p].name}</span>
                <span className="text-sm text-roast">{PROVIDERS[p].hint}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-roast">
          Bạn sẽ được chuyển sang trang thanh toán của {chosen.name} (môi trường thử nghiệm, không trừ tiền thật).
        </p>
        <details className="mt-2 text-sm text-roast">
          <summary className="cursor-pointer">Thông tin thẻ thử nghiệm {chosen.name}</summary>
          <ul className="mt-1 list-disc pl-5">
            {chosen.testInfo.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      </fieldset>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => onPay(provider)}
        disabled={submitting}
        className="min-h-12 rounded-xl px-5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: chosen.color }}
      >
        {submitting ? `Đang chuyển sang ${chosen.name}…` : `Thanh toán ${formatVnd(total)} qua ${chosen.name}`}
      </button>
    </div>
  );
}
