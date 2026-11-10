# BrewLite – đặt cà phê không tiền mặt

Bài tập lớn môn Công nghệ Phần mềm (Assignment 2), Trường Đại học Sài Gòn. Ứng dụng web/PWA giúp khách tự chọn đồ uống, thanh toán không tiền mặt qua cổng MoMo hoặc VNPay (môi trường sandbox) và nhận nước tại quầy; nhân viên quầy theo dõi đơn, xem doanh thu và nhập kho nguyên liệu.

- **Công nghệ:** Next.js (web, mobile-first/PWA), NestJS (API), PostgreSQL, Docker.
- **Quy trình:** yêu cầu → mô hình hóa → kiến trúc → hai Sprint → CI/CD và triển khai; code được hiện thực từ tài liệu thiết kế trong `docs/`.

## Tài liệu

| Nội dung | Tệp |
| --- | --- |
| Bối cảnh, stakeholder, phạm vi | [docs/requirements/context-and-scope.md](docs/requirements/context-and-scope.md) |
| Đặc tả yêu cầu (SRS) | [docs/requirements/srs.md](docs/requirements/srs.md) |
| Đặc tả use-case trọng tâm | [docs/requirements/uc-06-dat-va-thanh-toan.md](docs/requirements/uc-06-dat-va-thanh-toan.md) |
| Sơ đồ activity, sequence, class, luồng dữ liệu | [docs/diagrams/](docs/diagrams/) |
| Kiến trúc, ADR, deployment và implementation diagram | [docs/architecture/](docs/architecture/) |
| Ma trận truy vết | [docs/traceability-matrix.md](docs/traceability-matrix.md) |

Danh mục đầy đủ và quy ước tài liệu: [docs/README.md](docs/README.md).

## Cấu trúc repository

```
apps/web/              Next.js (mobile-first, PWA)
apps/api/              NestJS + Prisma
docs/                  requirements/, diagrams/, architecture/, traceability-matrix.md
tests/                 integration test, end-to-end test
.github/workflows/     CI/CD
```

Mã nguồn, hướng dẫn chạy local, kiểm thử và triển khai được bổ sung ở Sprint 1 và Sprint 2.

## Nhóm phát triển

| Thành viên | Vai trò Scrum | Mảng chính |
| --- | --- | --- |
| TV1 | Scrum Master | Quy trình, kiến trúc, CI, xác thực, mã giảm giá, Docker |
| TV2 | Product Owner | Yêu cầu, backlog, kiểm thử nghiệm thu, điểm thưởng, màn hình quầy |
| TV3 | Developer | Backend: CSDL, sản phẩm, nguyên liệu và kho, xem và hủy đơn; E2E |
| TV4 | Developer | Backend: tạo đơn, thanh toán qua cổng MoMo, VNPay, CD và production |
| TV5 | Developer | Frontend lead: khung web, menu, chi tiết món, đăng nhập, lịch sử đơn, API doanh thu |
| TV6 | Developer | Frontend: giỏ hàng, thanh toán, doanh thu, kho, PWA |

### Phân công tài liệu Task 1–3

| Task | Tài liệu | Thực hiện |
| --- | --- | --- |
| Task 1 – Yêu cầu | [Bối cảnh, stakeholder, phạm vi](docs/requirements/context-and-scope.md); [SRS](docs/requirements/srs.md) | TV2 |
| | [Sơ đồ use-case tổng quát](docs/requirements/use-case-overview.svg) | TV6 |
| | [Đặc tả UC-06 Đặt và thanh toán đơn hàng](docs/requirements/uc-06-dat-va-thanh-toan.md) | TV5 |
| Task 2 – Mô hình hóa | [Activity-01 đặt hàng](docs/diagrams/activity-01-dat-hang.svg) | TV5 |
| | [Activity-02 xử lý đơn tại quầy](docs/diagrams/activity-02-xu-ly-don.svg) | TV6 |
| | [Activity-03 tự hủy đơn](docs/diagrams/activity-03-tu-huy-don.svg); [sơ đồ luồng dữ liệu](docs/diagrams/luong-du-lieu.svg) | TV2 |
| | [Sequence diagram đặt và thanh toán](docs/diagrams/sequence-checkout.svg) | TV4 |
| | [Class diagram mức domain](docs/diagrams/class-domain.svg) | TV3 |
| Task 3 – Kiến trúc | [Mô tả kiến trúc, C4](docs/architecture/architecture.md); [deployment diagram](docs/architecture/deployment.svg); [implementation diagram](docs/architecture/implementation.svg); ADR-001, ADR-008, ADR-009 | TV1 |
| | ADR-002 kiến trúc phân lớp, ADR-003 Prisma và migration | TV3 |
| | ADR-004 frontend Next.js, PWA | TV5 |
| | ADR-005 xác thực JWT | TV6 |
| | ADR-006 tồn kho và idempotency, ADR-007, ADR-010 cổng thanh toán, ADR-011 tồn kho theo nguyên liệu | TV4 |
| Truy vết | [Ma trận truy vết](docs/traceability-matrix.md) | TV2 |
