# Release notes

## v1.0.0

Bản phát hành đầu tiên của BrewLite: hoàn thành luồng nghiệp vụ tối thiểu **Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn**, chạy trên production qua HTTPS.

### Tính năng

| Nhóm | Nội dung | Yêu cầu |
| --- | --- | --- |
| Menu | Lưới đồ uống từ CSDL, trạng thái đang tải / trống / lỗi, nhãn "Hết hàng", "Còn N" (số ly tính từ nguyên liệu), số ly đang có trong giỏ | FR-01, FR-02, FR-05 |
| Chi tiết món | Chọn size S/M/L, tối đa 5 topping, số lượng; thành tiền cập nhật ngay; giới hạn theo số ly còn làm được của từng size | FR-03, FR-05 |
| Giỏ hàng | Gộp dòng cùng lựa chọn, sửa số lượng, xóa, tổng tiền; giữ giỏ khi tải lại trang | FR-04, FR-05 |
| Tài khoản | Đăng ký, đăng nhập JWT, quay lại trang đang xem sau khi đăng nhập, tự đăng xuất khi hết hạn | FR-06, FR-07 |
| Đặt đơn | Giá do server tính, trừ nguyên liệu theo công thức trong transaction (optimistic locking), mã giảm giá, chống tạo đơn trùng | FR-08 – FR-10 |
| Thanh toán | Qua cổng MoMo hoặc VNPay (sandbox): chuyển sang trang của cổng, xác nhận bằng kết quả có chữ ký (link quay về, IPN, API tra cứu), thanh toán idempotent, phiên hết hạn sau 15 phút, thanh toán lại, biên lai | FR-11, FR-12, FR-26 |
| Điểm thưởng | Cộng 1 điểm / 1.000đ khi thanh toán thành công, thu hồi khi hủy đơn đã thanh toán; API `GET /loyalty/me` đã có, màn hình lịch sử điểm để phiên bản sau | FR-13, FR-21 |
| Theo dõi đơn | Màn hình xác nhận, lịch sử và chi tiết đơn, hủy đơn trả nguyên liệu, tự hủy đơn chưa thanh toán quá 15 phút | FR-14 – FR-16, FR-20 |
| Quầy pha chế | Nhân viên xem đơn theo 5 nhóm (chờ pha, đang pha, sẵn sàng, đã giao, đã hủy), chuyển PREPARING → READY → COMPLETED, hủy đơn đã thanh toán chưa pha | FR-17 – FR-19 |
| Kho | Tồn từng nguyên liệu, số ly còn bán được của từng món và nguyên liệu hết trước, nhập thêm hàng | FR-24 |
| Doanh thu | Giao dịch theo cổng, mã giao dịch, ngân hàng; tiền đã vào chỉ tính giao dịch thành công của đơn chưa hủy; mục *Cần hoàn tiền*; biên lai in được | FR-26 |
| PWA | Manifest, icon, cài lên màn hình chính, trang báo mất mạng | NFR-09 |

### Vận hành

- `GET /health` cho API (kiểm tra CSDL, trả 503 khi mất kết nối); log JSON mỗi request kèm request id.
- Docker Compose chạy đủ web, API, PostgreSQL ở local bằng một lệnh; thanh toán đi qua MoMo, VNPay sandbox.
- CI trên mọi pull request: lint, unit test, integration test trên PostgreSQL thật (cổng giả, không gọi Internet), component test, build, E2E Playwright với cổng VNPay giả.
- CD: image gắn tag commit SHA trên GHCR, migration an toàn trên Neon, deploy Render và Vercel, smoke test sau deploy, workflow rollback.

### Hạn chế đã biết

- API trên gói miễn phí của Render ngủ sau 15 phút không có truy cập; lần gọi đầu chờ khoảng 1 phút (R-01).
- Thanh toán chạy trên môi trường sandbox của MoMo, VNPay, chưa dùng tiền thật; chưa có hoàn tiền tự động qua cổng và đối soát (FR-25, Won't).
- Ở máy cá nhân cổng không gọi được IPN về `localhost`; kết quả được xác nhận qua link quay về và API tra cứu.
- Chưa có thông báo đẩy khi đơn sẵn sàng; màn hình đơn tự cập nhật trạng thái khi đang mở (FR-22).
- Chưa có màn hình sửa menu, giá, công thức; dữ liệu nạp bằng seed, nhân viên chỉ nhập thêm nguyên liệu.
