'use client';

import { ErrorState } from '@/components/StateViews';

// Lỗi không lường trước khi hiển thị một trang: giữ header, cho thử lại thay vì trang trắng
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState message="Trang gặp lỗi khi hiển thị. Vui lòng thử lại." onRetry={reset} />;
}
