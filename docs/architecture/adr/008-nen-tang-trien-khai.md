# ADR-008: Triển khai production trên Vercel (web), Render (API) và Neon (PostgreSQL)

**Trạng thái:** Chấp nhận

## Bối cảnh

Đề bài yêu cầu URL production qua HTTPS, API có health check, CSDL không public trực tiếp, secret không nằm trong repository (Task 5.4). Ràng buộc C-05: chi phí bằng 0. Sản phẩm phải còn chạy tại thời điểm nghiệm thu.

Thông tin gói miễn phí (theo trang tài liệu của từng nhà cung cấp tại thời điểm chọn):

| Nền tảng | Gói | Điểm chính |
| --- | --- | --- |
| Vercel | Hobby | Tối ưu cho Next.js, CDN toàn cầu, HTTPS tự động, preview cho mỗi lần deploy |
| Render | Free web service | Chạy Docker image (kéo được từ GHCR), HTTPS tự động, health check path; **ngủ sau 15 phút không có truy cập, đánh thức mất khoảng 1 phút**; 750 giờ chạy/tháng |
| Render | Free Postgres | **Hết hạn sau 30 ngày** → không dùng |
| Neon | Free | PostgreSQL bền vững, không hết hạn, không cần thẻ; 1 GB lưu trữ, 100 CU-giờ/tháng; tự tạm dừng sau 5 phút rảnh; **không có giới hạn IP** |

## Quyết định

- **Web:** Vercel, build từ `apps/web`, biến `NEXT_PUBLIC_API_URL` trỏ tới API trên Render.
- **API:** Render Web Service kiểu "existing image", image `ghcr.io/<owner>/brewlite-api:<commit-sha>` do pipeline đẩy lên; health check path `/health`; vùng Singapore.
- **Cổng thanh toán:** dùng sandbox của MoMo, VNPay trên Internet (ADR-010), không triển khai service riêng. API nhận `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` (secret) và `PUBLIC_API_URL` (để cổng gọi IPN) qua biến môi trường; IPN URL trên trang merchant sandbox VNPay trỏ về API production.
- **CSDL:** Neon, vùng AWS ap-southeast-1 (Singapore) để gần API; kết nối bắt buộc TLS (`sslmode=require`).
- **Bảo vệ CSDL khi không có giới hạn IP:** chuỗi kết nối chỉ nằm trong biến môi trường của Render và GitHub Secrets (job migrate); mật khẩu ngẫu nhiên do Neon sinh; không có endpoint nào của API trả dữ liệu thô của CSDL; trình duyệt không bao giờ kết nối trực tiếp tới CSDL.
- **Giảm ảnh hưởng khi service ngủ:** frontend hiển thị trạng thái đang tải và nút thử lại; cổng gửi lại IPN khi API chưa trả lời và trang chờ thanh toán tự tra cứu cổng; smoke test có thử lại tối đa 3 phút; trước buổi nghiệm thu mở URL `/health` của API để đánh thức.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
| --- | --- |
| Máy ảo (Azure for Students) chạy Docker Compose + Caddy | CSDL nằm trong máy, không public; không ngủ. Nhưng cần quản trị máy chủ, cập nhật bảo mật, cấu hình HTTPS/tên miền; nặng với nhóm |
| Render cho cả CSDL | CSDL miễn phí hết hạn sau 30 ngày, có thể mất dữ liệu trước thời điểm nghiệm thu |
| Railway, Fly.io | Không còn gói miễn phí lâu dài / yêu cầu thẻ thanh toán |

## Hệ quả

- Không tốn chi phí; HTTPS và CDN có sẵn; không phải quản trị máy chủ.
- Lần truy cập đầu sau thời gian rảnh chậm (API ngủ + Neon tạm dừng). Đây là đánh đổi được chấp nhận (NFR-07).
- Chỉ một service Render dùng hạn mức 750 giờ/tháng và ngủ khi rảnh, nên với lượng truy cập của dự án vẫn nằm trong hạn mức (R-02).
- CSDL Neon vẫn có endpoint trên Internet, được bảo vệ bằng mật khẩu và TLS chứ không bằng mạng riêng; ghi nhận ở rủi ro R-03. Khi lên gói trả phí sẽ bật giới hạn IP hoặc chuyển sang mạng riêng.
- Web và API khác tên miền: API phải cấu hình CORS đúng origin của Vercel (`FRONTEND_URL`).
