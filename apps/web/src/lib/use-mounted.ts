import { useEffect, useState } from 'react';

/**
 * Dữ liệu lưu ở localStorage (giỏ hàng, phiên đăng nhập) chỉ có ở trình duyệt.
 * Chờ component gắn vào trang rồi mới hiển thị để HTML từ server và trình duyệt khớp nhau.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
