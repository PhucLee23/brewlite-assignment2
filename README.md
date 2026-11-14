# BrewLite – đặt cà phê không tiền mặt

Bài tập lớn môn Công nghệ Phần mềm (Assignment 2), Trường Đại học Sài Gòn. Ứng dụng web/PWA giúp khách tự chọn đồ uống, thanh toán không tiền mặt qua cổng MoMo hoặc VNPay (môi trường sandbox) và nhận nước tại quầy; nhân viên quầy theo dõi đơn, cập nhật trạng thái pha chế, xem doanh thu và nhập kho nguyên liệu.

- **Công nghệ:** Next.js 15 (web, mobile-first/PWA), NestJS 11 + Prisma 6 (API), PostgreSQL 16, Docker, GitHub Actions.
- **Quy trình:** yêu cầu → mô hình hóa → kiến trúc → hai Sprint → CI/CD và triển khai; code được hiện thực từ tài liệu thiết kế trong `docs/`.
- **Phiên bản:** `v1.0.0` – xem [release notes](docs/release-notes.md).

## Production

| Thành phần | URL |
| --- | --- |
| Web | `https://brewlite-web.vercel.app` |
| API | `https://brewlite-api-wjwg.onrender.com` – health check `https://brewlite-api-wjwg.onrender.com/health` |

Lần truy cập đầu sau khi rảnh 15 phút có thể chờ khoảng 1 phút vì API chạy gói miễn phí của Render (rủi ro R-01).

**Tài khoản mẫu:** `khach@brewlite.vn` / `123456` (khách), `barista@brewlite.vn` / `123456` (nhân viên quầy). **Mã giảm giá:** `BREW10` (10%), `WELCOME20` (20%, đơn từ 100.000đ), `HETHAN` (đã hết hạn).

## Chạy ở máy cá nhân

Yêu cầu: Docker Desktop và Internet (để mở trang thanh toán MoMo, VNPay sandbox). Chạy cả 3 dịch vụ (web, API, PostgreSQL) bằng một lệnh:

```bash
git clone https://github.com/PhucLee23/brewlite-assignment2.git
cd brewlite-assignment2
cp .env.example .env          # điền VNPAY_TMN_CODE, VNPAY_HASH_SECRET: khóa sandbox của nhóm, không commit
docker compose up -d --build
```

| Dịch vụ | Địa chỉ |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:4000 (`/health`) |
| PostgreSQL | `localhost:5432`, user/mật khẩu/CSDL `brewlite` |

API tự áp migration và nạp dữ liệu mẫu khi khởi động. Dừng: `docker compose down`.

**Thử luồng thanh toán:** đặt món → *Thanh toán* → chọn MoMo hoặc VNPay → trang của cổng (sandbox, không trừ tiền thật). Trả xong, cổng chuyển về BrewLite và đơn sang *Đã thanh toán*; bấm *Hủy* trên trang cổng thì đơn báo thanh toán không thành công, giỏ hàng giữ nguyên.

| Cổng | Thẻ thử |
| --- | --- |
| VNPay | Ngân hàng NCB · số thẻ `9704198526191432198` · tên `NGUYEN VAN A` · ngày phát hành `07/15` · OTP `123456` |
| MoMo | Chọn thẻ ATM · số thẻ `9704000000000018` · tên `NGUYEN VAN A` · ngày phát hành `03/07` · OTP `OTP` |

Nhân viên (`barista@brewlite.vn`) có thêm *Quầy*, *Kho* (nhập thêm nguyên liệu) và *Doanh thu* (giao dịch, biên lai).

### Chạy từng phần khi phát triển

Cần Node.js 22.

```bash
docker compose up -d db                       # chỉ PostgreSQL
cd apps/api && npm ci && cp ../../.env.example .env
npx prisma migrate deploy && npx prisma db seed
npm run start:dev                             # API :4000

cd apps/web && npm ci && npm run dev          # web :3000
```

## Kiểm thử

| Loại | Lệnh | Mã test |
| --- | --- | --- |
| Unit test API (tính giá, mã giảm giá, state machine, điểm thưởng, nguyên liệu, chữ ký cổng) | `cd apps/api && npm test` | UT-01 – UT-06 |
| Integration test API trên PostgreSQL thật (cổng MoMo, VNPay giả, không gọi Internet) | `cd apps/api && npm run test:int` (cần `docker compose up -d db`) | API-T01 – API-T17 |
| Component test web | `cd apps/web && npm test` | CT-01 – CT-03 |
| End-to-end (Playwright, cổng VNPay giả) | `docker compose -f docker-compose.yml -f tests/e2e/docker-compose.e2e.yml up -d --build`, rồi `cd tests/e2e && npm ci && npx playwright install chromium && npm test` | E2E-T01 – E2E-T04 |

Lint và build: `npm run lint`, `npm run build` trong `apps/api`, `apps/web` (web có thêm `npm run typecheck`).

## Build, deploy và rollback

- **CI** (`.github/workflows/ci.yml`): mọi pull request vào `main` chạy lint, unit test, integration test, build và E2E. Chỉ merge khi mọi job xanh và có approve.
- **CD** (`.github/workflows/cd.yml`): merge vào `main` hoặc đẩy tag `v*` → quality gate → build image API (tag commit SHA) → push GHCR → `prisma migrate deploy` trên Neon → deploy Render (API) và Vercel (web) → smoke test `/health`, `/products` và trang chủ.
- **Rollback:** *Actions → Rollback → Run workflow* với commit SHA của bản ổn định (API); web chọn *Promote to Production* bản cũ trên Vercel.

Chi tiết thiết lập production, secret và các bước rollback: [docs/deployment.md](docs/deployment.md).

## Tài liệu

| Nội dung | Tệp |
| --- | --- |
| Bối cảnh, stakeholder, phạm vi | [docs/requirements/context-and-scope.md](docs/requirements/context-and-scope.md) |
| Đặc tả yêu cầu (SRS) | [docs/requirements/srs.md](docs/requirements/srs.md) |
| Đặc tả use-case trọng tâm | [docs/requirements/uc-06-dat-va-thanh-toan.md](docs/requirements/uc-06-dat-va-thanh-toan.md) |
| Sơ đồ activity, sequence, class, luồng dữ liệu | [docs/diagrams/](docs/diagrams/) |
| Kiến trúc, ADR, deployment và implementation diagram | [docs/architecture/](docs/architecture/) |
| Ma trận truy vết | [docs/traceability-matrix.md](docs/traceability-matrix.md) |
| Triển khai, rollback | [docs/deployment.md](docs/deployment.md) |
| Quy trình: Definition of Done, nhánh, commit | [docs/process/](docs/process/) |
| Product Backlog, Sprint, Review, Retrospective | [docs/scrum/](docs/scrum/) |
| Release notes | [docs/release-notes.md](docs/release-notes.md) |

## Cấu trúc repository

```
apps/web/              Next.js (mobile-first, PWA)
apps/api/              NestJS + Prisma (migration, seed trong prisma/)
docs/                  requirements/, diagrams/, architecture/, process/, scrum/, deployment.md
tests/integration/     integration test API (API-Txx)
tests/e2e/             end-to-end test Playwright (E2E-Txx), cổng VNPay giả mock-vnpay/
.github/workflows/     CI, CD, rollback
docker-compose.yml     web + API + PostgreSQL ở local
```

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

Phân công Task 4–5 theo từng hạng mục nằm trong Sprint Backlog: [Sprint 1](docs/scrum/sprint-1.md), [Sprint 2](docs/scrum/sprint-2.md).
