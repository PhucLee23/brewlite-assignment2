# Kiến trúc BrewLite

Tài liệu Task 3.1. Kiến trúc được trình bày theo mô hình **C4** (mức Context và Container), bên trong mỗi container tổ chức theo **kiến trúc phân lớp**. Các quyết định quan trọng ghi thành ADR trong [adr/](adr/); môi trường production mô tả ở [deployment diagram](#4-triển-khai).

## 1. Tổng quan

BrewLite gồm ba khối chính, cộng với cổng thanh toán BrewPay chạy thành dịch vụ riêng để đóng vai bên thứ ba. Tất cả nằm trong một monorepo:

| Khối | Công nghệ | Thư mục | Môi trường production |
| --- | --- | --- | --- |
| Web app | Next.js 15 (App Router), React, Tailwind CSS 4, Zustand, React Query, PWA | `apps/web` | Vercel (CDN, HTTPS) |
| API | NestJS 11, Prisma 6, class-validator, Passport JWT | `apps/api` | Render Web Service (Docker) |
| CSDL | PostgreSQL 16, Prisma migration | `apps/api/prisma` | Neon (serverless Postgres) |
| Cổng thanh toán BrewPay (bên thứ ba, mô phỏng) | Node.js 22, không thư viện ngoài | `apps/payment-gateway` | Render Web Service thứ hai (Docker) |

### 1.1 Mức Context

![C4 Context](c4-context.svg)

Khách hàng và nhân viên quầy dùng BrewLite qua trình duyệt. Khi thanh toán, BrewLite chuyển khách sang trang của cổng BrewPay bằng link có chữ ký; khách xác nhận ở đó, và BrewPay báo kết quả về BrewLite qua webhook có chữ ký. BrewLite không tự quyết định một đơn đã được trả tiền. BrewPay mô phỏng một cổng thật như Momo hay VNPay (A-03 trong [context-and-scope.md](../requirements/context-and-scope.md)).

### 1.2 Mức Container

![C4 Container](c4-container.svg)

Tệp nguồn: `c4-context`, `c4-container` (cùng thư mục, cạnh ảnh `.svg`; PlantUML hoặc draw.io).

## 2. Kiến trúc phân lớp

### 2.1 Backend NestJS theo module nghiệp vụ

Mỗi module nghiệp vụ có ba lớp; lớp trên chỉ gọi lớp ngay dưới nó.

| Lớp | Trách nhiệm | Ví dụ |
| --- | --- | --- |
| Controller (giao tiếp) | Nhận HTTP request, gắn guard (JWT, vai trò), validate DTO, đọc header `Idempotency-Key` | `orders.controller.ts`, `orders.dto.ts` |
| Service (nghiệp vụ) | Quy tắc nghiệp vụ, transaction, state machine, tính giá | `orders.service.ts`, `pricing.ts`, `order-state-machine.ts` |
| Truy cập dữ liệu | Prisma Client, transaction, khóa dòng | `PrismaService` (module dùng chung) |

| Module | Nội dung | Yêu cầu |
| --- | --- | --- |
| `auth` | Đăng ký, đăng nhập, `JwtStrategy`, `JwtAuthGuard`, `RolesGuard` | FR-06, FR-07, NFR-03 |
| `products` | Menu và chi tiết món | FR-01, FR-03 |
| `promotions` | Kiểm tra mã giảm giá | FR-09 |
| `orders` | Tạo đơn, tồn kho, state machine, hủy đơn, tự hủy, cập nhật trạng thái | FR-08, FR-10, FR-15 – FR-20 |
| `payments` | Mở phiên thanh toán idempotent, nhận webhook có chữ ký, hết hạn phiên; interface `PaymentGateway` và cài đặt `BrewPayGateway`; danh sách giao dịch cho nhân viên | FR-11, FR-12, FR-26 |
| `loyalty` | Ghi giao dịch điểm `EARN`, `REVOKE`, số dư điểm | FR-13, FR-21 |
| `health` | `GET /health`: kiểm tra tiến trình và kết nối CSDL | NFR-07 |
| `common` | Kiểm tra `Idempotency-Key`, middleware ghi log request, cấu hình | FR-10, FR-12, NFR-12 |

### 2.2 Frontend Next.js

| Lớp | Trách nhiệm | Thư mục |
| --- | --- | --- |
| Trang (route) | Mỗi màn hình một route: `/`, `/products/[id]`, `/cart`, `/checkout`, `/payments/[id]` (mã QR, chờ kết quả), `/login`, `/register`, `/orders`, `/orders/[id]`, `/staff`, `/admin/revenue` (giao dịch thanh toán) | `src/app` |
| Component | Thành phần dùng chung: header, form thanh toán, form đăng nhập, trạng thái tải/trống/lỗi | `src/components` |
| Truy cập API | Hàm `api()` gắn JWT và `Idempotency-Key`, chuẩn hóa lỗi tiếng Việt, tự đăng xuất khi 401; React Query quản lý cache | `src/lib` |
| Trạng thái client | Giỏ hàng và phiên đăng nhập lưu bằng Zustand + localStorage | `src/store` |
| PWA | Web app manifest, icon, service worker | `public/` |

## 3. Các vấn đề xuyên suốt

### 3.1 Dữ liệu và migration

- Schema định nghĩa trong `apps/api/prisma/schema.prisma`; mỗi thay đổi tạo một thư mục migration bằng `prisma migrate dev` và được commit cùng code.
- Local và production chỉ chạy `prisma migrate deploy` (áp các migration chưa chạy, **không** reset dữ liệu). Seed dùng `upsert` nên chạy lại an toàn.
- Migration phải tương thích ngược với phiên bản API đang chạy (chỉ thêm cột/bảng; xóa cột làm ở phiên bản sau) để rollback image không làm hỏng dữ liệu. Chi tiết ở [ADR-003](adr/003-prisma-postgresql-migration.md).

### 3.2 Nhất quán dữ liệu

- Trừ tồn kho bằng **optimistic locking** (`Product.version`) trong transaction; khóa sản phẩm theo `productId` tăng dần.
- Hủy đơn và thanh toán cùng khóa dòng `Order` bằng `SELECT … FOR UPDATE`.
- Đổi trạng thái đơn chỉ qua `transitionOrder()` với điều kiện `WHERE status = <cũ>`.
- Idempotency cho tạo đơn và thanh toán bằng ràng buộc UNIQUE trên khóa. Xem [ADR-006](adr/006-nhat-quan-ton-kho-va-idempotency.md).

### 3.3 Cổng thanh toán BrewPay (bên thứ ba, mô phỏng)

BrewPay (`apps/payment-gateway`) là dịch vụ riêng. Nó không truy cập CSDL của BrewLite và chỉ giao tiếp với API qua HTTP:

1. `POST /payments` tạo `Payment PROCESSING` (hạn 15 phút) và trả `paymentUrl`. Link được ký HMAC-SHA256 trên `paymentId|orderId|amount|method|expiresAt`, nên khách không sửa được số tiền.
2. Web hiện mã QR chứa link, và hỏi `GET /payments/:id` mỗi 1,5 giây.
3. Khách mở link, bấm **Thanh toán** hoặc **Từ chối** trên trang BrewPay.
4. BrewPay gọi `POST /payments/webhook` với header `X-BrewPay-Signature`, ký trên `paymentId|status|amount|gatewayRef`. API trả 401 khi sai chữ ký, 400 khi sai số tiền, và bỏ qua webhook gửi lặp. Webhook hợp lệ thì API đổi trạng thái trong một transaction. BrewPay gửi lại tối đa 5 lần khi chưa nhận được 2xx.

Hai bên ký bằng cùng `GATEWAY_SECRET`. Thứ tự các trường trong chuỗi ký phải giống nhau ở API và BrewPay.

`PaymentsService` chỉ phụ thuộc interface `PaymentGateway` (`createSession`, `verifyWebhook`); cài đặt hiện tại là `BrewPayGateway`. Thay bằng cổng thật chỉ cần thêm một cài đặt mới và đổi provider trong module. Xem [ADR-007](adr/007-cong-thanh-toan-mo-phong.md) và [sequence diagram](../diagrams/sequence-checkout.svg).

### 3.4 Logging

- Middleware ghi **một dòng JSON** cho mỗi request: thời điểm, `requestId` (header `X-Request-Id`, tự sinh nếu thiếu), phương thức, đường dẫn, mã trạng thái, thời gian xử lý (ms).
- Không ghi body, header `Authorization`, mật khẩu hay chuỗi kết nối.
- Log in ra stdout; Render và Vercel thu thập và hiển thị trên trang quản trị.

### 3.5 Health check

- `GET /health` trả `200 { status: "ok", db: "ok", version, uptime }` khi truy vấn `SELECT 1` thành công; trả `503` khi không kết nối được CSDL.
- Render dùng `/health` làm health check path; pipeline CD gọi `/health` làm smoke test sau mỗi lần deploy.

### 3.6 Quản lý cấu hình

- Mọi cấu hình đọc từ biến môi trường qua `@nestjs/config`; API kiểm tra các biến bắt buộc (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `GATEWAY_SECRET`) ngay khi khởi động và dừng nếu thiếu.
- `.env.example` liệt kê đầy đủ biến với giá trị mẫu; file `.env` thật nằm trong `.gitignore`.
- Secret production chỉ nằm ở GitHub Secrets (cho pipeline) và trang cấu hình của Render, Vercel.

| Biến | Dùng ở | Ý nghĩa |
| --- | --- | --- |
| `DATABASE_URL` | API, job migrate | Chuỗi kết nối PostgreSQL (production bắt buộc `sslmode=require`) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | API | Khóa ký JWT, thời hạn token |
| `FRONTEND_URL` | API | Origin được phép gọi API (CORS) |
| `PORT` | API, BrewPay | Cổng lắng nghe (Render tự đặt) |
| `GATEWAY_SECRET` | API, BrewPay | Khóa bí mật dùng chung để ký link thanh toán và webhook |
| `GATEWAY_PUBLIC_URL` | API | URL công khai của BrewPay, dùng để tạo `paymentUrl` |
| `BACKEND_WEBHOOK_URL` | BrewPay | Địa chỉ `POST /payments/webhook` của API |
| `NEXT_PUBLIC_API_URL` | Web (lúc build) | URL công khai của API |

## 4. Triển khai

![Deployment diagram](deployment.svg)

Tệp nguồn: `deployment` (cùng thư mục, cạnh ảnh `.svg`; PlantUML hoặc draw.io). Lý do chọn nền tảng ở [ADR-008](adr/008-nen-tang-trien-khai.md), pipeline ở [ADR-009](adr/009-ci-cd-github-actions.md).

| Môi trường | Thành phần | Ghi chú |
| --- | --- | --- |
| Local | Docker Compose: `web` (3000), `api` (4000), `gateway` – BrewPay (5000), `db` (5432, volume `db_data`) | Một lệnh `docker compose up -d --build`; API tự migrate và seed |
| CI | GitHub Actions: job lint, unit test, integration test (PostgreSQL service container), build; E2E test (có BrewPay) | Chạy khi mở pull request; nhóm chỉ merge khi mọi job thành công |
| CD | GitHub Actions: build 2 image (API, BrewPay) → push GHCR → migrate Neon → deploy 2 service Render (deploy hook) → deploy Vercel → smoke test `/health` | Chạy khi merge vào `main` hoặc tạo tag `v*` |
| Production | Vercel (web), Render (API, BrewPay), Neon (CSDL) | HTTPS ở mọi điểm vào; CSDL chỉ API truy cập |

### 4.1 Truy vết thành phần

Mỗi node của deployment diagram tương ứng một container C4 và một thư mục mã nguồn:

| Node triển khai | Container C4 | Mã nguồn | Cấu hình triển khai |
| --- | --- | --- | --- |
| Vercel Edge Network | Web app | `apps/web` | Project Vercel, biến `NEXT_PUBLIC_API_URL` |
| Render Web Service – API | API | `apps/api`, `apps/api/Dockerfile` | Image `ghcr.io/<owner>/brewlite-api:<sha>` |
| Render Web Service – BrewPay | BrewPay (hệ thống ngoài) | `apps/payment-gateway`, `apps/payment-gateway/Dockerfile` | Image `ghcr.io/<owner>/brewlite-pay:<sha>` |
| Neon Serverless Postgres | CSDL | `apps/api/prisma` | `DATABASE_URL` |
| GitHub Actions, GHCR | (hạ tầng CI/CD) | `.github/workflows/ci.yml`, `cd.yml` | GitHub Secrets |
| Docker Compose (local) | Web app, API, BrewPay, CSDL | `docker-compose.yml` | `.env.example` |

## 5. Lý do chọn kiến trúc, ưu điểm và hạn chế

| Quyết định | Ưu điểm | Hạn chế / trade-off |
| --- | --- | --- |
| Monorepo một repository cho web, API và tài liệu ([ADR-001](adr/001-monorepo.md)) | Một pull request thay đổi cả API và giao diện; truy vết tài liệu–code dễ; một pipeline | Pipeline phải tách job theo thư mục; repository lớn dần |
| Monolith API theo module thay vì microservice ([ADR-002](adr/002-kien-truc-phan-lop-nestjs.md)) | Đơn giản, transaction trong một CSDL, phù hợp nhóm 6 người và tải nhỏ | Không mở rộng riêng từng phần; một lỗi nặng có thể ảnh hưởng toàn API |
| PostgreSQL + Prisma migration ([ADR-003](adr/003-prisma-postgresql-migration.md)) | Transaction, khóa dòng, ràng buộc UNIQUE cho nghiệp vụ tồn kho và idempotency; schema có lịch sử | Truy vấn khóa dòng phải viết SQL thô qua Prisma |
| Next.js mobile-first + PWA ([ADR-004](adr/004-frontend-nextjs-pwa.md)) | Một mã nguồn cho điện thoại và máy tính; cài lên màn hình chính không cần app store | Không dùng được tính năng native (thông báo đẩy trên iOS bị hạn chế) |
| JWT không trạng thái ([ADR-005](adr/005-xac-thuc-jwt.md)) | API không cần lưu phiên, dễ chạy trên nền tảng tự khởi động lại | Không thu hồi token trước hạn; giảm rủi ro bằng thời hạn 1 ngày |
| Optimistic locking + idempotency ([ADR-006](adr/006-nhat-quan-ton-kho-va-idempotency.md)) | Không bán quá tồn kho, không trừ tiền hai lần, không cần khóa toàn bảng | Có thể phải thử lại khi xung đột cao; thêm bảng/khóa để quản lý |
| Cổng BrewPay chạy riêng, kết quả chỉ nhận qua webhook có chữ ký ([ADR-007](adr/007-cong-thanh-toan-mo-phong.md)) | Giống cách giao tiếp của cổng thật; API không tự quyết định đơn đã trả tiền; demo được nhánh thất bại bằng nút Từ chối; thay cổng thật không đổi nghiệp vụ | Thêm một service phải triển khai; luồng bất đồng bộ nên web phải hỏi lại trạng thái; chưa có hoàn tiền, đối soát |
| Vercel + Render + Neon ([ADR-008](adr/008-nen-tang-trien-khai.md)) | Miễn phí, HTTPS sẵn, không cần quản trị máy chủ | API và BrewPay ngủ sau 15 phút (đánh thức ~1 phút); Neon có endpoint Internet, không giới hạn IP ở gói miễn phí |
| GitHub Actions + GHCR ([ADR-009](adr/009-ci-cd-github-actions.md)) | Tích hợp sẵn với repository, secret quản lý tập trung, image gắn tag commit để rollback | Phụ thuộc hạn mức phút chạy miễn phí của GitHub |
