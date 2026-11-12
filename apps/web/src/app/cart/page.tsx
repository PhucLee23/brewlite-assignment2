'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { EmptyState } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatVnd } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useMounted } from '@/lib/use-mounted';
import { cartTotal, MAX_QTY_PER_LINE, qtyOfProduct, useCart } from '@/store/cart';

// FR-04, FR-05: trang giỏ hàng – sửa số lượng, xóa, tổng tiền, chặn vượt tồn kho
export default function CartPage() {
  const mounted = useMounted();
  const { lines, setQty, remove } = useCart();
  // Tồn kho hiện tại để chặn đặt quá số còn lại
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => api<Product[]>('/products') });
  const stockOf = (productId: number) => products?.find((p) => p.id === productId)?.stock;

  if (!mounted) return null;
  if (lines.length === 0) {
    return (
      <EmptyState message="Giỏ hàng đang trống">
        <Link href="/" className="mt-4 inline-block rounded-xl bg-espresso px-5 py-2.5 font-medium text-foam">
          Xem menu
        </Link>
      </EmptyState>
    );
  }

  const overStock = (productId: number) => {
    const stock = stockOf(productId);
    return stock !== undefined && qtyOfProduct(lines, productId) > stock;
  };
  const blocked = lines.some((l) => overStock(l.productId));
  const total = cartTotal(lines);

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Giỏ hàng</h1>
      <ul className="divide-y divide-latte rounded-2xl border border-latte bg-white">
        {lines.map((line) => {
          const stock = stockOf(line.productId);
          const atLimit =
            line.qty >= MAX_QTY_PER_LINE || (stock !== undefined && qtyOfProduct(lines, line.productId) >= stock);
          return (
            <li key={line.key} className="flex gap-3 p-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-latte">
                <Image src={line.imageUrl} alt="" fill sizes="64px" unoptimized className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <h2 className="font-medium">
                    {line.name} <span className="text-roast">· Size {line.size}</span>
                  </h2>
                  <span className="whitespace-nowrap font-semibold">{formatVnd(line.unitPrice * line.qty)}</span>
                </div>
                <p className="truncate text-sm text-roast">
                  {line.toppings.length > 0 ? line.toppings.map((t) => t.name).join(', ') : 'Không topping'} ·{' '}
                  {formatVnd(line.unitPrice)}/ly
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center rounded-lg border border-latte">
                    <button
                      type="button"
                      aria-label="Giảm số lượng"
                      onClick={() => setQty(line.key, line.qty - 1)}
                      disabled={line.qty <= 1}
                      className="h-9 w-9 disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-sm font-semibold" data-testid="line-qty">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Tăng số lượng"
                      onClick={() => setQty(line.key, line.qty + 1)}
                      disabled={atLimit}
                      className="h-9 w-9 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(line.key)}
                    className="text-sm text-red-700 hover:underline"
                    aria-label={`Xóa ${line.name}`}
                  >
                    Xóa
                  </button>
                </div>
                {overStock(line.productId) && (
                  <p className="mt-1.5 text-sm text-red-700" role="alert">
                    {line.name} chỉ còn {stock} phần, vui lòng giảm số lượng
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-roast">Tạm tính</span>
        <span className="text-2xl font-bold" data-testid="cart-total">
          {formatVnd(total)}
        </span>
      </div>
      <p className="mt-1 text-right text-xs text-roast">Số tiền cuối cùng do hệ thống tính khi đặt đơn.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse">
        {blocked ? (
          <button
            type="button"
            disabled
            className="min-h-12 flex-1 cursor-not-allowed rounded-xl bg-espresso px-5 font-semibold text-foam opacity-50"
          >
            Thanh toán
          </button>
        ) : (
          <Link
            href="/checkout"
            className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-espresso px-5 font-semibold text-foam transition hover:bg-roast"
          >
            Thanh toán
          </Link>
        )}
        <Link
          href="/"
          className="flex min-h-12 flex-1 items-center justify-center rounded-xl px-5 font-medium text-roast hover:bg-latte"
        >
          Mua thêm
        </Link>
      </div>
    </section>
  );
}
