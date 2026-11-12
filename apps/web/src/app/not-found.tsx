import Link from 'next/link';
import { EmptyState } from '@/components/StateViews';

// Đường dẫn không tồn tại (gõ sai, link cũ): báo bằng tiếng Việt và đưa khách về Menu
export default function NotFound() {
  return (
    <EmptyState message="Không tìm thấy trang bạn cần.">
      <Link
        href="/"
        className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-espresso px-5 font-medium text-white hover:bg-roast"
      >
        Về Menu
      </Link>
    </EmptyState>
  );
}
