import Image from 'next/image';
import { formatVnd } from '@/lib/format';
import type { Product } from '@/lib/types';

/** FR-02: nhãn tình trạng hàng – hết hàng, hoặc còn ít (1–5 phần) */
export function stockLabel(stock: number): string | null {
  if (stock <= 0) return 'Hết hàng';
  if (stock <= 5) return `Còn ${stock}`;
  return null;
}

/** `inCart`: số ly món này đang có trong giỏ (FR-05) */
export function ProductCard({ product, inCart = 0 }: { product: Product; inCart?: number }) {
  const label = stockLabel(product.stock);
  const soldOut = product.stock <= 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-latte bg-white">
      <div className="relative aspect-square overflow-hidden bg-latte">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          unoptimized
          className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-110 motion-safe:group-focus-visible:scale-110"
        />
        {soldOut ? (
          <span className="absolute inset-0 grid place-items-center bg-white/70 font-semibold text-roast">{label}</span>
        ) : (
          label && (
            <span className="absolute left-2 top-2 rounded-full bg-crema px-2 py-0.5 text-xs font-semibold text-white">
              {label}
            </span>
          )
        )}
      </div>
      <div className="flex flex-1 flex-col justify-end gap-1 p-3 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
        <h2 className="font-medium leading-snug">
          {product.name}
          {inCart > 0 && (
            <span className="ml-1.5 inline-block whitespace-nowrap rounded-full bg-crema/15 px-2 py-0.5 align-middle text-xs font-semibold text-roast">
              {inCart} trong giỏ
            </span>
          )}
        </h2>
        <p className="whitespace-nowrap font-semibold text-roast">{formatVnd(product.price)}</p>
      </div>
    </article>
  );
}
