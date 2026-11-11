import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

/** Render component kèm React Query (không thử lại để test lỗi chạy nhanh) */
export function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** Giả lập fetch trả lần lượt các phản hồi; `null` = lỗi mạng */
export function mockFetch(...responses: (unknown | null)[]) {
  const fn = vi.fn();
  for (const body of responses) {
    if (body === null) fn.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    else fn.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200 }));
  }
  vi.stubGlobal('fetch', fn);
  return fn;
}
