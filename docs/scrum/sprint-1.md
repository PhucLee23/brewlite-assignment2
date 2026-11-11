# Sprint 1 – Nền tảng và màn hình Menu

**Sprint Goal:** tạo nền tảng kỹ thuật, tài liệu có kiểm soát phiên bản và một MVP đầu tiên chạy được cho luồng xem menu (Task 4).

## Sprint Backlog

| Hạng mục | Nội dung | Phụ trách | Review | Test |
| --- | --- | --- | --- | --- |
| TK-01 | Khung `apps/api`, CSDL trong Docker Compose, `.env.example` | TV1 | TV3 | – |
| TK-02 | Khung `apps/web` | TV5 | TV6 | – |
| TK-03 | Definition of Done, quy ước commit, chiến lược nhánh | TV1 | TV2 | – |
| – | Product Backlog, issue board Sprint 1–2 | TV2 | TV1 | – |
| TK-04 | CI: Install → Lint → Unit Test → Build | TV1 | TV4 | Một lần pipeline xanh, một lần đỏ |
| US-01 (API) | Bảng `Product`, `Topping`, migration, seed; `GET /products`, `GET /products/:id` | TV3 | TV4 | UT-01 |
| TK-05 | Validate toàn cục, lỗi tiếng Việt, log JSON, `GET /health` | TV4 | TV3 | API-T14 |
| US-01 (web) | Trang Menu: lưới món, đang tải / trống / lỗi, nhãn tồn kho | TV5 | TV6 | CT-01 |
| US-01 (web) | Trang 404, trang lỗi | TV2 | TV5 | – |
| TK-06 | Integration test API sản phẩm | TV2 | TV3 | API-T01 |
| – | Sprint Review, Sprint Retrospective của Sprint 1 | TV2, TV1 | TV1, TV2 | – |

## Tiêu chí hoàn thành Sprint

- `docker compose up -d db`, chạy API và web theo README: trang Menu hiển thị món từ CSDL seed.
- `GET /products`, `GET /products/:id` đúng tiêu chí FR-01, FR-03 (200, 400, 404).
- CI chạy tự động trên mọi pull request; có minh chứng một lần thành công và một lần phát hiện lỗi.
- Mọi hạng mục đạt [Definition of Done](../process/definition-of-done.md).
- Có biên bản Sprint Review và Sprint Retrospective của Sprint 1 trước khi bắt đầu Sprint 2.
