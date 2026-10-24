# UC-06 – Đặt và thanh toán đơn hàng

Tài liệu Task 1.3: đặc tả use-case trọng tâm của BrewLite. Đây là use-case mang giá trị nghiệp vụ chính: khách tự đặt và trả tiền không tiền mặt, không phải xếp hàng tại quầy.

![Use-case diagram UC-06](uc-06-dat-va-thanh-toan.svg)

Tệp nguồn: `uc-06-dat-va-thanh-toan` (cùng thư mục, cạnh ảnh `.svg`; PlantUML hoặc draw.io).

## 1. Thông tin chung

| Mục | Nội dung |
| --- | --- |
| Mã, tên | UC-06 Đặt và thanh toán đơn hàng |
| Tác nhân chính | Khách hàng |
| Tác nhân phụ | Cổng thanh toán BrewPay (hệ thống bên thứ ba, mô phỏng) |
| Mục tiêu | Khách tạo đơn từ giỏ hàng và trả tiền bằng ví điện tử hoặc thẻ qua cổng thanh toán, nhận mã đơn để tới quầy lấy nước |
| Trigger | Khách bấm **Thanh toán** ở trang Giỏ hàng |
| Mức ưu tiên | Must |
| Yêu cầu liên quan | FR-07, FR-08, FR-09, FR-10, FR-11, FR-12, FR-13, FR-14, FR-17; NFR-02, NFR-04, NFR-06; quy tắc BR-01 – BR-07 |
| Use-case liên quan | «include» UC-05 Đăng nhập; «extend» UC-07 Áp dụng mã giảm giá; dẫn tới UC-08 Theo dõi đơn hàng |

## 2. Điều kiện

**Tiền điều kiện**

1. Giỏ hàng có ít nhất một dòng, số lượng mỗi dòng 1–20.
2. API, CSDL và cổng thanh toán BrewPay đang hoạt động.

**Hậu điều kiện khi thành công**

1. Có một đơn mới của khách ở trạng thái `PAID`, giá do server tính.
2. Tồn kho các món trong đơn đã giảm đúng số lượng đặt.
3. Có một bản ghi thanh toán `SUCCESS` gắn với `Idempotency-Key` của yêu cầu và mã giao dịch (`gatewayRef`) do BrewPay báo về.
4. Điểm thưởng của khách tăng theo BR-05 và có giao dịch điểm `EARN` gắn với đơn.
5. Giỏ hàng trống; khách đang ở màn hình xác nhận đơn.

**Hậu điều kiện khi thất bại**

- Thất bại trước khi tạo đơn (dữ liệu sai, hết hàng, mất kết nối): không có đơn mới, tồn kho không đổi, giỏ hàng giữ nguyên.
- Thanh toán thất bại (khách từ chối ở BrewPay, cổng từ chối, phiên hết hạn): đơn ở `PAYMENT_FAILED`, tồn kho vẫn được giữ cho đơn; bản ghi thanh toán `FAILED`; giỏ hàng giữ nguyên; không cộng điểm. Nếu khách không thanh toán lại trong 15 phút, đơn tự hủy và trả hàng về kho (UC-11).

## 3. Luồng chính

| Bước | Tác nhân | Hành động |
| --- | --- | --- |
| 1 | Khách hàng | Bấm **Thanh toán** ở trang Giỏ hàng. |
| 2 | Hệ thống (web) | Kiểm tra đã đăng nhập (có JWT), mở trang Thanh toán với danh sách món, tạm tính và tổng tiền. |
| 3 | Khách hàng | Chọn phương thức **Ví điện tử** hoặc **Thẻ**, bấm **Xác nhận trả**. |
| 4 | Hệ thống (web) | Gửi `POST /orders` kèm JWT, danh sách món và `Idempotency-Key` của giỏ hàng hiện tại. |
| 5 | Hệ thống (API) | Kiểm tra JWT; validate dữ liệu (BR-03); tính lại giá từ CSDL (BR-01, BR-02); kiểm tra mã giảm giá nếu có. |
| 6 | Hệ thống (API) | Trong một transaction: trừ tồn kho từng món theo `productId` tăng dần bằng optimistic locking, tạo đơn `PENDING`. Trả về đơn kèm mã đơn. |
| 7 | Hệ thống (web) | Sinh `Idempotency-Key` mới cho lần thanh toán, gửi `POST /payments` với mã đơn và phương thức. |
| 8 | Hệ thống (API) | Khóa dòng đơn hàng; kiểm tra đơn thuộc về khách và còn thanh toán được; tạo bản ghi thanh toán `PROCESSING` (hạn 15 phút) với khóa UNIQUE; ký link sang BrewPay và trả `paymentUrl`. Đơn vẫn `PENDING`. |
| 9 | Hệ thống (web) | Chuyển tới trang thanh toán: hiện mã QR chứa `paymentUrl` và nút **Mở BrewPay**; bắt đầu hỏi trạng thái `GET /payments/:id` mỗi 1,5 giây. |
| 10 | Khách hàng | Quét mã QR bằng điện thoại (hoặc bấm nút), xem số tiền trên trang BrewPay và bấm **Thanh toán**. |
| 11 | Cổng thanh toán | Kiểm tra chữ ký và hạn của link, ghi nhận giao dịch, gửi `POST /payments/webhook` kèm chữ ký HMAC-SHA256, trạng thái `SUCCESS`, số tiền và mã giao dịch. |
| 12 | Hệ thống (API) | Kiểm tra chữ ký và số tiền; trong một transaction: thanh toán `SUCCESS`, đơn `PENDING → PAID`, cộng điểm và ghi giao dịch điểm `EARN`. Trả 200 cho cổng. |
| 13 | Hệ thống (web) | Lần hỏi trạng thái kế tiếp nhận `SUCCESS`: xóa giỏ hàng, cập nhật số điểm trên header, chuyển tới màn hình xác nhận. |
| 14 | Khách hàng | Thấy mã đơn, trạng thái `PAID`, các món, tổng tiền, số điểm vừa cộng và lời nhắc tới quầy nhận nước. Use-case kết thúc. |

