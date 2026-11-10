# ADR-011: Tồn kho theo nguyên liệu và công thức, số ly còn bán được tính khi đọc

**Trạng thái:** Chấp nhận (thay mục 1 của [ADR-006](006-nhat-quan-ton-kho-va-idempotency.md))

## Bối cảnh

Thiết kế ban đầu lưu `stock` (số phần) trên từng món. Quán thật không quản lý kho theo món mà theo **nguyên liệu**: nhiều món dùng chung hạt espresso, sữa tươi, ly nhựa; size lớn tốn nhiều nguyên liệu hơn; topping cũng tốn nguyên liệu. Khi nghiệm thu thiết kế, yêu cầu được làm rõ: số ly còn bán được phải tính từ nguyên liệu, và nhân viên cần nhập thêm hàng vào kho. Yêu cầu liên quan: FR-01, FR-02, FR-03, FR-05, FR-08, FR-16, FR-20, FR-24, BR-09, NFR-06.

## Quyết định

- **Dữ liệu:**
  - `Ingredient` (`name` duy nhất, `unit` g/ml/cái, `stock`, `version` cho optimistic locking, `scalesWithSize`).
  - `ProductIngredient (productId, ingredientId, amount)`: công thức 1 ly size S; `ToppingIngredient`: lượng cho 1 phần topping.
  - `OrderIngredient (orderId, ingredientId, amount)`: lượng đã trừ của một đơn, cộng dồn mọi dòng.
  - `Product` bỏ cột `stock`, `version`.
- **Tỉ lệ size (BR-09):** size M dùng 125%, size L dùng 150% lượng size S, làm tròn lên; nguyên liệu `scalesWithSize = false` (ly nhựa) luôn 1 cái mỗi ly; topping không đổi theo size.
- **Số ly còn bán được tính khi đọc, không lưu:** với một lựa chọn (món, size, topping), số ly = giá trị nhỏ nhất của `floor(stock / lượng cần cho 1 ly)` trên mọi nguyên liệu của lựa chọn đó. `GET /products` trả `stock` = số ly size S; `GET /products/:id` trả thêm số ly của từng size và số phần còn của từng topping. Hàm tính nằm chung một chỗ (`apps/api/src/ingredients/inventory.ts`) cho menu, tạo đơn và trang Kho.
- **Trừ khi tạo đơn:** cộng dồn nguyên liệu cần cho cả đơn; trong transaction, trừ từng nguyên liệu theo `ingredientId` tăng dần bằng optimistic locking (`UPDATE … SET stock = stock - cần, version = version + 1 WHERE id = ? AND version = ?`, 0 dòng thì đọc lại và thử lại). Thiếu thì 409 và rollback toàn bộ; thông báo nêu món, size và số ly còn lại, hoặc tên nguyên liệu khi nhiều dòng dùng chung. Lưu `OrderIngredient`.
- **Trả lại khi hủy:** hủy đơn (khách, nhân viên, tự hủy) cộng lại đúng lượng trong `OrderIngredient`, cùng thứ tự `ingredientId` tăng dần.
- **Nhập kho:** `POST /ingredients/:id/restock` (STAFF) cộng `amount` và tăng `version` trong **một câu UPDATE**, nên đơn đang trừ cùng nguyên liệu phải đọc lại tồn mới thay vì ghi đè. Không tạo nguyên liệu mới, không lưu lịch sử nhập (phiên bản sau).
- **Seed:** nạp nguyên liệu, công thức; chạy lại chỉ cập nhật thông tin và công thức, không ghi đè tồn kho đang có.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
| --- | --- |
| Giữ `stock` theo món | Không phản ánh việc nhiều món dùng chung nguyên liệu; size L và size S bị tính như nhau |
| Lưu sẵn số ly còn bán được của từng món, cập nhật khi đặt đơn | Mỗi đơn phải cập nhật lại mọi món dùng chung nguyên liệu; dễ lệch với tồn kho thật |
| Khóa bi quan `SELECT … FOR UPDATE` trên nguyên liệu | Nguyên liệu phổ biến (ly nhựa, sữa) bị khóa ở gần như mọi đơn, giảm khả năng phục vụ đồng thời |
| Lượng size M, L khai báo riêng cho từng món | Gấp ba lượng dữ liệu công thức; quán dùng tỉ lệ cố định nên một quy tắc chung là đủ |

## Hệ quả

- Không bán quá nguyên liệu đang có kể cả khi nhiều khách đặt đồng thời các món dùng chung nguyên liệu (integration test đặt đồng thời, nhập kho đồng thời).
- `GET /products` phải đọc thêm công thức và tồn nguyên liệu; số món và nguyên liệu nhỏ (15 món, khoảng 20 nguyên liệu) nên vẫn trong ngưỡng NFR-01.
- Mọi đơn trừ ly nhựa nên dòng `Ingredient` của ly nhựa có tranh chấp cao nhất; optimistic locking thử lại tối đa 20 lần, hết lượt thì báo khách thử lại.
- Sửa công thức trong seed có hiệu lực ở lần khởi động sau; màn hình sửa menu, giá, công thức để phiên bản sau.
