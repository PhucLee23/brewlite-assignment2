# Triển khai BrewLite

Hướng dẫn chạy local bằng Docker Compose, thiết lập production và pipeline CI/CD, rollback. Kiến trúc triển khai và lý do chọn nền tảng: [deployment diagram](architecture/deployment.svg), [ADR-008](architecture/adr/008-nen-tang-trien-khai.md), [ADR-009](architecture/adr/009-ci-cd-github-actions.md).

## 1. Môi trường

| Môi trường | Web | API | Cổng thanh toán | CSDL |
| --- | --- | --- | --- | --- |
| Local | Docker Compose `web` :3000 | `api` :4000 | MoMo, VNPay sandbox (Internet) | `db` :5432 (volume `db_data`) |
| CI | build và test trên GitHub Actions | integration test trên service container `postgres:16` | cổng giả trong test, không gọi Internet | CSDL `brewlite_test` tạm thời |
| Production | Vercel | Render Web Service `brewlite-api` (image GHCR) | MoMo, VNPay sandbox; IPN gọi về URL của API | Neon PostgreSQL, chỉ API truy cập, `sslmode=require` |

## 2. Chạy local bằng Docker Compose

```bash
cp .env.example .env          # điền VNPAY_TMN_CODE, VNPAY_HASH_SECRET (khóa sandbox của nhóm)
docker compose up -d --build  # db, api, web
```

- API tự chạy `prisma migrate deploy` và seed khi khởi động (`RUN_MIGRATIONS`, `RUN_SEED` trong compose).
- Mở http://localhost:3000. Tài khoản mẫu: `khach@brewlite.vn` / `123456` (khách), `barista@brewlite.vn` / `123456` (nhân viên quầy). Mã giảm giá: `BREW10`, `WELCOME20` (từ 100.000đ), `HETHAN` (đã hết hạn).
- Kiểm tra: `curl http://localhost:4000/health`.
- Thanh toán cần Internet. Thẻ thử: VNPay chọn ngân hàng NCB, số thẻ `9704198526191432198`, tên `NGUYEN VAN A`, ngày phát hành `07/15`, OTP `123456`; MoMo chọn thẻ ATM, số thẻ `9704000000000018`, tên `NGUYEN VAN A`, ngày phát hành `03/07`, OTP `OTP`.
- Ở máy cá nhân, cổng không gọi được IPN về `localhost`; API xác nhận bằng link quay về và API tra cứu của cổng nên kết quả vẫn đúng.
- Dừng: `docker compose down` (thêm `-v` để xóa cả dữ liệu CSDL).
- `NEXT_PUBLIC_API_URL` được nhúng lúc build image web; đổi giá trị này thì phải `docker compose up -d --build web`.

## 3. Thiết lập production (làm một lần)

### 3.1 Neon (PostgreSQL)

1. Tạo project ở vùng `ap-southeast-1` (Singapore, cùng vùng với Render), Postgres 16.
2. Ở hộp *Connect*, tắt *Connection pooling* để lấy chuỗi kết nối **direct** dạng `postgresql://…?sslmode=require`: `prisma migrate deploy` cần kết nối trực tiếp, không chạy ổn qua pooler.
3. Lưu chuỗi kết nối vào GitHub Secret `DATABASE_URL` và biến môi trường `DATABASE_URL` của service `brewlite-api`. Không đưa chuỗi này vào frontend hay repository.

### 3.2 Image đầu tiên trên GHCR

Render chỉ tạo được service khi image đã có trên registry, còn CD chỉ đẩy image sau lần merge đầu tiên, nên image đầu tiên đẩy từ máy cá nhân (token GitHub có quyền `write:packages`):

```bash
docker build --build-arg APP_VERSION=<sha> \
  --label org.opencontainers.image.source=https://github.com/<owner>/<repo> \
  -t ghcr.io/<owner>/brewlite-api:<sha> apps/api
docker push ghcr.io/<owner>/brewlite-api:<sha>
```

Sau đó vào trang package `brewlite-api` trên GitHub → *Package settings*:

- *Manage Actions access*: thêm repository này với quyền **Write**, để workflow CD đẩy được image mới.
- *Change visibility* → **Public**: Render kéo image không cần credential. Image không chứa secret; secret chỉ nhập ở Render lúc chạy.

### 3.3 Render (API)

Tạo 1 **Web Service** loại *Existing image*, vùng Singapore, gói Free:

