# ADR-002: Backend NestJS dạng monolith phân lớp theo module nghiệp vụ

**Trạng thái:** Chấp nhận

## Bối cảnh

API phục vụ menu, xác thực, đặt đơn, thanh toán, điểm thưởng và quản lý trạng thái. Các nghiệp vụ đặt đơn và thanh toán cần transaction trên nhiều bảng (nguyên liệu, đơn, thanh toán, điểm). Lượng truy cập dự kiến nhỏ (A-07), nhóm 6 người, triển khai trên gói miễn phí nên cần ít service nhất có thể. Cổng thanh toán MoMo, VNPay là hệ thống bên thứ ba (ADR-010), không thuộc phạm vi quyết định này; API chỉ gọi cổng qua module `payments`.

## Quyết định

- Một ứng dụng NestJS duy nhất (**modular monolith**), chia module theo nghiệp vụ: `auth`, `products`, `ingredients` (nguyên liệu, công thức, kho – ADR-011), `promotions`, `orders`, `payments` (kèm `payments/gateways` cho MoMo, VNPay), `loyalty`, `health`, cùng `prisma` và `common` dùng chung.
- Trong mỗi module dùng ba lớp: **Controller** (HTTP, guard, DTO) → **Service** (quy tắc nghiệp vụ, transaction) → **Prisma** (truy cập dữ liệu).
- Quy tắc thuần (tính giá, state machine) tách thành hàm không phụ thuộc framework (`pricing.ts`, `order-state-machine.ts`) để unit test trực tiếp.
- Validate đầu vào tập trung bằng `ValidationPipe` toàn cục (`whitelist`, `forbidNonWhitelisted`, `transform`).

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
| --- | --- |
| Microservice (đơn hàng, thanh toán, sản phẩm tách riêng) | Cần giao dịch phân tán cho trừ kho + tạo đơn + thanh toán; tốn nhiều service trên gói miễn phí; quá phức tạp cho quy mô dự án |
| Clean/Hexagonal architecture đầy đủ (repository interface cho mọi bảng) | Thêm nhiều lớp trung gian; Prisma đã đủ trừu tượng; chỉ áp dụng interface ở chỗ cần thay thế (cổng thanh toán, ADR-007) |

## Hệ quả

- Transaction trong một CSDL đảm bảo trừ kho và tạo đơn cùng thành công hoặc cùng hủy.
- Module có ranh giới rõ, sau này có thể tách thành service riêng nếu cần mở rộng.
- Toàn bộ API chạy trong một container: một lỗi nghiêm trọng ảnh hưởng mọi chức năng; giảm thiểu bằng health check và nền tảng tự khởi động lại.
