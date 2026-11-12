// Hàm gọi API duy nhất của web (ADR-004): gắn JWT, Idempotency-Key và chuẩn hóa lỗi tiếng Việt.
import { useAuth } from '@/store/auth';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Gắn JWT của phiên đăng nhập hiện tại; nhận 401 thì tự đăng xuất và chuyển tới trang đăng nhập (FR-07) */
  auth?: boolean;
  idempotencyKey?: string;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = options.auth ? useAuth.getState().token : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ. Vui lòng thử lại.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && options.auth) redirectToLogin();
    throw new ApiError(res.status, errorMessage(res.status, data));
  }
  return data as T;
}

/** Phiên hết hạn hoặc không hợp lệ: xóa phiên, mở trang đăng nhập kèm đường dẫn quay lại */
export function redirectToLogin() {
  useAuth.getState().logout();
  if (typeof window === 'undefined' || window.location.pathname === '/login') return;
  const next = window.location.pathname + window.location.search;
  window.location.assign(`/login?next=${encodeURIComponent(next)}&expired=1`);
}

function errorMessage(status: number, data: unknown): string {
  const message = (data as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) return message.join('; ');
  if (typeof message === 'string' && message) return message;
  if (status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
  return 'Yêu cầu không thành công.';
}
