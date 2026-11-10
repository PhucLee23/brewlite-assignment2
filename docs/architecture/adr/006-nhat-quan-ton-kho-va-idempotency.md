# ADR-006: Optimistic locking cho tồn kho, khóa idempotency cho đặt đơn và thanh toán

**Trạng thái:** Chấp nhận; mục 1 cập nhật theo [ADR-011](011-ton-kho-theo-nguyen-lieu.md) (trừ theo nguyên liệu), mục 5, 6 cập nhật theo [ADR-010](010-cong-thanh-toan-momo-vnpay.md) (cổng MoMo, VNPay)

## Bối cảnh

Món giới hạn (ví dụ Cold brew) có thể bị nhiều khách đặt cùng lúc (R-04). Mạng điện thoại chậm khiến client gửi lại yêu cầu đặt đơn hoặc thanh toán (R-05). Hủy đơn và thanh toán có thể xảy ra đồng thời trên cùng một đơn. Yêu cầu liên quan: FR-08, FR-10, FR-12, FR-16, FR-17, NFR-06.

## Quyết định

1. **Tồn kho – optimistic locking:** bảng `Ingredient` có cột `version` (ADR-011). Trong transaction tạo đơn, với từng nguyên liệu (theo `ingredientId` tăng dần để tránh deadlock): đọc `stock, version`; nếu thiếu trả 409; nếu đủ thì
   `UPDATE … SET stock = stock - cần, version = version + 1 WHERE id = ? AND version = ?`.
   Cập nhật 0 dòng nghĩa là vừa có người khác trừ kho → đọc lại và thử lại (tối đa vài lần), hết lượt thì trả 409.
2. **Trạng thái đơn:** mọi thay đổi qua `transitionOrder(from, to)`: kiểm tra bảng chuyển tiếp (BR-06) rồi `UPDATE … WHERE id = ? AND status = from`; 0 dòng → 409.
3. **Khóa dòng đơn:** hủy đơn và giữ chỗ thanh toán cùng chạy `SELECT … FROM "Order" WHERE id = ? FOR UPDATE`; không hủy khi đang có thanh toán `PROCESSING`.
4. **Idempotency đặt đơn:** header `Idempotency-Key` tùy chọn, lưu vào `Order.idempotencyKey` (UNIQUE) dạng `userId:key` để hai người dùng không đụng nhau. Trùng khóa → trả đơn đã có.
5. **Idempotency thanh toán:** header bắt buộc. Trước khi mở phiên ở cổng MoMo hoặc VNPay, tạo bản ghi `Payment` trạng thái `PROCESSING` với khóa UNIQUE (giữ chỗ). Gửi lại cùng khóa → trả lại đúng phiên đã có (`replayed: true`), không mở phiên mới. Mỗi đơn chỉ có một phiên còn hạn; phiên quá 15 phút được đánh `FAILED` để đơn không kẹt.
6. **Idempotency kết quả thanh toán:** cùng một kết quả có thể đến nhiều lần (link quay về, IPN, API tra cứu, cổng gửi lặp IPN). Kết quả chỉ được ghi khi `Payment` còn `PROCESSING`, trong cùng transaction (có khóa dòng đơn) với việc đổi trạng thái đơn và cộng điểm; lần đến sau thấy thanh toán không còn `PROCESSING` thì bỏ qua.
7. **Điểm thưởng:** bảng `LoyaltyTransaction` có ràng buộc UNIQUE `(orderId, type)` nên mỗi đơn chỉ cộng (`EARN`) và thu hồi (`REVOKE`) một lần.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
| --- | --- |
| Khóa bi quan `SELECT … FOR UPDATE` trên `Product` | Đơn giản nhưng giữ khóa lâu trong lúc tính giá; giảm khả năng phục vụ đồng thời ở món phổ biến |
| Khóa toàn bảng / isolation `SERIALIZABLE` | Nhiều lỗi tuần tự hóa phải thử lại; khó kiểm soát |
| Chống bấm hai lần chỉ ở giao diện | Không xử lý được gửi lại do mạng, nhiều tab, hoặc client khác |

## Hệ quả

- Không bán quá tồn kho và không trừ tiền hai lần, được chứng minh bằng integration test đồng thời trong CI.
- Client phải sinh và giữ khóa: khóa đơn gắn với nội dung giỏ hàng; khóa thanh toán sinh mới cho mỗi lần thử, giữ nguyên khi gửi lại cùng lần thử.
- Bảng `Payment` và `Order` lưu khóa vĩnh viễn; có thể dọn khóa cũ ở phiên bản sau.
