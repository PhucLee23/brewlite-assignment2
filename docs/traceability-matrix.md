# Ma trận truy vết

Liên kết mỗi yêu cầu trong [SRS](requirements/srs.md) với use-case, thiết kế, code/API và test. Ma trận được cập nhật ở mỗi pull request làm thay đổi yêu cầu, sơ đồ, code hoặc test.

- Cột **Code/API** ghi endpoint hoặc màn hình theo thiết kế; đường dẫn file được bổ sung khi code được merge ở Sprint 1, Sprint 2.
- Cột **Test** ghi mã test theo quy ước ở mục 6 của SRS. Trạng thái: ✅ đã có và chạy trong CI, ⏳ đã lên kế hoạch.

## 1. Mã sơ đồ và thiết kế

| Mã | Tạo phẩm | Task |
| --- | --- | --- |
| UC-Overview | [Sơ đồ use-case tổng quát](requirements/use-case-overview.svg) | 1.2 |
| UC-06-Diagram | [Use-case diagram UC-06](requirements/uc-06-dat-va-thanh-toan.svg), [đặc tả](requirements/uc-06-dat-va-thanh-toan.md) | 1.3 |
| Activity-01 | [Luồng end-to-end đặt hàng](diagrams/activity-01-dat-hang.svg) | 2.1 |
| Activity-02 | [Xử lý đơn tại quầy, hủy đơn](diagrams/activity-02-xu-ly-don.svg) | 2.1 |
| Activity-03 | [Tự hủy đơn quá hạn](diagrams/activity-03-tu-huy-don.svg) | 2.1 |
| Sequence-01 | [Đặt và thanh toán đơn hàng](diagrams/sequence-checkout.svg) | 2.2 |
| Class-01 | [Class diagram mức domain](diagrams/class-domain.svg) | 2.3 |
| C4-Context, C4-Container | [Kiến trúc](architecture/architecture.md) | 3.1 |
| ADR-001 – ADR-009 | [Quyết định kiến trúc](architecture/adr/) | 3.1 |
| Deploy-01 | [Deployment diagram](architecture/deployment.svg) | 3.2 |

