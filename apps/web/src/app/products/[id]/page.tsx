'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { api, ApiError } from '@/lib/api';
import { formatVnd } from '@/lib/format';
import type { ProductDetail, Size } from '@/lib/types';
import { useMounted } from '@/lib/use-mounted';
import { MAX_QTY_PER_LINE, qtyOfProduct, useCart } from '@/store/cart';

const MAX_TOPPINGS = 5; // BR-03

// FR-03, FR-05: chọn size, topping, số lượng; thành tiền cập nhật ngay theo BR-01
export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api<ProductDetail>(`/products/${id}`),
  });

  if (isPending) return <p className="py-16 text-center text-roast" role="status">Đang tải món…</p>;
  if (isError) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      return (
        <EmptyState message="Không tìm thấy món này">
          <Link href="/" className="mt-4 inline-block rounded-xl bg-espresso px-5 py-2.5 font-medium text-foam">
            Về menu
          </Link>
        </EmptyState>
      );
    }
    return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  }
  return <ProductForm product={data} />;
}

function ProductForm({ product }: { product: ProductDetail }) {
  const mounted = useMounted();
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const [size, setSize] = useState<Size>('S');
  const [toppingIds, setToppingIds] = useState<number[]>([]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const sizePrice = product.sizes.find((s) => s.size === size)?.price ?? product.price;
  const chosen = product.toppings.filter((t) => toppingIds.includes(t.id));
  const unitPrice = sizePrice + chosen.reduce((sum, t) => sum + t.price, 0);

  // Size lớn tốn nhiều nguyên liệu hơn, topping cũng tốn nguyên liệu: số ly còn làm được theo đúng lựa chọn
  const sizeStock = product.sizes.find((s) => s.size === size)?.stock ?? 0;
  const stock = Math.min(sizeStock, ...chosen.map((t) => t.stock));
  const soldOut = stock <= 0;
  // Tối đa = số ly còn làm được − số ly món này đã có trong giỏ (mọi size, topping), không quá 20
  const inCart = mounted ? qtyOfProduct(lines, product.id) : 0;
  const maxQty = Math.min(MAX_QTY_PER_LINE, stock - inCart);
  const cartFull = !soldOut && maxQty <= 0;
  const quantity = Math.max(1, Math.min(qty, maxQty));

  let limitNote: string | null = null;
  if (!soldOut && !cartFull && quantity >= maxQty) {
    if (maxQty === MAX_QTY_PER_LINE && stock - inCart > MAX_QTY_PER_LINE) limitNote = `Tối đa ${MAX_QTY_PER_LINE} ly mỗi lần thêm.`;
    else limitNote = `Chỉ còn ${stock} ly với lựa chọn này.`;
  }

  const toggleTopping = (toppingId: number) => {
    setAdded(false);
    setToppingIds((ids) => (ids.includes(toppingId) ? ids.filter((x) => x !== toppingId) : [...ids, toppingId]));
  };

  const addToCart = () => {
    add(
      { productId: product.id, name: product.name, imageUrl: product.imageUrl, size, toppings: chosen, unitPrice },
      quantity,
    );
    setAdded(true);
    setQty(1);
  };

  return (
    <article>
      <Link href="/" className="mb-4 inline-block text-sm text-roast hover:underline">
        ← Quay lại menu
      </Link>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-latte">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 480px"
            unoptimized
            priority
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
            <p className="mt-2 text-roast">{product.description}</p>
            <p className="mt-3 text-sm text-roast">
              Giá từ {formatVnd(product.price)} · Còn {Math.max(sizeStock, 0)} ly size {size}
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 font-semibold">Size</legend>
            <div className="grid grid-cols-3 gap-2">
              {product.sizes.map((s) => (
                <label
                  key={s.size}
                  className={`flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-xl border px-3 py-2.5 text-center transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-crema ${
                    size === s.size ? 'border-espresso bg-espresso text-foam' : 'border-latte bg-white hover:bg-latte'
                  }`}
                >
                  <input
                    type="radio"
                    name="size"
                    value={s.size}
                    checked={size === s.size}
                    onChange={() => {
                      setSize(s.size);
                      setAdded(false);
                    }}
                    className="sr-only"
                    aria-label={`Size ${s.size}`}
                  />
                  <span className="font-bold">Size {s.size}</span>
                  <span className="text-xs opacity-80">
                    {s.stock <= 0 ? 'Hết' : s.surcharge ? `+${formatVnd(s.surcharge)}` : 'Giá gốc'}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {product.toppings.length > 0 && (
            <fieldset>
              <legend className="mb-2 font-semibold">Topping (tối đa {MAX_TOPPINGS})</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {product.toppings.map((t) => {
                  const checked = toppingIds.includes(t.id);
                  const out = t.stock <= 0;
                  return (
                    <label
                      key={t.id}
                      className={`flex min-h-11 items-center justify-between rounded-xl border px-3 py-2.5 transition ${
                        checked
                          ? 'cursor-pointer border-crema bg-crema/10'
                          : out
                            ? 'cursor-not-allowed border-latte bg-white opacity-50'
                            : 'cursor-pointer border-latte bg-white hover:bg-latte'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!checked && (out || toppingIds.length >= MAX_TOPPINGS)}
                          onChange={() => toggleTopping(t.id)}
                          className="h-4 w-4 accent-crema"
                        />
                        {t.name}
                      </span>
                      <span className="text-sm text-roast">{out ? 'Hết' : `+${formatVnd(t.price)}`}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">Số lượng</span>
              <div className="flex items-center rounded-xl border border-latte bg-white">
                <button
                  type="button"
                  aria-label="Giảm số lượng"
                  onClick={() => setQty(quantity - 1)}
                  disabled={quantity <= 1}
                  className="h-10 w-10 text-lg disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-8 text-center font-semibold" data-testid="qty">
                  {maxQty > 0 ? quantity : 0}
                </span>
                <button
                  type="button"
                  aria-label="Tăng số lượng"
                  onClick={() => setQty(quantity + 1)}
                  disabled={quantity >= maxQty}
                  className="h-10 w-10 text-lg disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
            {inCart > 0 && <p className="mt-2 text-sm text-amber-800">Đã có {inCart} ly trong giỏ.</p>}
            {limitNote && (
              <p role="status" className="mt-1 text-sm text-amber-800">
                {limitNote}
              </p>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-3 border-t border-latte pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-roast">Thành tiền</span>
              <span className="text-2xl font-bold">{formatVnd(unitPrice * quantity)}</span>
            </div>
            <button
              type="button"
              onClick={addToCart}
              disabled={maxQty <= 0}
              className="min-h-12 rounded-xl bg-espresso px-5 font-semibold text-foam transition hover:bg-roast disabled:cursor-not-allowed disabled:opacity-50"
            >
              {soldOut
                ? product.stock <= 0
                  ? 'Hết hàng'
                  : 'Hết nguyên liệu cho lựa chọn này'
                : cartFull
                  ? 'Đã đủ số lượng còn lại trong giỏ'
                  : `Thêm vào giỏ · ${formatVnd(unitPrice * quantity)}`}
            </button>
            {added && (
              <div
                role="status"
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-900"
              >
                <span>Đã thêm vào giỏ.</span>
                <span className="flex gap-2">
                  <Link href="/" className="rounded-lg border border-espresso/20 bg-white px-3 py-1.5 text-sm font-medium">
                    Mua thêm
                  </Link>
                  <Link href="/cart" className="rounded-lg bg-espresso px-3 py-1.5 text-sm font-semibold text-foam">
                    Xem giỏ hàng
                  </Link>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
