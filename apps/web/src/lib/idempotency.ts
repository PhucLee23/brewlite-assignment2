// Khóa Idempotency-Key phía web (ADR-006). Lưu ở sessionStorage để bấm lại hoặc tải lại trang
// sau khi mạng lỗi vẫn gửi đúng khóa cũ, server trả lại kết quả cũ thay vì xử lý lần hai.
import type { CartLine } from '@/store/cart';

const ORDER_KEY = 'brewlite-order-key';
const CART_ORDER = 'brewlite-cart-order';

function newKey(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

function read<T>(name: string): T | null {
  try {
    return JSON.parse(sessionStorage.getItem(name) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

/** Khóa đơn gắn với nội dung giỏ: giỏ không đổi thì dùng lại khóa, giỏ đổi thì sinh khóa mới */
export function orderKeyFor(lines: CartLine[], promotionCode: string): string {
  const signature = JSON.stringify([lines.map((l) => [l.key, l.qty]), promotionCode.trim().toUpperCase()]);
  const saved = read<{ signature: string; key: string }>(ORDER_KEY);
  if (saved?.signature === signature) return saved.key;
  const key = newKey('don');
  sessionStorage.setItem(ORDER_KEY, JSON.stringify({ signature, key }));
  return key;
}

/** Khóa thanh toán: mỗi lần bấm thanh toán qua MoMo/VNPay là một lần thử mới (UC-06 bước 7) */
export function newPaymentKey(): string {
  return newKey('tt');
}

/** Ghi nhớ đơn được tạo từ giỏ hàng hiện tại để chỉ xóa giỏ khi chính đơn này thanh toán thành công */
export function rememberCartOrder(orderId: number) {
  sessionStorage.setItem(CART_ORDER, String(orderId));
}

export function isCartOrder(orderId: number): boolean {
  return sessionStorage.getItem(CART_ORDER) === String(orderId);
}

export function forgetCartOrder() {
  sessionStorage.removeItem(CART_ORDER);
  sessionStorage.removeItem(ORDER_KEY);
}
