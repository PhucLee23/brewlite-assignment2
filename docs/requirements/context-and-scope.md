# Bối cảnh, stakeholder và phạm vi

Tài liệu Task 1.1 của dự án BrewLite. Các mã yêu cầu `FR-xx`, `NFR-xx` được định nghĩa trong [srs.md](srs.md).

## 1. Vấn đề nghiệp vụ

Quán cà phê vào giờ cao điểm thường có hàng dài trước quầy order và thu ngân. Khách mất thời gian chờ gọi món và trả tiền; nhân viên vừa nhận order, vừa thu tiền mặt, vừa pha chế nên dễ ghi nhầm món và trả nhầm tiền thừa.

BrewLite là ứng dụng web chạy trên điện thoại để khách **tự chọn món, tự thanh toán không tiền mặt** (ví điện tử hoặc thẻ), rồi tới quầy nhận nước khi đơn sẵn sàng. Nhân viên quầy chỉ cần xem danh sách đơn đã thanh toán và cập nhật trạng thái pha chế.

**Mục tiêu sản phẩm:**

- Giảm thời gian từ lúc khách vào quán tới lúc đặt xong đơn xuống dưới 2 phút.
- Không còn giao dịch tiền mặt tại quầy cho các đơn đặt qua BrewLite.
- Không bán quá số lượng còn lại của món giới hạn (ví dụ Cold brew mỗi ngày chỉ có vài phần).
- Khách không bị trừ tiền hai lần khi mạng chậm và bấm thanh toán lại.

## 2. Stakeholder

| Stakeholder | Vai trò với hệ thống | Mục tiêu | Kỳ vọng và mối quan tâm | Mức ảnh hưởng |
| --- | --- | --- | --- | --- |
| Khách hàng | Người dùng chính: xem menu, đặt và thanh toán đơn, theo dõi đơn | Đặt nước nhanh, không xếp hàng, không cần tiền mặt | Giao diện dễ dùng trên điện thoại; giá rõ ràng; không bị trừ tiền hai lần; biết khi nào lấy nước | Cao |
| Nhân viên quầy (barista) | Nhận đơn đã thanh toán, cập nhật trạng thái pha chế | Biết chính xác món cần pha, không ghi nhầm | Danh sách đơn rõ ràng theo thứ tự; chỉ đơn đã thanh toán mới cần pha; đổi trạng thái bằng một chạm | Cao |
| Quản lý cửa hàng | Theo dõi hoạt động, quản lý menu và tồn kho | Không bán quá tồn kho, giảm sai sót, tăng khách quay lại | Tồn kho luôn đúng; dữ liệu đơn và thanh toán đầy đủ để đối soát; chương trình khuyến mãi và điểm thưởng | Trung bình |
| Giảng viên / khách hàng nghiệm thu | Nghiệm thu sản phẩm theo đề bài | Sản phẩm chạy được, đúng quy trình kỹ thuật phần mềm | Tài liệu truy vết được từ yêu cầu tới code và test; URL production hoạt động; README đủ để người ngoài chạy lại | Cao |
| Nhóm phát triển (6 thành viên, Scrum) | Phân tích, thiết kế, hiện thực, kiểm thử, triển khai | Hoàn thành đủ 5 task với chất lượng tốt | Yêu cầu rõ ràng, có tiêu chí chấp nhận để viết test; CI/CD tự động; nền tảng triển khai miễn phí và ổn định | Cao |
| Đơn vị thanh toán (Momo, VNPay, ngân hàng) | Bên thứ ba xử lý giao dịch ví và thẻ, báo kết quả về BrewLite | Giao dịch chính xác, đúng một lần | Khách xác nhận trả tiền trên trang của cổng; BrewLite chỉ ghi nhận kết quả do cổng báo về qua webhook có chữ ký; mỗi yêu cầu có khóa định danh (idempotency key); thông báo gửi lặp không bị xử lý hai lần. Trong dự án này được **mô phỏng** bằng dịch vụ riêng BrewPay | Trung bình |

## 3. Phạm vi

### 3.1 Trong phạm vi MVP (ưu tiên Must)

Luồng nghiệp vụ tối thiểu: **Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn**.

