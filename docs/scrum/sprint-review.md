# Sprint Review

Biên bản demo Increment cho Product Owner (TV2) cuối mỗi Sprint. Phần **Increment** liệt kê những gì đã merge vào `main`; phần **Phản hồi** và **Điều chỉnh backlog** ghi theo nội dung thảo luận thực tế của buổi review.

## Sprint 1 – Nền tảng và màn hình Menu

**Sprint Goal:** nền tảng kỹ thuật, tài liệu có kiểm soát phiên bản và MVP đầu tiên chạy được cho luồng xem menu.

### Increment đã demo

| Hạng mục | Kết quả | Minh chứng |
| --- | --- | --- |
| TK-01, TK-02 | Monorepo `apps/api`, `apps/web`, PostgreSQL trong Docker Compose | `docker compose up -d db`, chạy API và web theo README |
| TK-03 | Definition of Done, quy trình nhánh, quy ước commit | `docs/process/` |
| TK-04 | CI tự chạy trên mọi pull request: Install → Lint → Unit Test → Build | Link pull request có CI xanh và một lần CI đỏ |
| US-01 | `GET /products`, `GET /products/:id`; trang Menu mobile-first có trạng thái đang tải / trống / lỗi | API-T01, CT-01, UT-01 |
| TK-05 | Validate toàn cục, lỗi tiếng Việt, log JSON, `GET /health` | API-T14 |

### Phản hồi của Product Owner

| Ý kiến | Người nêu | Xử lý |
| --- | --- | --- |
| | | |

### Điều chỉnh Product Backlog

-