| Service | Image | Biến môi trường | Health check path |
| --- | --- | --- | --- |
| `brewlite-api` | `ghcr.io/<owner>/brewlite-api:<sha>` | `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL` (URL Vercel, thêm `http://localhost:3000` cách nhau bằng dấu phẩy nếu cần), `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `PUBLIC_API_URL` (URL của chính `brewlite-api`, để MoMo gọi IPN) | `/health` |

- Nếu để package GHCR ở chế độ private thì phải thêm *Registry Credential* (GitHub username + Personal Access Token quyền `read:packages`).
- `JWT_SECRET`: chuỗi ngẫu nhiên dài (nút *Generate* của Render, hoặc `openssl rand -hex 32`).
- Lấy *Deploy Hook* của service (*Settings → Deploy Hook*), lưu vào GitHub Secret `RENDER_DEPLOY_HOOK_API`.
- CSDL Neon còn trống cho tới lần chạy CD đầu tiên (job `migrate` tạo bảng và seed), nên trước đó `GET /products` trả 500 là bình thường.

### 3.4 Cổng thanh toán sandbox

1. **VNPay:** đăng ký merchant tại https://sandbox.vnpayment.vn/devreg để nhận mã website (`vnp_TmnCode`) và chuỗi bí mật (`vnp_HashSecret`). Cả nhóm dùng chung một bộ khóa; khóa chỉ nằm trong `.env` của từng máy và biến môi trường của Render, không commit.
2. **IPN của VNPay:** trang quản lý merchant sandbox không có ô tự cấu hình IPN URL; muốn nhận IPN thì gửi yêu cầu cho VNPay với địa chỉ `<URL API>/payments/vnpay/ipn`. Khi chưa có IPN, API vẫn xác nhận thanh toán qua link quay về (`POST /payments/:id/return`) và API tra cứu giao dịch của cổng.
3. **MoMo:** dùng bộ khóa test công khai của MoMo (mặc định trong code), IPN đi tới `<PUBLIC_API_URL>/payments/momo/ipn`.

### 3.5 Vercel (web)

1. Import repository, chọn *Import single project* cho `apps/web` (không chọn `apps/api`): **Root Directory** = `apps/web`, framework Next.js.
2. Biến môi trường `NEXT_PUBLIC_API_URL` = URL của `brewlite-api`.
3. Sau lần deploy đầu tiên, ngắt kết nối Git (*Settings → Git → Disconnect*): từ đó web chỉ được deploy bởi pipeline CD bằng Vercel CLI, sau khi CI đã qua.
4. Lưu GitHub Secret `VERCEL_ORG_ID` (*Team Settings → General → Team ID*), `VERCEL_PROJECT_ID` (*Project Settings → General → Project ID*) và `VERCEL_TOKEN` (*Account Settings → Tokens*, scope tài khoản).

### 3.6 GitHub

| Loại | Tên | Giá trị |
| --- | --- | --- |
| Secret | `DATABASE_URL` | Chuỗi kết nối Neon |
| Secret | `RENDER_DEPLOY_HOOK_API` | Deploy hook của Render |
| Secret | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Vercel |
| Variable | `API_URL`, `WEB_URL` | URL production, dùng cho smoke test |

Secret chỉ nằm trong GitHub Secrets và trang cấu hình Render, Vercel; workflow không in secret ra log (NFR-05).

## 4. Pipeline

**CI** (`.github/workflows/ci.yml`) chạy trên mọi pull request vào `main`: job `api` (lint → unit test → build → integration test), `web` (lint → typecheck → component test → build). Chỉ merge khi mọi job xanh và có approve.

**CD** (`.github/workflows/cd.yml`) chạy khi merge vào `main` hoặc đẩy tag `v*`:

| Bước | Job | Nội dung |
| --- | --- | --- |
| 1 | `quality` | Chạy lại toàn bộ CI (quality gate) |
| 2 | `images` | Build image API, tag bằng commit SHA (thêm tag `vX.Y.Z` khi phát hành), push GHCR |
| 3 | `migrate` | `prisma migrate deploy` và seed trên Neon; lỗi thì dừng, bản cũ vẫn chạy |
| 4 | `deploy` | Gọi deploy hook Render với image vừa push; deploy web lên Vercel |
| 5 | `smoke` | SMK-01 `GET /health` API trả đúng phiên bản vừa deploy, SMK-03 `GET /products` đọc được menu, SMK-02 trang chủ web; thử lại tới vài phút vì gói Free có thể đang ngủ |

## 5. Rollback (≤ 10 phút)

1. Lấy commit SHA của bản ổn định trước đó (tab *Actions* → lần chạy CD thành công gần nhất, hoặc `git log`).
2. **API:** *Actions → Rollback → Run workflow*, nhập SHA. Workflow gọi deploy hook với image `brewlite-api:<sha>` và chờ `/health` báo đúng phiên bản. Cách thủ công: trang Render → service → *Deploys* → chọn bản cũ → *Rollback*.
3. **Web:** trang Vercel → *Deployments* → chọn bản cũ → *Promote to Production* (hoặc `vercel rollback`).
4. **CSDL:** migration chỉ thêm bảng/cột (ADR-003) nên image cũ vẫn chạy với schema mới; không chạy `migrate reset`. Nếu cần sửa dữ liệu, viết migration bù trong một pull request mới.
