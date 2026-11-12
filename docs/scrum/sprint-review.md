
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
