'use client';

import { useQuery } from '@tanstack/react-query';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState, ErrorState, LoadingGrid } from '@/components/StateViews';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';
import { useMounted } from '@/lib/use-mounted';
import { qtyOfProduct, useCart } from '@/store/cart';

// FR-01: trang Menu – lưới món lấy từ API, có trạng thái đang tải / trống / lỗi
export default function MenuPage() {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['products'],
    queryFn: () => api<Product[]>('/products'),
  });
  const mounted = useMounted();
  const lines = useCart((s) => s.lines);

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Hôm nay bạn uống gì?</h1>
        <p className="mt-1 text-roast">Chọn món, thanh toán không tiền mặt, tới quầy nhận nước.</p>
      </div>
      {isPending || (isError && isFetching) ? (
        <LoadingGrid />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState message="Menu đang được cập nhật" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((p) => (
            <ProductCard key={p.id} product={p} inCart={mounted ? qtyOfProduct(lines, p.id) : 0} />
          ))}
        </div>
      )}
    </section>
  );
}
