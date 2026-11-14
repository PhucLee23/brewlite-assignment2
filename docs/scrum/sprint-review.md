# Sprint Review

Biên bản demo Increment cho Product Owner (TV2) cuối mỗi Sprint. Phần **Increment** liệt kê những gì đã merge vào `main`; phần **Phản hồi** và **Điều chỉnh backlog** ghi theo nội dung thảo luận thực tế của buổi review.

## Sprint 1 – Nền tảng và màn hình Menu

**Sprint Goal:** nền tảng kỹ thuật, tài liệu có kiểm soát phiên bản và MVP đầu tiên chạy được cho luồng xem menu.

### Increment đã demo

| Hạng mục | Kết quả | Minh chứng |
| --- | --- | --- |
| TK-01, TK-02 | Monorepo `apps/api`, `apps/web`, PostgreSQL trong Docker Compose | `docker compose up -d db`, chạy API và web theo README |
| TK-03 | Definition of Done, quy trình nhánh, quy ước commit | `docs/process/` |
| TK-04 | CI tự chạy trên mọi pull request: Install → Lint → Unit Test → Build | [CI xanh – PR #41](https://github.com/PhucLee23/brewlite-assignment2/pull/41); [CI đỏ – GitHub Actions](https://github.com/PhucLee23/brewlite-assignment2/actions/runs/43033212565) |
| US-01 | `GET /products`, `GET /products/:id`; trang Menu mobile-first có trạng thái đang tải / trống / lỗi | API-T01, CT-01, UT-01 |
| TK-05 | Validate toàn cục, lỗi tiếng Việt, log JSON, `GET /health` | API-T14 |

### Phản hồi của Product Owner

| Ý kiến | Người nêu | Xử lý |
| --- | --- | --- |
| Trang Menu đã hiển thị danh sách sản phẩm với giao diện tương đối rõ ràng, dễ theo dõi. Cần cải thiện thêm khả năng hiển thị trên các kích thước màn hình khác nhau. | TV2 | Đưa vào Sprint 2 |
| API sản phẩm đã đáp ứng chức năng lấy danh sách và chi tiết sản phẩm. Cần bổ sung xử lý các trường hợp API gặp lỗi hoặc dữ liệu không hợp lệ. | TV2 | Đưa vào Sprint 2 |
| CI đã được thiết lập và tự động kiểm tra mã nguồn khi có Pull Request. Cần tiếp tục duy trì và khắc phục các lỗi phát sinh trong quá trình phát triển. | TV2 | Giữ nguyên |

### Điều chỉnh Product Backlog

- Sprint 2 tiếp tục theo kế hoạch đã thống nhất, không thay đổi thứ tự ưu tiên tổng thể.
- Bổ sung định hướng cải thiện giao diện Menu trên nhiều kích thước màn hình và tăng cường xử lý lỗi cho API sản phẩm trong Sprint 2.


## Sprint 2 – MVP đầy đủ, CI/CD và production

**Sprint Goal:** hoàn thành luồng end-to-end, tự động hóa đóng gói và triển khai bản production truy cập được.

### Increment đã demo

| Hạng mục | Kết quả | Minh chứng |
| --- | --- | --- |
| US-02, US-03 | Chi tiết món (size, topping), giỏ hàng giới hạn theo số ly còn làm được | CT-02, CT-03 |
| US-04 | Đăng ký, đăng nhập JWT, quay lại trang thanh toán sau khi đăng nhập | API-T02, E2E-T01 |
| US-05, US-06 | Đặt đơn: giá do server tính, trừ nguyên liệu an toàn khi đặt đồng thời, mã giảm giá, chống tạo đơn trùng | API-T03 – T05, API-T13, UT-02, UT-03, UT-05 |
| US-07, US-08 | Thanh toán qua MoMo, VNPay sandbox, kết quả có chữ ký, idempotent, điểm thưởng | API-T06 – T08, API-T15, E2E-T01, E2E-T02, UT-04, UT-06 |
| US-09, US-10 | Màn hình xác nhận, lịch sử, chi tiết, hủy đơn, tự hủy đơn quá hạn | API-T09 – T12, E2E-T01 |
| US-11, US-13 | Màn hình quầy, trang Doanh thu, biên lai | API-T11, API-T16, E2E-T03 |
| US-16 | Trang Kho: tồn nguyên liệu, số ly còn bán được, nhập kho | API-T17, E2E-T04 |
| US-12 | PWA: cài lên màn hình chính, trang mất mạng | Thử trên điện thoại |
| TK-07 – TK-10 | Cổng MoMo, VNPay, E2E, Docker Compose 3 dịch vụ, pipeline CD, production, release `v1.0.0` | Pipeline CD, URL production, [release notes](../release-notes.md) |

**Demo trực tiếp:** mở URL production trên điện thoại → chọn món → giỏ → đăng nhập → chọn VNPay → nhập thẻ thử NCB trên trang VNPay → quay về màn hình xác nhận, xem biên lai → nhân viên chuyển trạng thái trên màn hình quầy → khách thấy "Nước của bạn đã sẵn sàng".

### Phản hồi của Product Owner

| Ý kiến | Người nêu | Xử lý |
| --- | --- | --- |
| Các chức năng cốt lõi từ đặt hàng, thanh toán đến quản lý đơn hàng đã được triển khai tương đối đầy đủ. Cần tiếp tục theo dõi tính ổn định của hệ thống khi vận hành thực tế. | TV2 | Ghi nhận, tiếp tục theo dõi |
| Giao diện khách hàng, PWA và các chức năng quản lý đã đáp ứng phạm vi MVP. Cần cải thiện trải nghiệm sử dụng và bổ sung thông báo khi đơn hàng sẵn sàng. | TV2 | Ghi nhận, đưa thông báo vào backlog FR-22 |
| Release `v1.0.0` đáp ứng các mục tiêu chính của Sprint 2. Các chức năng mở rộng như lịch sử điểm thưởng, đổi điểm và thanh toán thực tế sẽ được xem xét ở phiên bản tiếp theo. | TV2 | Ghi nhận FR-21, FR-23, FR-25 cho phiên bản sau |

### Backlog cho phiên bản sau

| Hạng mục | Yêu cầu | Ghi chú |
| --- | --- | --- |
| Màn hình lịch sử điểm thưởng | FR-21 | API `GET /loyalty/me` đã có |
| Thông báo đẩy khi đơn sẵn sàng | FR-22 | Hiện chỉ cập nhật khi đang mở trang đơn |
| Đổi điểm lấy giảm giá | FR-23 | Won't ở phiên bản này |
| Sửa menu, giá, công thức nguyên liệu | – | Phiên bản sau |
| Cổng thanh toán thật, hoàn tiền, đối soát | FR-25 | Cần hợp đồng merchant |
