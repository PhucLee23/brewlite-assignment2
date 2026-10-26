# ADR-007: Cổng thanh toán BrewPay mô phỏng bên thứ ba, kết quả chỉ nhận qua webhook có chữ ký

**Trạng thái:** Chấp nhận

## Bối cảnh

Đề bài yêu cầu thanh toán Ví/Thẻ mô phỏng. Tích hợp cổng thật (Momo, VNPay) cần tài khoản merchant, môi trường sandbox và hợp đồng (FR-25, Won't). Tuy vậy, luồng thanh toán phải giống cổng thật ở điểm quan trọng nhất: **BrewLite không tự quyết định đơn đã được trả tiền**. Chỉ bên thứ ba xử lý giao dịch mới được báo kết quả, và BrewLite phải kiểm chứng được thông báo đó đúng là của bên thứ ba (FR-11, FR-12, NFR-04).

Nhóm vẫn cần kiểm thử và demo được cả nhánh thành công lẫn thất bại, chạy được trong CI mà không phụ thuộc dịch vụ bên ngoài.

## Quyết định

- **BrewPay là một dịch vụ riêng** (`apps/payment-gateway`, Node.js 22, không dùng CSDL của BrewLite), đóng vai hệ thống bên thứ ba: container riêng ở local, Render Web Service riêng ở production. BrewPay có trang thanh toán cho khách và chỉ giao tiếp với API qua HTTP.
- **Mở phiên thanh toán:** `POST /payments` tạo bản ghi `Payment` `PROCESSING` (hạn 15 phút) rồi trả `paymentUrl` trỏ tới BrewPay. Link được ký HMAC-SHA256 bằng `GATEWAY_SECRET` trên chuỗi `paymentId|orderId|amount|method|expiresAt`. BrewPay từ chối link sai chữ ký hoặc đã hết hạn. Đơn vẫn ở `PENDING`.
- **Giao diện:** trang `/payments/[id]` hiện mã QR chứa `paymentUrl` (quét bằng điện thoại) và nút mở BrewPay ngay trên máy đang dùng. Trang hỏi `GET /payments/:id` mỗi 1,5 giây và tự chuyển sang màn hình xác nhận khi có kết quả.
- **Khách xác nhận ở BrewPay:** trang BrewPay hiện số tiền, khách bấm **Thanh toán** hoặc **Từ chối**. Nút Từ chối là cách demo nhánh thất bại; nó nằm ở phía bên thứ ba chứ không phải một tùy chọn trên giao diện BrewLite.
- **Webhook:** BrewPay gọi `POST /payments/webhook` với `{ paymentId, status, amount, gatewayRef }` và header `X-BrewPay-Signature` = HMAC-SHA256 của `paymentId|status|amount|gatewayRef`. API:
  - so chữ ký bằng phép so sánh thời gian hằng; sai thì trả **401**;
  - số tiền khác `Payment.amount` thì trả **400**;
  - `Payment` không còn `PROCESSING` (webhook gửi lặp) thì trả 200, không xử lý lại;
  - còn lại, trong một transaction: `SUCCESS` → `Payment SUCCESS`, đơn `PENDING → PAID`, ghi `LoyaltyTransaction EARN`; `FAILED` → `Payment FAILED`, đơn `PENDING → PAYMENT_FAILED`. Lưu `gatewayRef` và `confirmedAt`.
- **Gửi lại:** BrewPay chưa nhận được mã 2xx thì gửi lại webhook, tối đa 5 lần, giãn cách tăng dần.
- **Hết hạn:** phiên `PROCESSING` quá 15 phút chưa có kết quả được đánh `FAILED` để không chặn hủy đơn hay thanh toán lại.
- **Interface `PaymentGateway`** trong module `payments`: `createSession(payment) → { paymentUrl, expiresAt }` và `verifyWebhook(body, signature) → boolean`. Cài đặt hiện tại là `BrewPayGateway`. `PaymentsService` chỉ phụ thuộc interface, inject qua token của NestJS.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
| --- | --- |
| Lớp mô phỏng chạy trong tiến trình API, trả thành công/thất bại ngay | API tự quyết định kết quả thanh toán; không có bước bên thứ ba xác nhận; không giống cổng thật |
| Tích hợp sandbox VNPay/Momo | Cần đăng ký merchant, callback HTTPS công khai; ngoài phạm vi |
| Stripe test mode | Cần tài khoản; luồng khác với ví nội địa; test CI phụ thuộc mạng |
| Webhook không ký, chỉ kiểm tra địa chỉ gửi | Bất kỳ ai biết URL webhook đều có thể đánh dấu đơn `PAID` |
| Web hỏi thẳng BrewPay rồi báo kết quả cho API | Kết quả đi qua trình duyệt của khách, có thể bị sửa; API không có bằng chứng từ bên thứ ba |

## Hệ quả

- `PAID` và `PAYMENT_FAILED` chỉ được đặt bởi webhook có chữ ký hợp lệ (BR-07). Ai gọi webhook mà không có `GATEWAY_SECRET` đều nhận 401.
- Thanh toán bất đồng bộ: `POST /payments` trả ngay, kết quả đến sau qua webhook, nên web phải hỏi lại trạng thái. Integration test gọi webhook với chữ ký tự tính, nên CI không cần chạy BrewPay.
- Production có thêm một Render Web Service; cả hai service cùng ngủ khi rảnh (rủi ro R-01, R-02).
- `GATEWAY_SECRET` là secret dùng chung giữa API và BrewPay, chỉ nằm trong biến môi trường của hai service và GitHub Secrets.
- Thay bằng cổng thật chỉ cần thêm một cài đặt `PaymentGateway` mới (ký link, kiểm chữ ký webhook theo chuẩn của cổng đó); logic idempotency và trạng thái giữ nguyên.
- Chưa kiểm chứng hoàn tiền và đối soát cuối ngày; ghi vào backlog phiên bản sau.
