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
| DataFlow-01 | [Luồng dữ liệu đặt món, thanh toán, xử lý đơn và kho](diagrams/luong-du-lieu.svg) | 2.1 |
| Sequence-01 | [Đặt và thanh toán đơn hàng](diagrams/sequence-checkout.svg) | 2.2 |
| Class-01 | [Class diagram mức domain](diagrams/class-domain.svg) | 2.3 |
| C4-Context, C4-Container | [Kiến trúc](architecture/architecture.md) | 3.1 |
| ADR-001 – ADR-011 | [Quyết định kiến trúc](architecture/adr/) (ADR-007 đã được ADR-010 thay thế) | 3.1 |
| Deploy-01 | [Deployment diagram](architecture/deployment.svg) | 3.2 |
| Impl-01 | [Implementation diagram theo vai trò](architecture/implementation.svg) | 3.2 |

## 2. Yêu cầu chức năng

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Test |
| --- | --- | --- | --- | --- |
| FR-01 | UC-01 Xem menu | Activity-01, Class-01, C4-Container, ADR-011 | `GET /products` (số ly tính từ nguyên liệu); trang `/` | API-T01 ⏳, UT-05 ⏳, CT-01 ⏳, E2E-T01 ⏳ |
| FR-02 | UC-01 Xem menu | Activity-01, ADR-011 | trang `/` (nhãn tồn kho) | API-T01 ⏳, CT-01 ⏳ |
| FR-03 | UC-02 Xem chi tiết | Activity-01, Class-01 | `GET /products/:id` (số ly còn của từng size, topping); trang `/products/[id]` | UT-01 ⏳, API-T01 ⏳, CT-02 ⏳ |
| FR-04 | UC-03 Quản lý giỏ hàng | Activity-01 | store giỏ hàng; trang `/cart` | CT-03 ⏳, E2E-T01 ⏳ |
| FR-05 | UC-02, UC-03 | Activity-01, ADR-011 | trang `/products/[id]`, `/cart`, `/` | CT-02 ⏳, CT-03 ⏳ |
| FR-06 | UC-04 Đăng ký | Class-01, ADR-005 | `POST /auth/register`; trang `/register` | API-T02 ⏳ |
| FR-07 | UC-05 Đăng nhập | Activity-01, Sequence-01, ADR-005 | `POST /auth/login`, `GET /auth/me`; trang `/login` | API-T02 ⏳, E2E-T01 ⏳ |
| FR-08 | UC-06 Đặt và thanh toán | Activity-01, Sequence-01, Class-01, DataFlow-01, ADR-006, ADR-011 | `POST /orders` (trừ nguyên liệu theo công thức) | UT-05 ⏳, API-T03 ⏳, API-T04 ⏳ |
| FR-09 | UC-07 Áp dụng mã giảm giá | Activity-01, Sequence-01, Class-01 | `GET /promotions/:code`; trang `/checkout` | UT-02 ⏳, API-T13 ⏳ |
| FR-10 | UC-06 | Sequence-01, ADR-006 | `POST /orders` + `Idempotency-Key` | API-T05 ⏳ |
| FR-11 | UC-06 | Activity-01, Sequence-01, DataFlow-01, C4-Container, ADR-010 | `POST /payments`, `GET /payments/:id`, `POST /payments/:id/return`, `POST /payments/momo/ipn`, `GET /payments/vnpay/ipn`; module `payments/gateways` (MoMo, VNPay); trang `/checkout`, `/payments/[id]`, `/orders/[id]` | UT-06 ⏳, API-T06 ⏳, API-T15 ⏳, E2E-T01 ⏳, E2E-T02 ⏳ |
| FR-12 | UC-06 | Sequence-01, ADR-006, ADR-010 | `POST /payments` + `Idempotency-Key`; link quay về, IPN, tra cứu cùng báo một kết quả | API-T07 ⏳ |
| FR-13 | UC-06, UC-09 | Sequence-01, Activity-02, Class-01 | module `loyalty`, bảng `LoyaltyTransaction` | UT-04 ⏳, API-T08 ⏳ |
| FR-14 | UC-06, UC-08 | Activity-01, Sequence-01 | trang `/orders/[id]` | E2E-T01 ⏳ |
| FR-15 | UC-08 Theo dõi đơn | Activity-02 | `GET /orders/me`, `GET /orders/:id`; trang `/orders` | API-T09 ⏳ |
| FR-16 | UC-09 Hủy đơn | Activity-02, ADR-006, ADR-011 | `POST /orders/:id/cancel` (trả nguyên liệu) | API-T10 ⏳ |
| FR-17 | UC-10 Cập nhật trạng thái | Activity-02, Class-01, ADR-006 | `transitionOrder`, state machine | UT-03 ⏳, API-T11 ⏳ |
| FR-18 | UC-10 | Activity-02, ADR-005 | `PATCH /orders/:id/status` (STAFF) | API-T11 ⏳ |
| FR-19 | UC-10 | Activity-02, Impl-01 | `GET /orders?status=` (STAFF); trang `/staff` | E2E-T03 ⏳ |
| FR-20 | UC-11 Tự hủy đơn quá hạn | Activity-03, DataFlow-01, ADR-011 | tác vụ định kỳ `releaseExpiredOrders` (trả nguyên liệu) | API-T12 ⏳ |
| FR-21 | UC-12 Xem lịch sử điểm | Class-01 | `GET /loyalty/me` | (Could) |
| FR-22 | UC-08 | – | trang `/orders/[id]` | (Could) |
| FR-23 | – | – | Won't | – |
| FR-24 | UC-13 Quản lý kho nguyên liệu | Class-01, ADR-011, DataFlow-01, Impl-01 | `GET /ingredients`, `POST /ingredients/:id/restock` (STAFF); trang `/admin/ingredients` | API-T17 ⏳, E2E-T04 ⏳ |
| FR-25 | – | – | Won't | – |
| FR-26 | UC-14 Xem giao dịch thanh toán | Class-01, ADR-010, DataFlow-01, Impl-01 | `GET /payments`, `GET /payments/:id/receipt`; trang `/admin/revenue`, `/payments/[id]/receipt` | API-T16 ⏳ (Could) |

