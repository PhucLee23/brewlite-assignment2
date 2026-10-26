# ADR-004: Frontend Next.js mobile-first, PWA, trạng thái client bằng Zustand và React Query

**Trạng thái:** Chấp nhận

## Bối cảnh

Đề bài bắt buộc Next.js theo hướng mobile-first/PWA. Khách đặt món trên điện thoại ngay tại quán. Giỏ hàng phải còn khi tải lại trang (FR-04); dữ liệu menu, đơn hàng lấy từ API và cần trạng thái đang tải, trống, lỗi (FR-01, NFR-08).

## Quyết định

- **Next.js 15 App Router**, các trang dữ liệu là client component gọi REST API của NestJS (không dùng server action để giữ ranh giới API rõ ràng cho test và truy vết).
- **Tailwind CSS**, thiết kế cho chiều rộng 375 px trước, mở rộng lên tablet/máy tính bằng breakpoint.
- **React Query** cho dữ liệu từ server (cache, trạng thái tải/lỗi, thử lại); **Zustand + persist** cho giỏ hàng và phiên đăng nhập (localStorage).
- Một hàm `api()` duy nhất gọi API: gắn JWT, `Idempotency-Key`, chuẩn hóa lỗi tiếng Việt, tự đăng xuất khi nhận 401.
- **PWA:** `manifest.webmanifest`, bộ icon, service worker đơn giản lưu cache tài nguyên tĩnh và trang thông báo mất kết nối. Không lưu cache dữ liệu đơn hàng để tránh hiển thị trạng thái cũ.
- Triển khai trên **Vercel**; bản Docker (`output: "standalone"`) dùng cho Docker Compose ở local.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
| --- | --- |
| Redux Toolkit | Nhiều mã khuôn mẫu cho trạng thái nhỏ (giỏ hàng, phiên) |
| Lưu giỏ hàng trên server | Cần đăng nhập mới thêm được giỏ; khách vãng lai không dùng được |
| next-pwa / Workbox | Thêm phụ thuộc và cấu hình build; nhu cầu chỉ cần manifest và trang offline |

## Hệ quả

- Khách vãng lai thêm giỏ được ngay; đăng nhập chỉ cần khi thanh toán.
- `NEXT_PUBLIC_API_URL` được nhúng lúc build, đổi URL API phải build lại web.
- PWA trên iOS bị hạn chế thông báo đẩy; FR-22 dùng thông báo trong ứng dụng.
