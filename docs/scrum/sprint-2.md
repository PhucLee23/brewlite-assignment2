# Sprint 2 – MVP đầy đủ, CI/CD và production

**Sprint Goal:** hoàn thành luồng end-to-end Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn, tự động hóa đóng gói và triển khai một phiên bản production truy cập được (Task 5).

## Sprint Backlog

| Hạng mục | Nội dung | Phụ trách | Review | Test |
| --- | --- | --- | --- | --- |
| US-04 (API) | Đăng ký, đăng nhập JWT, phân quyền `RolesGuard` | TV1 | TV3 | API-T02 |
| US-05 | Tạo đơn: giá do server tính, trừ nguyên liệu theo công thức bằng optimistic locking, idempotency, state machine | TV4 | TV3 | UT-03, API-T03 – T05 |
| US-05, US-09 (API) | Xem đơn của tôi, chi tiết đơn | TV3 | TV4 | API-T09 |
| US-03 | Giỏ hàng: store, trang giỏ, giới hạn theo số ly còn bán được | TV6 | TV5 | CT-03 |
| US-02 | Trang chi tiết món: size, topping, số lượng giới hạn theo số ly còn của từng size | TV5 | TV6 | CT-02 |
| US-06 | API mã giảm giá `GET /promotions/:code` | TV1 | TV3 | UT-02, API-T13 |
| TK-07 | Kết nối cổng MoMo, VNPay sandbox (`apps/api/src/payments/gateways`) | TV4 | TV3 | UT-06 |
| US-07 | Thanh toán: mở phiên ở cổng, xác nhận có chữ ký (link quay về, IPN, tra cứu), hết hạn phiên | TV4 | TV3 | API-T06, API-T07, API-T15 |
| US-08 | Điểm thưởng: cộng khi đơn PAID, lịch sử điểm | TV2 | TV1 | UT-04, API-T08 |
| US-13 (API) | Danh sách giao dịch `GET /payments`, biên lai `GET /payments/:id/receipt` | TV5 | TV4 | API-T16 |
| US-10, US-11 (API) | Hủy đơn trả nguyên liệu, tự hủy theo lịch, nhân viên đổi trạng thái, danh sách đơn theo trạng thái | TV3 | TV4 | API-T10 – T12 |
| US-16 (API) | Tồn kho nguyên liệu `GET /ingredients`, nhập kho `POST /ingredients/:id/restock` | TV3 | TV4 | API-T17 |
| US-04 (web) | Trang đăng nhập, đăng ký, tự đăng xuất khi hết hạn | TV5 | TV6 | – |
| US-07 (web) | Trang thanh toán chọn MoMo/VNPay, trang chờ kết quả tự cập nhật | TV6 | TV5 | E2E-T01, E2E-T02 |
| US-09 | Lịch sử đơn, chi tiết đơn, màn hình xác nhận, biên lai thanh toán | TV5 | TV6 | E2E-T01 |
| US-11 (web) | Màn hình quầy `/staff` | TV2 | TV5 | E2E-T03 |
| US-12 | PWA: manifest, icon, trang mất mạng | TV6 | TV1 | Kiểm thử thủ công |
| US-13 (web) | Trang Doanh thu: giao dịch thanh toán cho nhân viên | TV6 | TV5 | API-T16 |
| US-16 (web) | Trang Kho: tồn nguyên liệu, số ly còn bán được, ô nhập kho | TV6 | TV3 | Kiểm thử thủ công |
| TK-08 | E2E Playwright | TV3 | TV5 | E2E-T01 – T04 |
| TK-09 | Dockerfile, Docker Compose 3 dịch vụ | TV1 | TV3 | – |
| TK-09 | CD, production, smoke test, rollback | TV4 | TV1 | SMK-01 – SMK-03 |
| TK-10 | Tag `v1.0.0`, README, Sprint Review, Retrospective của Sprint 2, release notes | TV1, TV2 | TV2, TV1 | – |

## Tiêu chí hoàn thành Sprint

- Luồng end-to-end chạy được trên production qua HTTPS; E2E-T01 xanh trong CI.
- Pipeline CD: lint và test → build → image → push GHCR → migrate → deploy → smoke test.
- README hướng dẫn chạy local, test, build, deploy và rollback; có release notes và tag `v1.0.0`.
- Có biên bản Sprint Review và Sprint Retrospective.