| Nhóm chức năng | Nội dung | Yêu cầu |
| --- | --- | --- |
| Menu | Danh sách đồ uống từ CSDL, trạng thái đang tải / trống / lỗi | FR-01 |
| Chi tiết sản phẩm | Size S/M/L, topping, số lượng, thành tiền cập nhật ngay | FR-03 |
| Giỏ hàng | Thêm, sửa số lượng, xóa, tổng tiền, giữ giỏ khi tải lại trang | FR-04 |
| Xác thực | Đăng ký, đăng nhập bằng JWT, bảo vệ route đặt đơn và thanh toán | FR-06, FR-07 |
| Đặt đơn | Server tính lại giá, trừ tồn kho trong transaction, đơn `PENDING` | FR-08 |
| Thanh toán | Ví hoặc Thẻ qua cổng bên thứ ba BrewPay (mô phỏng): quét mã QR, xác nhận trên trang cổng, cổng báo kết quả qua webhook có chữ ký; thành công `PAID`, thất bại `PAYMENT_FAILED`; thanh toán idempotent | FR-11, FR-12 |
| Theo dõi đơn | Màn hình xác nhận có mã đơn và trạng thái, lịch sử đơn | FR-14, FR-15 |
| Quản lý trạng thái | Vòng đời đơn theo state machine, nhân viên cập nhật trạng thái qua API | FR-17, FR-18 |
| Vận hành | Health check, chạy local bằng Docker Compose, CI/CD, URL production qua HTTPS | NFR-07, NFR-10 |

### 3.2 Phạm vi mở rộng (Should, Could)

Làm nếu còn năng lực trong Sprint 2, theo thứ tự ưu tiên:

| Ưu tiên | Nội dung | Yêu cầu |
| --- | --- | --- |
| Should | Nhãn hết hàng / còn ít; giới hạn số lượng theo tồn kho | FR-02, FR-05 |
| Should | Mã giảm giá; chống tạo đơn trùng khi gửi lại | FR-09, FR-10 |
| Should | Điểm thưởng có lịch sử giao dịch (`LoyaltyTransaction`) | FR-13 |
| Should | Hủy đơn và trả hàng về kho; tự hủy đơn chưa thanh toán quá 15 phút | FR-16, FR-20 |
| Should | Màn hình quầy cho nhân viên; PWA cài được lên điện thoại; ghi log request | FR-19, NFR-09, NFR-12 |
| Could | Xem lịch sử điểm thưởng; thông báo trong ứng dụng khi đơn sẵn sàng; nhân viên xem danh sách giao dịch thanh toán | FR-21, FR-22, FR-26 |

### 3.3 Ngoài phạm vi (Won't trong phiên bản này)

| Nội dung | Lý do |
| --- | --- |
| Đổi điểm thưởng lấy giảm giá (FR-23) | Cần quy tắc quy đổi và kiểm soát gian lận; để phiên bản sau |
| Màn hình quản lý menu, giá, tồn kho cho quản lý cửa hàng (FR-24) | Dữ liệu menu nạp bằng seed; chỉnh sửa trực tiếp trong CSDL khi cần |
| Thanh toán qua cổng thật Momo/VNPay, hoàn tiền (FR-25) | Cần hợp đồng merchant và môi trường sandbox; dự án dùng cổng mô phỏng BrewPay có cùng cách giao tiếp (link có chữ ký, webhook) |
| Nhiều chi nhánh, giao hàng tận nơi, báo cáo doanh thu theo ngày/tháng, đối soát | Ngoài nhu cầu của MVP một quán, nhận tại quầy |
| Ứng dụng native Android/iOS | Đề bài yêu cầu Next.js; PWA đáp ứng nhu cầu cài lên màn hình chính |

## 4. Giả định

| Mã | Giả định |
| --- | --- |
| A-01 | Người dùng (khách và nhân viên quầy) dùng tiếng Việt; giao diện, thông báo lỗi và tài liệu hướng dẫn chỉ cần một ngôn ngữ. |
| A-02 | Một cửa hàng duy nhất; khách nhận nước tại quầy, không có giao hàng. |
| A-03 | Thanh toán đi qua cổng **BrewPay**, một dịch vụ riêng đóng vai bên thứ ba và mô phỏng cách giao tiếp của cổng thật: BrewLite chuyển khách sang trang của cổng bằng link có chữ ký (mã QR), khách bấm Thanh toán hoặc Từ chối, cổng báo kết quả về qua webhook có chữ ký. Không có tiền thật; nút Từ chối dùng để kiểm thử và demo nhánh thất bại. |
| A-04 | Khách dùng điện thoại có trình duyệt hiện đại và có kết nối Internet khi đặt đơn. |
| A-05 | Giá niêm yết bằng VNĐ, là số nguyên; giá size S là giá gốc, size M +5.000đ, size L +10.000đ. |
| A-06 | Dữ liệu menu, topping, mã giảm giá và tài khoản mẫu được nạp bằng seed; tồn kho được nhân viên điều chỉnh trực tiếp khi cần. |
| A-07 | Lượng truy cập ở mức một quán nhỏ (dưới 50 người dùng đồng thời), đủ cho gói miễn phí của nền tảng triển khai. |

