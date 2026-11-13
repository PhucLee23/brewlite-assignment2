'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { api } from '@/lib/api';
import type { InventoryReport } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useAuth } from '@/store/auth';

/** Dưới ngưỡng này (số ly hoặc số phần) thì nhắc nhân viên sắp phải nhập thêm */
const LOW_STOCK = 10;

function level(count: number | null) {
  if (count === 0) return { label: 'Hết', style: 'bg-red-100 text-red-900' };
  if (count !== null && count < LOW_STOCK) return { label: 'Sắp hết', style: 'bg-amber-100 text-amber-900' };
  return null;
}

// FR-24: kho nguyên liệu – tồn từng nguyên liệu, số ly còn bán được của từng món, nhập thêm hàng
export default function IngredientsPage() {
  const ready = useRequireAuth('STAFF');
  const user = useAuth((s) => s.user);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => api<InventoryReport>('/ingredients', { auth: true }),
    enabled: ready,
    // Tự làm mới để thấy nguyên liệu giảm ngay khi khách đặt đơn
    refetchInterval: 5000,
  });

  if (user && user.role !== 'STAFF') return <EmptyState message="Trang Kho chỉ dành cho nhân viên." />;
  if (!ready || isPending) return <p className="py-10 text-center text-roast" role="status">Đang tải kho…</p>;
  if (isError) return <ErrorState message={error.message} onRetry={() => void refetch()} />;

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Kho nguyên liệu</h1>
      <p className="mt-1 text-sm text-roast">
        Mỗi món có công thức nguyên liệu. Đặt đơn thì trừ nguyên liệu, hủy đơn thì trả lại, nhập kho thì cộng thêm; số ly
        còn bán được tính từ nguyên liệu hết trước.
      </p>

      <h2 className="mt-6 text-lg font-semibold">Số ly còn bán được (size S)</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {data.products.map((p) => {
          const badge = level(p.stock);
          return (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-latte bg-white p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{p.name}</p>
                {p.limitedBy && <p className="truncate text-xs text-roast">Hết trước: {p.limitedBy}</p>}
              </div>
              <div className="flex flex-none items-center gap-2">
                {badge && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.style}`}>{badge.label}</span>}
                <span className="font-semibold">{p.stock} ly</span>
              </div>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Nguyên liệu</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {data.ingredients.map((i) => {
          const badge = level(i.servings);
          return (
            <li key={i.id} className="rounded-2xl border border-latte bg-white p-3" data-testid={`ingredient-${i.id}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{i.name}</p>
                  <p className="text-xs text-roast">Dùng cho: {i.usedBy.length ? i.usedBy.join(', ') : 'chưa có món nào'}</p>
                </div>
                <div className="flex flex-none flex-col items-end gap-1">
                  <span className="font-semibold">
                    {i.stock.toLocaleString('vi-VN')} {i.unit}
                  </span>
                  {badge && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.style}`}>{badge.label}</span>}
                </div>
              </div>
              <RestockForm id={i.id} name={i.name} unit={i.unit} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Ô nhập thêm hàng của một nguyên liệu; nhập xong thì làm mới cả trang Kho để số ly các món tăng theo */
function RestockForm({ id, name, unit }: { id: number; name: string; unit: string }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [added, setAdded] = useState<number | null>(null);

  const restock = useMutation({
    mutationFn: (value: number) => api(`/ingredients/${id}/restock`, { method: 'POST', auth: true, body: { amount: value } }),
    onSuccess: (_, value) => {
      setAmount('');
      setAdded(value);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ingredients'] }),
  });

  const value = Number(amount);
  const valid = Number.isInteger(value) && value > 0;

  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) restock.mutate(value);
      }}
    >
      <label className="flex items-center gap-1.5 rounded-xl border border-latte px-2.5 py-1.5 text-sm focus-within:border-crema">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setAdded(null);
          }}
          placeholder="Số lượng"
          aria-label={`Số lượng ${name} nhập thêm (${unit})`}
          className="w-24 bg-transparent outline-none"
        />
        <span className="text-roast">{unit}</span>
      </label>
      <button
        type="submit"
        disabled={!valid || restock.isPending}
        className="min-h-9 rounded-xl bg-espresso px-3 text-sm font-medium text-foam hover:bg-roast disabled:cursor-not-allowed disabled:opacity-50"
      >
        {restock.isPending ? 'Đang nhập…' : 'Nhập kho'}
      </button>
      {added !== null && (
        <span className="text-sm text-green-700" role="status">
          Đã nhập thêm {added.toLocaleString('vi-VN')} {unit}
        </span>
      )}
      {restock.isError && (
        <span className="text-sm text-red-700" role="alert">
          {restock.error.message}
        </span>
      )}
    </form>
  );
}
