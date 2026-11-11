# Product Backlog

Product Owner: TV2. Backlog gồm các user story và hạng mục kỹ thuật, sắp theo thứ tự ưu tiên; mỗi mục dẫn chiếu mã yêu cầu trong [SRS](../requirements/srs.md). Ước lượng bằng story point (SP, thang Fibonacci 1, 2, 3, 5, 8).

Trên GitHub, mỗi mục là một **issue** (mẫu `.github/ISSUE_TEMPLATE/user-story.md`), gắn nhãn `sprint-1` hoặc `sprint-2` và nằm trên bảng **GitHub Projects** "BrewLite" với các cột *Backlog → Sprint → Đang làm → Review → Done*. Pull request ghi `Closes #<số issue>` để issue tự đóng khi merge.

## 1. User story

| Mã | User story | Yêu cầu | Ưu tiên | SP | Sprint |
| --- | --- | --- | --- | --- | --- |
| US-01 | Là khách, tôi muốn xem menu đồ uống kèm ảnh, giá và số ly còn bán được để chọn món | FR-01, FR-02, NFR-01, NFR-08 | Must | 5 | 1 |
| US-02 | Là khách, tôi muốn xem chi tiết món, chọn size, topping, số lượng và thấy thành tiền ngay | FR-03, FR-05 | Must | 5 | 2 |
| US-03 | Là khách, tôi muốn thêm món vào giỏ, sửa số lượng, xóa món và giỏ vẫn còn khi tải lại trang | FR-04, FR-05 | Must | 5 | 2 |
| US-04 | Là khách, tôi muốn đăng ký và đăng nhập để đặt đơn | FR-06, FR-07, NFR-03 | Must | 5 | 2 |
| US-05 | Là khách, tôi muốn đặt đơn từ giỏ hàng với giá do hệ thống tính, không bị tạo đơn trùng | FR-08, FR-10, NFR-06 | Must | 8 | 2 |
| US-06 | Là khách, tôi muốn nhập mã giảm giá và biết mã có hợp lệ không | FR-09 | Should | 3 | 2 |
| US-07 | Là khách, tôi muốn trả tiền qua cổng MoMo hoặc VNPay (môi trường sandbox), không bị trừ tiền hai lần | FR-11, FR-12, NFR-02, NFR-04 | Must | 8 | 2 |
| US-08 | Là khách, tôi muốn được cộng điểm thưởng khi thanh toán thành công | FR-13 | Should | 3 | 2 |
| US-09 | Là khách, tôi muốn thấy màn hình xác nhận, trạng thái và lịch sử đơn của mình | FR-14, FR-15 | Must | 5 | 2 |
| US-10 | Là khách, tôi muốn hủy đơn chưa pha và nguyên liệu được trả về kho | FR-16, FR-20 | Should | 3 | 2 |
| US-11 | Là nhân viên quầy, tôi muốn xem đơn đã thanh toán và chuyển trạng thái pha chế | FR-17, FR-18, FR-19 | Must | 5 | 2 |
| US-12 | Là khách, tôi muốn cài BrewLite lên màn hình điện thoại và thấy thông báo khi mất mạng | NFR-09 | Should | 2 | 2 |
| US-13 | Là nhân viên quầy, tôi muốn xem danh sách giao dịch thanh toán, tổng tiền đã nhận và biên lai từng giao dịch | FR-26 | Could | 3 | 2 |
| US-16 | Là nhân viên quầy, tôi muốn xem tồn kho nguyên liệu, số ly còn bán được của từng món và nhập thêm hàng | FR-24 | Should | 5 | 2 |
| US-14 | Là khách, tôi muốn xem lịch sử điểm thưởng | FR-21 | Could | 2 | Sau |
| US-15 | Là khách, tôi muốn được thông báo khi đơn sẵn sàng | FR-22 | Could | 3 | Sau |

## 2. Hạng mục kỹ thuật

| Mã | Hạng mục | Yêu cầu | SP | Sprint |
| --- | --- | --- | --- | --- |
| TK-01 | Khung `apps/api` (NestJS, Prisma, ESLint), CSDL trong Docker Compose, `.env.example` | NFR-10 | 3 | 1 |
| TK-02 | Khung `apps/web` (Next.js, Tailwind, React Query, hàm gọi API) | NFR-08 | 3 | 1 |
| TK-03 | Definition of Done, quy ước commit, chiến lược nhánh | NFR-11 | 1 | 1 |
| TK-04 | CI: Install → Lint → Unit Test → Build trên mọi pull request | NFR-11 | 3 | 1 |
| TK-05 | Validate toàn cục, lỗi tiếng Việt, log JSON, `GET /health` | NFR-04, NFR-07, NFR-12 | 3 | 1 |
| TK-06 | Integration test API sản phẩm trên PostgreSQL thật | NFR-01 | 2 | 1 |
| TK-07 | Kết nối cổng MoMo, VNPay sandbox: tạo phiên, kiểm tra chữ ký, tra cứu giao dịch | FR-11, NFR-04 | 5 | 2 |
| TK-08 | E2E test Playwright từ Menu tới xác nhận đơn | NFR-11 | 5 | 2 |
| TK-09 | Dockerfile, Docker Compose đủ 3 dịch vụ, pipeline CD, triển khai production, smoke test, rollback | NFR-05, NFR-07, NFR-10 | 8 | 2 |
| TK-10 | Phát hành `v1.0.0`: README, release notes, Sprint Review, Retrospective | – | 2 | 2 |

## 3. Ngoài phạm vi phiên bản này

FR-23 (đổi điểm lấy giảm giá), FR-25 (thanh toán bằng tiền thật, hoàn tiền tự động qua cổng): Won't, giữ lại cho phiên bản sau.

## 4. Kế hoạch Sprint

| Sprint | Sprint Goal | Hạng mục | Tài liệu |
| --- | --- | --- | --- |
| Sprint 1 | Nền tảng kỹ thuật, tài liệu có kiểm soát phiên bản và MVP đầu tiên chạy được cho luồng xem menu | US-01, TK-01 – TK-06 | [sprint-1.md](sprint-1.md) |
| Sprint 2 | Hoàn thành luồng end-to-end, tự động hóa đóng gói và triển khai bản production truy cập được | US-02 – US-13, US-16, TK-07 – TK-10 | [sprint-2.md](sprint-2.md) |
