# ADR-003: PostgreSQL với Prisma ORM và migration tiến một chiều

**Trạng thái:** Chấp nhận

## Bối cảnh

Đề bài bắt buộc PostgreSQL. Nghiệp vụ cần transaction, khóa dòng (`SELECT … FOR UPDATE`), ràng buộc UNIQUE cho khóa idempotency và cập nhật có điều kiện cho optimistic locking. Schema thay đổi qua hai Sprint (ví dụ thêm bảng `LoyaltyTransaction`, các bảng nguyên liệu và công thức của ADR-011) và phải tái tạo được ở local, CI và production.

## Quyết định

- Dùng **Prisma 6**: schema khai báo trong `apps/api/prisma/schema.prisma`, Prisma Client có kiểu TypeScript.
- Mỗi thay đổi schema tạo một migration bằng `prisma migrate dev --name <mô-tả>` và commit thư mục `prisma/migrations/`.
- Môi trường dùng chung (CI, production) chỉ chạy **`prisma migrate deploy`**: áp các migration chưa chạy theo thứ tự, không xóa dữ liệu. Không dùng `migrate reset` hay `db push` ngoài máy cá nhân.
- Migration theo nguyên tắc **expand – contract**: phiên bản mới chỉ thêm bảng/cột (có giá trị mặc định hoặc cho phép null); việc xóa cột cũ làm ở phiên bản sau, khi không còn image nào dùng. Nhờ vậy rollback image API không cần rollback CSDL.
- Seed (`prisma/seed.ts`) dùng `upsert`, chạy lại an toàn: cập nhật menu và công thức, không ghi đè tồn kho nguyên liệu đang có.
- Test integration chạy trên một CSDL PostgreSQL riêng (service container trong CI), không dùng CSDL giả lập.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
| --- | --- |
| TypeORM với `synchronize: true` | Tự sửa schema khi khởi động, dễ mất dữ liệu production; migration kém tường minh |
| Viết SQL tay hoàn toàn | Không có kiểu dữ liệu cho TypeScript; tốn công |
| SQLite cho local/test | Khác PostgreSQL về khóa dòng và kiểu dữ liệu; test không phản ánh production |

## Hệ quả

- Lịch sử schema nằm trong Git, review được qua pull request.
- Khóa dòng và một số truy vấn đặc thù phải viết SQL thô qua `$queryRaw`.
- Pipeline CD chạy migration **trước** khi deploy image mới; migration lỗi thì dừng pipeline, phiên bản cũ vẫn chạy.