## 3. Yêu cầu phi chức năng

| Mã yêu cầu | Thiết kế | Cách hiện thực | Kiểm chứng |
| --- | --- | --- | --- |
| NFR-01 | C4-Container | Truy vấn có chỉ mục, chọn đúng cột | Đo thời gian trong API-T01 ⏳ |
| NFR-02 | Sequence-01 | Transaction ngắn; `POST /payments` chỉ mở phiên, không chờ cổng | Đo thời gian trong API-T06 ⏳ |
| NFR-03 | ADR-005 | bcrypt, JWT secret từ env | API-T02 ⏳ |
| NFR-04 | ADR-002, ADR-005, ADR-010, Impl-01 | `ValidationPipe` whitelist, giá server, `RolesGuard`, chữ ký HMAC-SHA512 (VNPay), HMAC-SHA256 (MoMo) cho link và kết quả, tra cứu lại cổng | UT-06 ⏳, API-T03 ⏳, API-T09 ⏳, API-T11 ⏳, API-T15 ⏳ |
| NFR-05 | Deploy-01, ADR-008, ADR-010 | HTTPS, CORS, GitHub Secrets, khóa VNPay chỉ ở biến môi trường, `sslmode=require` | Kiểm tra cấu hình khi deploy ⏳, SMK-01 ⏳, SMK-03 ⏳ |
| NFR-06 | Sequence-01, ADR-006, ADR-011 | Optimistic locking trên nguyên liệu, khóa dòng, UNIQUE | API-T04 ⏳, API-T07 ⏳, API-T17 ⏳ |
| NFR-07 | Deploy-01, architecture §3.5 | `GET /health` của API, health check của Render | API-T14 ⏳, SMK-01 ⏳, SMK-03 ⏳ |
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
| UT-05 | Số ly còn bán được tính từ nguyên liệu theo công thức và tỉ lệ size (BR-09) |
| UT-06 | Chữ ký với cổng MoMo, VNPay: link thanh toán, kết quả gửi về bị sửa thì bị từ chối |
| CT-01 | Trang Menu: trạng thái đang tải, trống, lỗi, nhãn tồn kho |
| CT-02 | Trang chi tiết: thành tiền theo lựa chọn, giới hạn số lượng theo số ly còn của từng size |
| CT-03 | Store giỏ hàng: gộp dòng, tổng tiền, lưu khi tải lại |
| API-T01 | `GET /products`, `GET /products/:id` (200, 400, 404) |
| API-T02 | Đăng ký, đăng nhập, 401 khi thiếu token, không trả `passwordHash` |
| API-T03 | Tạo đơn: validate, server tính giá, trừ nguyên liệu theo size, 409 khi thiếu hàng |
| API-T04 | 10 yêu cầu đặt đồng thời món còn 3 phần |
| API-T05 | Gửi lại `POST /orders` cùng khóa chỉ tạo một đơn |
| API-T06 | Mở phiên ở VNPay, MoMo trả `paymentUrl`, đơn vẫn `PENDING`; cổng xác nhận thành công → `PAID`, thất bại → `PAYMENT_FAILED`; tự tra cứu cổng khi trang chờ hỏi; thanh toán lại; phiên hết hạn sau 15 phút |
| API-T07 | Gửi lại `POST /payments` cùng khóa, đồng thời, khóa dùng cho đơn khác; link quay về, IPN, tra cứu cùng báo chỉ cộng điểm một lần |
| API-T08 | Giao dịch điểm `EARN` khi `PAID`, `REVOKE` khi hủy |
| API-T09 | Lịch sử đơn, không xem được đơn người khác |
| API-T10 | Hủy đơn trả nguyên liệu, chặn hủy khi đang thanh toán |
| API-T11 | Nhân viên đổi trạng thái: 403 với khách, 400 với `PAID`, 409 với chuyển sai |
| API-T12 | Tự hủy đơn quá 15 phút, trả nguyên liệu |
| API-T13 | `GET /promotions/:code` |
| API-T14 | `GET /health` 200 và 503 |
| API-T15 | Kết quả sai chữ ký, sai số tiền, của giao dịch khác bị từ chối, không đổi trạng thái |
| API-T16 | `GET /payments`: 403 với khách, lọc theo trạng thái, tổng tiền chỉ tính `SUCCESS`; biên lai |
| API-T17 | Kho nguyên liệu: chỉ nhân viên, nhập kho 1 – 1.000.000, nhập cùng lúc với đặt đơn không mất hàng |
| E2E-T01 | Menu → chi tiết → giỏ → đăng nhập → thanh toán trên trang VNPay (cổng giả trong CI) → xác nhận đơn → biên lai |
| E2E-T02 | Bấm Hủy giao dịch ở trang cổng, giỏ giữ nguyên, thanh toán lại thành công |
| E2E-T03 | Nhân viên chuyển đơn PAID → PREPARING → READY → COMPLETED |
| E2E-T04 | Nhân viên nhập kho nguyên liệu, món hết hàng bán lại được |
| SMK-01 | Sau deploy: `GET /health` của API production trả 200 |
| SMK-02 | Sau deploy: trang chủ web production trả 200 |
| SMK-03 | Sau deploy: `GET /products` của API production đọc được menu |
