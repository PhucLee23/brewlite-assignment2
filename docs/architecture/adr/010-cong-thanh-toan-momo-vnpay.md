# ADR-010: Thanh toán qua cổng MoMo, VNPay (sandbox), kết quả chỉ nhận khi có chữ ký của cổng

**Trạng thái:** Chấp nhận (thay thế [ADR-007](007-cong-thanh-toan-mo-phong.md))

## Bối cảnh

ADR-007 dùng BrewPay, một dịch vụ do nhóm tự viết để đóng vai bên thứ ba. Khi nghiệm thu thiết kế, yêu cầu được làm rõ: thanh toán phải đi qua **cổng thanh toán của bên thứ ba thật**, dùng môi trường thử nghiệm (sandbox) của chính cổng, không trừ tiền thật. MoMo và VNPay đều có sandbox miễn phí: VNPay cấp mã website (`vnp_TmnCode`) và chuỗi bí mật (`vnp_HashSecret`) khi đăng ký merchant sandbox; MoMo công bố bộ khóa test dùng chung. Yêu cầu liên quan: FR-11, FR-12, FR-26, NFR-04, NFR-05.

Nguyên tắc của ADR-007 vẫn giữ: **BrewLite không tự quyết định đơn đã được trả tiền**; chỉ kết quả cổng ký mới đổi trạng thái đơn.

## Quyết định

- **Hai cổng, khách chọn khi thanh toán:** `POST /payments` nhận `provider` = `MOMO` hoặc `VNPAY`. API tạo bản ghi `Payment` `PROCESSING` (hạn 15 phút, khóa idempotency UNIQUE như ADR-006) kèm `gatewayOrderId` ngẫu nhiên gắn thời gian, vì cả nhóm dùng chung tài khoản sandbox mà CSDL mỗi máy đều đánh số đơn từ 1.
- **Mở giao dịch ở cổng:**
  - VNPay: API tự tạo link `vpcpay.html` với các tham số `vnp_*` xếp theo tên, ký HMAC-SHA512 bằng `vnp_HashSecret`; `vnp_ExpireDate` bằng hạn của phiên.
  - MoMo: API gọi `POST /v2/gateway/api/create` (chữ ký HMAC-SHA256, `requestType = payWithMethod` để khách chọn ví, thẻ ATM hoặc thẻ quốc tế) và nhận `payUrl`.
  - Không mở được giao dịch thì đánh `Payment` `FAILED` và trả 502, khách chọn lại được ngay.
- **Khách trả trên trang của cổng:** web chuyển trình duyệt sang `paymentUrl`. Cổng chỉ chuyển khách về địa chỉ `/payments/:id` của BrewLite; origin này phải nằm trong `FRONTEND_URL` để không chuyển hướng tới trang lạ.
- **Ba đường nhận kết quả, cùng một hàm ghi kết quả:**
  1. **Link quay về:** web gửi tham số cổng gắn vào link lên `POST /payments/:id/return`. API kiểm chữ ký (so sánh thời gian hằng) và mã giao dịch, rồi **hỏi lại cổng bằng API tra cứu** (VNPay `querydr`, MoMo `/v2/gateway/api/query`) trước khi chốt, để không tin hoàn toàn vào dữ liệu đi qua trình duyệt.
  2. **IPN:** `POST /payments/momo/ipn` (trả 204) và `GET /payments/vnpay/ipn` (trả `RspCode` theo tài liệu VNPay: 97 sai chữ ký, 01 không thấy giao dịch, 04 sai số tiền, 02 đã xác nhận, 00 thành công). Cổng chỉ gọi được IPN khi API có địa chỉ công khai (production).
  3. **Tra cứu khi trang chờ hỏi:** `GET /payments/:id` của phiên còn mở tự tra cứu cổng, tối đa mỗi 4 giây một lần, để khách trả bằng app trên điện thoại khác vẫn thấy kết quả và để chạy được ở máy cá nhân, nơi cổng không gọi được IPN về `localhost`.
- **Ghi kết quả một lần:** trong một transaction có khóa dòng đơn (như hủy đơn), chỉ xử lý khi `Payment` còn `PROCESSING`; số tiền phải bằng `Payment.amount`. Thành công → `SUCCESS`, đơn `PENDING → PAID` (hoặc `PAYMENT_FAILED → PENDING → PAID`), ghi `LoyaltyTransaction EARN`; thất bại → `FAILED`, đơn `PENDING → PAYMENT_FAILED`. Lưu bằng chứng: `gatewayRef` (mã giao dịch của cổng), `bankCode`, `payType`, `gatewayResult` (dữ liệu gốc có chữ ký), `confirmedAt`.
- **Trả tiền muộn:** phiên đã bị BrewLite đánh `FAILED` vì hết hạn (chưa có `confirmedAt`) mà cổng vẫn báo đã trừ tiền thì vẫn ghi `SUCCESS`; đơn đã hủy thì giao dịch hiện ở mục "Cần hoàn tiền" (FR-26).
- **Interface `PaymentGateway`** (`payments/gateways`): `createSession`, `parseCallback` (kiểm chữ ký, trả `null` nếu sai), `query`. Hai cài đặt `MomoGateway`, `VnpayGateway`; lời gọi HTTP tách vào `GatewayHttp` để integration test thay bằng cổng giả.
- **Khóa:** `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` của nhóm (dùng chung) chỉ nằm trong `.env` từng máy, biến môi trường Render và GitHub Secrets; MoMo bỏ trống thì dùng khóa test công khai. Không commit khóa.
- **Kiểm thử không phụ thuộc Internet:** unit test kiểm chữ ký với dữ liệu thật đã ghi lại từ sandbox; integration test thay `GatewayHttp` bằng cổng giả ký kết quả bằng khóa test; E2E dùng một cổng VNPay giả chạy cạnh API (`tests/e2e/mock-vnpay`).

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
| --- | --- |
| Giữ BrewPay tự viết (ADR-007) | Không phải bên thứ ba thật; nhóm vừa viết API vừa viết cổng nên kết quả chưa có giá trị kiểm chứng độc lập |
| Chỉ một cổng (VNPay) | Đủ yêu cầu nhưng khách không có lựa chọn; MoMo có khóa test công khai nên thêm vào gần như không tốn chi phí |
| Chỉ tin link quay về, không tra cứu | Dữ liệu đi qua trình duyệt của khách; tra cứu lại cổng cho bằng chứng từ phía server |
| Chỉ dựa vào IPN | Ở máy cá nhân và lúc demo không có địa chỉ công khai, IPN không tới được |
| Stripe test mode | Không hỗ trợ ví, thẻ nội địa Việt Nam |

## Hệ quả

- `PAID` và `PAYMENT_FAILED` chỉ được đặt bởi kết quả có chữ ký hợp lệ của cổng (BR-07); kết quả tự chế hoặc sửa số tiền bị từ chối.
- Bỏ dịch vụ `apps/payment-gateway`, container `gateway` và Render Web Service `brewlite-pay`: hệ thống còn 3 dịch vụ (web, API, CSDL), giảm giờ chạy trên gói miễn phí (R-02).
- Thanh toán cần Internet; cổng sandbox có thể chậm hoặc bảo trì lúc demo (R-11). Có hai cổng để chọn và phiên lỗi được mở lại ngay.
- Nhóm phải bảo vệ `VNPAY_HASH_SECRET` như một secret; cấu hình IPN URL trên trang merchant sandbox trỏ về API production.
- Hoàn tiền tự động qua cổng và đối soát vẫn ngoài phạm vi (FR-25); nhân viên hoàn tiền tại quầy theo mục "Cần hoàn tiền".
