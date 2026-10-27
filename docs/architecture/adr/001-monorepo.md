# ADR-001: Dùng monorepo cho web, API và tài liệu

**Trạng thái:** Chấp nhận

## Bối cảnh

BrewLite có frontend Next.js, backend NestJS, tài liệu yêu cầu, sơ đồ và pipeline CI/CD. Đề bài yêu cầu truy vết từ yêu cầu tới code và test, và mọi thay đổi tài liệu phải đi qua pull request. Nhóm có 6 người, nhiều tính năng chạm cả API lẫn giao diện (ví dụ thêm điểm thưởng).

## Quyết định

Dùng **một repository** với cấu trúc:

```
apps/web              Next.js
apps/api              NestJS + Prisma
apps/payment-gateway  BrewPay – cổng thanh toán mô phỏng bên thứ ba
docs/        yêu cầu, sơ đồ, kiến trúc, truy vết, triển khai
tests/       integration test và E2E test
.github/workflows/
```

Mỗi ứng dụng giữ `package.json` riêng (không dùng npm workspaces) để Dockerfile và lệnh `npm ci` của từng ứng dụng độc lập.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
| --- | --- |
| Hai repository riêng cho web và API | Một tính năng phải mở hai pull request; khó truy vết; hai pipeline |
| Monorepo với npm workspaces / Turborepo | Thêm công cụ cần học; Dockerfile phải xử lý lockfile chung; lợi ích chưa cần với ba ứng dụng nhỏ |

## Hệ quả

- Một pull request chứa đủ thay đổi API, giao diện, test và tài liệu liên quan; người review thấy toàn cảnh.
- Pipeline CI tách job theo thư mục (`apps/web`, `apps/api`, `apps/payment-gateway`) và chạy song song.
- BrewPay nằm chung repository cho tiện chạy và kiểm thử, nhưng được coi là hệ thống bên ngoài: không import code của `apps/api`, không dùng chung CSDL, chỉ giao tiếp qua HTTP.
- Ma trận truy vết dẫn link tương đối tới code trong cùng repository.
