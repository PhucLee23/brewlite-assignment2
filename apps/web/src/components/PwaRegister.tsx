'use client';

import { useEffect } from 'react';

/** Đăng ký service worker ở bản production để cài được lên màn hình chính và có trang báo mất mạng (NFR-09) */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
}