## 4. Luồng thay thế

| Mã | Tại bước | Điều kiện | Xử lý |
| --- | --- | --- | --- |
| A1 | 2 | Khách chưa đăng nhập | Web chuyển tới trang Đăng nhập kèm đường dẫn quay lại (UC-05). Đăng nhập thành công thì quay lại bước 2 với giỏ hàng giữ nguyên. |
| A2 | 3 | Khách nhập mã giảm giá (UC-07) | Web gọi `GET /promotions/:code?subtotal=`. Mã hợp lệ: hiển thị dòng giảm giá và tổng mới, gửi kèm mã ở bước 4. Mã không hợp lệ: hiển thị lý do (hết hạn, chưa đạt tối thiểu…), khách tiếp tục không dùng mã. |
| A3 | 4–6 | Web gửi lại `POST /orders` với cùng khóa (mạng chậm, bấm lại sau lỗi) | API thấy khóa `userId:key` đã có đơn, trả lại đơn cũ; không tạo đơn mới, không trừ kho lần hai. Tiếp tục bước 7. |
| A4 | 7–8 | Web gửi lại `POST /payments` với cùng `Idempotency-Key` (hết thời gian chờ, mất kết nối giữa chừng) | API tìm thấy bản ghi thanh toán theo khóa và trả lại đúng phiên đó với `replayed: true`; không tạo phiên mới, không cộng điểm lần hai. Đơn đã có phiên còn hạn thì yêu cầu với khóa khác cũng nhận lại phiên đó. |
| A5 | 14 | Khách thanh toán lại một đơn `PAYMENT_FAILED` từ màn hình đơn hàng | Thực hiện lại từ bước 7 với khóa thanh toán mới; đơn `PAYMENT_FAILED → PENDING` khi phiên mới được mở. |
| A6 | 11–12 | BrewPay gửi lại webhook (không nhận được phản hồi 2xx, hoặc gửi trùng) | API thấy thanh toán không còn `PROCESSING` thì trả 200 và bỏ qua; không đổi trạng thái, không cộng điểm lần hai. |
| A7 | 10 | Khách không có điện thoại khác để quét mã | Bấm **Mở BrewPay** để mở trang cổng ngay trên thiết bị đang dùng; tiếp tục bước 10. |

