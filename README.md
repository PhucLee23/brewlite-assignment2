# BrewLite – đặt cà phê không tiền mặt

Bài tập lớn môn Công nghệ Phần mềm (Assignment 2), Trường Đại học Sài Gòn. Ứng dụng web/PWA giúp khách tự chọn đồ uống, thanh toán không tiền mặt và nhận nước tại quầy.

- **Công nghệ:** Next.js (web, mobile-first/PWA), NestJS (API), PostgreSQL, Docker.
- **Quy trình:** yêu cầu → mô hình hóa → kiến trúc → hai Sprint → CI/CD và triển khai; code được hiện thực từ tài liệu thiết kế trong `docs/`.

## Tài liệu

Tài liệu yêu cầu, sơ đồ và kiến trúc nằm trong thư mục [docs/](docs/README.md).

## Cấu trúc repository

```
apps/web/              Next.js (mobile-first, PWA)
apps/api/              NestJS + Prisma
apps/payment-gateway/  BrewPay – cổng thanh toán mô phỏng bên thứ ba
docs/                  requirements/, diagrams/, architecture/, traceability-matrix.md
tests/                 integration test, end-to-end test
.github/workflows/     CI/CD
```

Mã nguồn, hướng dẫn chạy local, kiểm thử và triển khai được bổ sung ở Sprint 1 và Sprint 2.

## Nhóm phát triển

| Thành viên | Vai trò Scrum | Mảng chính |
| --- | --- | --- |
| TV1 | Scrum Master | Quy trình, kiến trúc, CI, xác thực |
| TV2 | Product Owner | Yêu cầu, backlog, kiểm thử nghiệm thu |
| TV3 | Developer | Backend: CSDL, sản phẩm, đơn hàng |
| TV4 | Developer | Backend: thanh toán, cổng BrewPay, triển khai production |
| TV5 | Developer | Frontend lead: giỏ hàng, thanh toán, E2E |
| TV6 | Developer | Frontend: menu, đơn hàng, màn hình quầy, PWA |
