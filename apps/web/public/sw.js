// Service worker của BrewLite (NFR-09, ADR-004).
// Chỉ lưu cache tài nguyên tĩnh và trang báo mất mạng; KHÔNG lưu dữ liệu API (đơn hàng, thanh toán)
// để không hiển thị trạng thái cũ.
const CACHE = 'brewlite-static-v1';
const PRECACHE = ['/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API ở tên miền khác: không can thiệp

  // Điều hướng trang: lấy từ mạng, mất mạng thì hiện trang thông báo
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }

  // Tài nguyên tĩnh có tên chứa mã băm, ảnh, icon: cache trước, mạng sau
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/images/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          }),
      ),
    );
  }
});