## 5. Luồng ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý và kết quả |
| --- | --- | --- | --- |
| E1 | 5 | Dữ liệu không hợp lệ (số lượng ngoài 1–20, size sai, món không tồn tại, trường lạ) | API trả 400 kèm thông báo tiếng Việt; web hiển thị lỗi, giỏ giữ nguyên. Use-case kết thúc thất bại. |
| E2 | 5, 8 | JWT thiếu, sai hoặc hết hạn | API trả 401; web đăng xuất và chuyển tới trang Đăng nhập (tiếp tục như A1). |
| E3 | 6 | Một món không đủ tồn kho | Transaction bị hủy toàn bộ, không trừ kho món nào; API trả 409 "‹tên món› chỉ còn N phần"; web hiển thị lỗi, khách sửa giỏ hàng. Use-case kết thúc thất bại. |
| E4 | 6 | Nhiều khách tranh cùng món, cập nhật tồn kho bị xung đột quá số lần thử | API trả 409 "Có nhiều người đặt cùng lúc, vui lòng thử lại"; không tạo đơn. |
| E5 | 10–11 | Khách bấm **Từ chối** ở BrewPay, hoặc cổng từ chối giao dịch | BrewPay gửi webhook `FAILED`; API ghi thanh toán `FAILED`, đơn `PENDING → PAYMENT_FAILED`, không cộng điểm; web báo lỗi kèm mã đơn, **giữ nguyên giỏ hàng**, cho khách thử lại (A5). |
| E6 | 12 | Lỗi khi ghi kết quả thanh toán vào CSDL | Transaction rollback, API trả 500 cho cổng; BrewPay gửi lại webhook (tối đa 5 lần) và lần sau được xử lý bình thường. |
| E7 | 8 | Dùng lại một `Idempotency-Key` cho đơn khác | API trả 409; web hiển thị thông báo. |
| E8 | 4–9 | Không kết nối được máy chủ | Web hiển thị "Không kết nối được máy chủ"; giỏ hàng giữ nguyên; khách thử lại (dùng lại khóa theo A3, A4). |
| E9 | 12 | Webhook sai chữ ký, hoặc số tiền khác số tiền của phiên | API trả 401 (sai chữ ký) hoặc 400 (sai số tiền), không đổi trạng thái thanh toán hay đơn hàng. |
| E10 | 9–10 | Khách không hoàn tất ở BrewPay trong 15 phút | API đánh phiên `FAILED`; BrewPay từ chối link đã hết hạn; web báo phiên hết hạn và cho thanh toán lại (A5). |

## 6. Quy tắc và dữ liệu sử dụng

- **Giá và giảm giá:** BR-01, BR-02, BR-04. Giá hiển thị ở web chỉ để tham khảo; số tiền thanh toán là `total` của đơn do server tính và được ký trong link sang BrewPay.
- **Tồn kho:** trừ trong transaction; sản phẩm luôn được khóa theo `productId` tăng dần để hai đơn không chờ nhau (deadlock).
- **Trạng thái:** chỉ đi theo BR-06; `PAID` và `PAYMENT_FAILED` chỉ do webhook có chữ ký hợp lệ của cổng thanh toán đặt (BR-07). Web không tự báo kết quả thanh toán.
- **Idempotency:** khóa đơn hàng gắn theo người dùng (`userId:key`); khóa thanh toán là duy nhất toàn hệ thống; webhook gửi lặp chỉ được xử lý một lần.
- **Thực thể liên quan:** `User`, `Product`, `Topping`, `Promotion`, `Order`, `OrderItem`, `Payment`, `LoyaltyTransaction` (xem class diagram ở Task 2). Thiết kế cổng thanh toán ở [ADR-007](../architecture/adr/007-cong-thanh-toan-mo-phong.md).

## 7. Gợi ý kiểm thử từ tiêu chí chấp nhận

Các tình huống dưới đây là đầu vào để viết test ở Task 4 và Task 5; mã test chính thức ghi trong ma trận truy vết.

| Tình huống | Luồng | Kết quả mong đợi |
| --- | --- | --- |
| Đặt 2 món, thanh toán Ví thành công ở BrewPay | Chính | Đơn `PAID`, tồn kho giảm đúng, điểm tăng theo BR-05, có giao dịch `EARN` |
| Bấm Từ chối ở BrewPay rồi thanh toán lại | E5, A5 | Lần đầu `PAYMENT_FAILED`, giỏ giữ nguyên; lần sau `PAID`, chỉ một đơn |
| Gửi 2 lần `POST /payments` cùng khóa | A4 | Một bản ghi thanh toán, cùng `paymentUrl`, lần hai `replayed: true` |
| Gửi cùng một webhook `SUCCESS` hai lần | A6 | Điểm chỉ cộng một lần, đơn vẫn `PAID` |
| Webhook sai chữ ký / sai số tiền | E9 | 401 / 400, đơn vẫn `PENDING` |
| Phiên quá 15 phút chưa có kết quả | E10 | Thanh toán `FAILED`, khách mở được phiên mới |
| 10 khách đặt đồng thời món còn 3 phần | E3, E4 | Đúng 3 đơn thành công, tồn kho về 0 |
| Gọi `POST /orders` không có JWT | E2 | 401 |
| Đặt 21 ly một dòng | E1 | 400 |
| Mã `HETHAN` (đã hết hạn) | A2 | Bị từ chối kèm lý do "đã hết hạn" |
| Chưa đăng nhập bấm Thanh toán | A1 | Chuyển tới Đăng nhập, xong quay lại trang Thanh toán |