## 2. Yêu cầu chức năng

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Test |
| --- | --- | --- | --- | --- |
| FR-01 | UC-01 Xem menu | Activity-01, Class-01, C4-Container | `GET /products`; trang `/` | API-T01 ⏳, CT-01 ⏳, E2E-T01 ⏳ |
| FR-02 | UC-01 Xem menu | Activity-01 | trang `/` (nhãn tồn kho) | CT-01 ⏳ |
| FR-03 | UC-02 Xem chi tiết | Activity-01, Class-01 | `GET /products/:id`; trang `/products/[id]` | UT-01 ⏳, API-T01 ⏳, CT-02 ⏳ |
| FR-04 | UC-03 Quản lý giỏ hàng | Activity-01 | store giỏ hàng; trang `/cart` | CT-03 ⏳, E2E-T01 ⏳ |
| FR-05 | UC-02, UC-03 | Activity-01 | trang `/products/[id]`, `/cart`, `/` | CT-02 ⏳, CT-03 ⏳ |
| FR-06 | UC-04 Đăng ký | Class-01, ADR-005 | `POST /auth/register`; trang `/register` | API-T02 ⏳ |
| FR-07 | UC-05 Đăng nhập | Activity-01, Sequence-01, ADR-005 | `POST /auth/login`, `GET /auth/me`; trang `/login` | API-T02 ⏳, E2E-T01 ⏳ |
| FR-08 | UC-06 Đặt và thanh toán | Activity-01, Sequence-01, Class-01, ADR-006 | `POST /orders` | API-T03 ⏳, API-T04 ⏳ |
| FR-09 | UC-07 Áp dụng mã giảm giá | Activity-01, Sequence-01, Class-01 | `GET /promotions/:code`; trang `/checkout` | UT-02 ⏳, API-T13 ⏳ |
| FR-10 | UC-06 | Sequence-01, ADR-006 | `POST /orders` + `Idempotency-Key` | API-T05 ⏳ |
| FR-11 | UC-06 | Activity-01, Sequence-01, C4-Container, ADR-007 | `POST /payments`, `GET /payments/:id`, `POST /payments/webhook`; trang `/checkout`, `/payments/[id]`, `/orders/[id]`; `apps/payment-gateway` (BrewPay) | API-T06 ⏳, API-T15 ⏳, E2E-T02 ⏳ |
| FR-12 | UC-06 | Sequence-01, ADR-006, ADR-007 | `POST /payments` + `Idempotency-Key`; webhook gửi lặp | API-T07 ⏳ |
| FR-13 | UC-06, UC-09 | Sequence-01, Activity-02, Class-01 | module `loyalty`, bảng `LoyaltyTransaction` | UT-04 ⏳, API-T08 ⏳ |
| FR-14 | UC-06, UC-08 | Activity-01, Sequence-01 | trang `/orders/[id]` | E2E-T01 ⏳ |
| FR-15 | UC-08 Theo dõi đơn | Activity-02 | `GET /orders/me`, `GET /orders/:id`; trang `/orders` | API-T09 ⏳ |
| FR-16 | UC-09 Hủy đơn | Activity-02, ADR-006 | `POST /orders/:id/cancel` | API-T10 ⏳ |
| FR-17 | UC-10 Cập nhật trạng thái | Activity-02, Class-01, ADR-006 | `transitionOrder`, state machine | UT-03 ⏳, API-T11 ⏳ |
| FR-18 | UC-10 | Activity-02, ADR-005 | `PATCH /orders/:id/status` (STAFF) | API-T11 ⏳ |
| FR-19 | UC-10 | Activity-02 | `GET /orders?status=` (STAFF); trang `/staff` | E2E-T03 ⏳ |
| FR-20 | UC-11 Tự hủy đơn quá hạn | Activity-03 | tác vụ định kỳ `releaseExpiredOrders` | API-T12 ⏳ |
| FR-21 | UC-12 Xem lịch sử điểm | Class-01 | `GET /loyalty/me` | (Could) |
| FR-22 | UC-08 | – | trang `/orders/[id]` | (Could) |
| FR-23 – FR-25 | – | – | Won't | – |
| FR-26 | UC-14 Xem giao dịch thanh toán | Class-01, ADR-007 | `GET /payments` (STAFF); trang `/admin/revenue` | API-T16 ⏳ (Could) |

## 3. Yêu cầu phi chức năng

| Mã yêu cầu | Thiết kế | Cách hiện thực | Kiểm chứng |
| --- | --- | --- | --- |
| NFR-01 | C4-Container | Truy vấn có chỉ mục, chọn đúng cột | Đo thời gian trong API-T01 ⏳ |
| NFR-02 | Sequence-01 | Transaction ngắn; `POST /payments` chỉ mở phiên, không chờ cổng | Đo thời gian trong API-T06 ⏳ |
| NFR-03 | ADR-005 | bcrypt, JWT secret từ env | API-T02 ⏳ |
| NFR-04 | ADR-002, ADR-005, ADR-007 | `ValidationPipe` whitelist, giá server, `RolesGuard`, chữ ký HMAC cho link và webhook | API-T03 ⏳, API-T09 ⏳, API-T11 ⏳, API-T15 ⏳ |
| NFR-05 | Deploy-01, ADR-008 | HTTPS, CORS, GitHub Secrets, `GATEWAY_SECRET`, `sslmode=require` | Kiểm tra cấu hình khi deploy ⏳, SMK-01 ⏳, SMK-03 ⏳ |
| NFR-06 | Sequence-01, ADR-006 | Optimistic locking, khóa dòng, UNIQUE | API-T04 ⏳, API-T07 ⏳ |
| NFR-07 | Deploy-01, architecture §3.5 | `GET /health` của API và BrewPay, health check của Render | API-T14 ⏳, SMK-01 ⏳, SMK-03 ⏳ |
| NFR-08 | ADR-004 | Tailwind mobile-first, trạng thái tải/trống/lỗi | CT-01 ⏳, E2E-T01 ở khổ 375 px ⏳ |
| NFR-09 | ADR-004 | Manifest, service worker | Kiểm thử thủ công trên điện thoại ⏳ |
| NFR-10 | Deploy-01, ADR-009 | Docker Compose, Prisma migration, pipeline CD | Pipeline CD chạy thành công ⏳ |
| NFR-11 | ADR-009 | CI trên pull request; quy tắc chỉ merge khi CI xanh và có approve | Pipeline CI, lịch sử pull request ⏳ |
| NFR-12 | architecture §3.4 | Middleware log JSON | Xem log Render ⏳ |
| NFR-13 | ADR-004 | Next.js build cho trình duyệt hiện đại | E2E-T01 trên Chromium ⏳, kiểm thử thủ công Safari iOS ⏳ |