## 5. Ràng buộc

| Mã | Ràng buộc |
| --- | --- |
| C-01 | Công nghệ bắt buộc: **Next.js** (frontend, mobile-first/PWA), **NestJS** (backend), **PostgreSQL** (dữ liệu). Có thể bổ sung công nghệ khác nhưng không thay thế ba thành phần này. |
| C-02 | Làm theo Scrum với hai Sprint; năm task thực hiện tuần tự, tạo phẩm của task trước phải có trên repository trước khi nghiệm thu task sau. |
| C-03 | Mọi thay đổi đi qua pull request có review chéo; pull request không được merge khi lint, test hoặc build thất bại. |
| C-04 | Hệ thống production phải truy cập được qua HTTPS; CSDL production không mở cho trình duyệt truy cập trực tiếp; secret không nằm trong repository hay log CI. |
| C-05 | Chi phí hạ tầng bằng 0: chỉ dùng gói miễn phí (GitHub, Vercel Hobby, Render Free, Neon Free). |
| C-06 | Tài liệu và sơ đồ lưu trong repository dưới dạng văn bản (Markdown, PlantUML) kèm ảnh kết xuất, để theo dõi được lịch sử thay đổi. |

## 6. Rủi ro ban đầu

| Mã | Rủi ro | Khả năng | Ảnh hưởng | Cách giảm thiểu |
| --- | --- | --- | --- | --- |
| R-01 | API và BrewPay trên Render Free ngủ sau 15 phút không có truy cập; lần gọi đầu tiên chờ khoảng 1 phút | Cao | Trung bình | Frontend hiển thị trạng thái đang tải và cho thử lại; BrewPay gửi lại webhook khi API chưa sẵn sàng; smoke test sau deploy có thử lại; mở trước URL `/health` của cả hai service trước buổi nghiệm thu |
| R-02 | Gói miễn phí hết hạn mức (Render 750 giờ/tháng cho cả hai service, Neon 100 CU-giờ/tháng) | Thấp | Cao | Chỉ hai service trên Render (API, BrewPay), cả hai ngủ khi rảnh nên giờ chạy thực tế thấp; Neon tự tạm dừng khi rảnh; theo dõi hạn mức trên trang quản trị |
| R-03 | CSDL Neon có endpoint trên Internet (gói miễn phí không có giới hạn IP) | Trung bình | Cao | Chỉ API giữ chuỗi kết nối (secret của Render); bắt buộc TLS; mật khẩu ngẫu nhiên dài; không đưa chuỗi kết nối vào frontend, repository hay log |
| R-04 | Nhiều khách đặt cùng lúc món còn ít làm bán quá tồn kho | Trung bình | Cao | Trừ kho trong transaction với optimistic locking; test đặt đồng thời trong CI |
| R-05 | Khách bị trừ tiền hai lần khi mạng chậm và gửi lại yêu cầu thanh toán, hoặc cổng gửi lặp kết quả | Trung bình | Cao | Header `Idempotency-Key` bắt buộc, giữ chỗ bằng ràng buộc UNIQUE trước khi mở phiên ở cổng; mỗi đơn chỉ có một phiên còn hạn; webhook chỉ được xử lý khi thanh toán còn `PROCESSING` |
| R-06 | Lộ secret (JWT secret, chuỗi kết nối CSDL, token deploy) | Thấp | Cao | Chỉ lưu trong GitHub Secrets và biến môi trường của nền tảng; `.env` nằm trong `.gitignore`; không in secret ra log |
| R-07 | Thành viên chưa quen CI/CD và Docker | Trung bình | Trung bình | Pipeline mẫu, hướng dẫn trong README và `docs/deployment.md`; review chéo |
| R-08 | Migration lỗi trên production làm hỏng dữ liệu | Thấp | Cao | Chỉ dùng `prisma migrate deploy` (không reset); migration chạy trong CI trên CSDL thử trước; rollback bằng image trước và migration bù khi cần |
| R-09 | Tài liệu, sơ đồ và code lệch nhau | Trung bình | Trung bình | Ma trận truy vết; mọi thay đổi yêu cầu hoặc thiết kế đi qua pull request ghi rõ lý do |
| R-10 | Kẻ gian gọi thẳng webhook hoặc sửa số tiền trên link thanh toán để đơn thành `PAID` mà không trả tiền | Trung bình | Cao | Link và webhook đều ký HMAC-SHA256 bằng `GATEWAY_SECRET`; sai chữ ký trả 401, sai số tiền trả 400; integration test cho cả hai trường hợp |
