# ADR-009: CI/CD bằng GitHub Actions, image trên GitHub Container Registry

**Trạng thái:** Chấp nhận

## Bối cảnh

Đề bài yêu cầu CI chạy khi mở pull request (Install → Lint → Unit Test → Build), pull request không được merge khi CI lỗi, và pipeline cuối cùng: Push/Tag → Lint và Test → Build → Docker Image → Push Registry → Deploy → Smoke Test, có migration an toàn và cách rollback (Task 4.4, 5.3). Repository đặt trên GitHub.

## Quyết định

**CI – `.github/workflows/ci.yml`** (sự kiện `pull_request` vào `main`):

| Job | Bước |
| --- | --- |
| `api` | `npm ci` → lint → unit test → build → integration test trên service container `postgres:16` |
| `web` | `npm ci` → lint → kiểm tra kiểu → component test → build |
| `e2e` | Dựng API + web + PostgreSQL + cổng VNPay giả (`tests/e2e/mock-vnpay`, ký kết quả như VNPay), chạy E2E test trên trình duyệt (Playwright) từ Menu tới xác nhận đơn, thanh toán qua trang cổng; CI không cần khóa sandbox và không phụ thuộc Internet |

Quy tắc merge vào `main`: chỉ qua pull request, mọi job CI phải thành công (dấu ✓ trên trang pull request), có ít nhất một approve. Repository là private trên gói GitHub Free nên GitHub không tự chặn nút merge. Vì vậy người review kiểm tra trạng thái CI trước khi approve, và người merge kiểm tra lại trước khi bấm merge. Pull request có job đỏ thì sửa trên cùng nhánh cho tới khi xanh.

**CD – `.github/workflows/cd.yml`** (sự kiện `push` vào `main` và tag `v*`):

1. Quality gate: chạy lại lint, test, build (dùng lại workflow CI).
2. Build image `apps/api` → tag `ghcr.io/<owner>/brewlite-api:<commit-sha>` (và `vX.Y.Z` khi có tag) → push GHCR bằng `GITHUB_TOKEN`.
3. `prisma migrate deploy` trên Neon với secret `DATABASE_URL`.
4. Gọi deploy hook của service Render (`RENDER_DEPLOY_HOOK_API`) kèm `imgURL` của image vừa push.
5. Deploy web lên Vercel bằng Vercel CLI (`VERCEL_TOKEN`).
6. Smoke test: gọi `GET /health` và `GET /products` của API (thử lại tối đa 3 phút vì service có thể đang ngủ) và tải trang chủ web; thất bại thì job đỏ, pipeline dừng.

**Rollback:**

- API: gọi lại deploy hook với `imgURL` của commit SHA trước đó (hoặc chọn bản deploy cũ trên trang Render).
- Web: `vercel rollback` hoặc "Promote" bản deploy cũ trên trang Vercel.
- CSDL: migration chỉ thêm (ADR-003) nên image cũ vẫn chạy được; nếu cần, viết migration bù.

Hướng dẫn chi tiết ghi trong `docs/deployment.md` và README.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
| --- | --- |
| Render tự build từ repository (auto-deploy) | Không có bước image gắn tag commit trong registry; khó rollback chính xác; không chạy quality gate trước khi deploy |
| Docker Hub | Thêm tài khoản và secret; GHCR dùng sẵn quyền của repository |
| GitLab CI, Jenkins | Repository ở GitHub; phải tự vận hành runner |

## Hệ quả

- Mỗi bản production gắn đúng một commit SHA, truy vết và rollback được.
- Secret chỉ nằm trong GitHub Secrets và trang cấu hình nền tảng; workflow không in secret ra log.
- Phụ thuộc hạn mức phút chạy GitHub Actions cho repository private; job E2E chỉ chạy khi thay đổi ảnh hưởng tới `apps/` hoặc `tests/`.
- Repository private trên gói GitHub Free không bật được bảo vệ nhánh (cần GitHub Pro hoặc repository public), nên quy tắc "CI xanh mới merge" do nhóm tự giữ khi review. Mỗi pull request vẫn lưu lại kết quả CI để kiểm chứng.