## 4. Danh mục test dự kiến

| Mã | Nội dung |
| --- | --- |
| UT-01 | Tính đơn giá theo size và topping (BR-01) |
| UT-02 | Đánh giá mã giảm giá: hợp lệ, hết hạn, chưa đạt tối thiểu (BR-04) |
| UT-03 | State machine: mọi chuyển tiếp hợp lệ và không hợp lệ (BR-06) |
| UT-04 | Tính điểm thưởng (BR-05) |
| CT-01 | Trang Menu: trạng thái đang tải, trống, lỗi, nhãn tồn kho |
| CT-02 | Trang chi tiết: thành tiền theo lựa chọn, giới hạn số lượng theo tồn kho |
| CT-03 | Store giỏ hàng: gộp dòng, tổng tiền, lưu khi tải lại |
| API-T01 | `GET /products`, `GET /products/:id` (200, 400, 404) |
| API-T02 | Đăng ký, đăng nhập, 401 khi thiếu token, không trả `passwordHash` |
| API-T03 | Tạo đơn: validate, server tính giá, trừ kho, 409 khi thiếu hàng |
| API-T04 | 10 yêu cầu đặt đồng thời món còn 3 phần |
| API-T05 | Gửi lại `POST /orders` cùng khóa chỉ tạo một đơn |
| API-T06 | Mở phiên trả `paymentUrl` có chữ ký, đơn vẫn `PENDING`; webhook `SUCCESS` → `PAID`, `FAILED` → `PAYMENT_FAILED`; thanh toán lại; phiên hết hạn sau 15 phút |
| API-T07 | Gửi lại `POST /payments` cùng khóa, đồng thời, khóa dùng cho đơn khác; webhook gửi lặp chỉ cộng điểm một lần |
| API-T08 | Giao dịch điểm `EARN` khi `PAID`, `REVOKE` khi hủy |
| API-T09 | Lịch sử đơn, không xem được đơn người khác |
| API-T10 | Hủy đơn trả kho, chặn hủy khi đang thanh toán |
| API-T11 | Nhân viên đổi trạng thái: 403 với khách, 400 với `PAID`, 409 với chuyển sai |
| API-T12 | Tự hủy đơn quá 15 phút, trả kho |
| API-T13 | `GET /promotions/:code` |
| API-T14 | `GET /health` 200 và 503 |
| API-T15 | Webhook sai chữ ký trả 401, sai số tiền trả 400, không đổi trạng thái |
| API-T16 | `GET /payments`: 403 với khách, lọc theo trạng thái, tổng tiền chỉ tính `SUCCESS` |
| E2E-T01 | Menu → chi tiết → giỏ → đăng nhập → thanh toán trên trang BrewPay → xác nhận đơn |
| E2E-T02 | Bấm Từ chối ở BrewPay, giỏ giữ nguyên, thanh toán lại thành công |
| E2E-T03 | Nhân viên chuyển đơn PAID → PREPARING → READY → COMPLETED |
| SMK-01 | Sau deploy: `GET /health` của API production trả 200 |
| SMK-02 | Sau deploy: trang chủ web production trả 200 |
| SMK-03 | Sau deploy: `GET /health` của BrewPay production trả 200 |
