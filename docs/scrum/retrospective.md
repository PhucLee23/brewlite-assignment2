# Sprint Retrospective

Biên bản họp nhìn lại cuối mỗi Sprint, do Scrum Master (TV1) điều phối. Mỗi thành viên nêu ít nhất một ý ở mỗi cột; nhóm chọn tối đa 3 hành động cải tiến, có người phụ trách, và kiểm tra lại ở Retrospective sau. Nội dung ghi đúng theo ý kiến trong buổi họp.

## Sprint 1

*Số liệu Sprint:* 9 hạng mục backlog (US-01, TK-01 – TK-06, Product Backlog, quy trình); CI chạy trên mọi pull request.

### Điều làm tốt (giữ lại)

| Ý kiến | Người nêu |
| --- | --- |
| CI chạy trên mọi pull request; nhóm đã thử cho CI đỏ một lần (lỗi lint) để chắc pipeline chặn được lỗi trước khi merge | TV1 |
| Product Backlog và Sprint Backlog 1 – 2 có trước khi bắt đầu code, mỗi người biết rõ hạng mục của mình | TV2 |
| API sản phẩm tính số ly còn bán từ nguyên liệu ngay từ đầu; seed chạy lại không nhân đôi dữ liệu | TV3 |
| Khung integration test dùng CSDL riêng brewlite_test, chạy được cả ở máy cá nhân và trên CI | TV4 |
| Trang Menu chia commit theo từng bước và có test CT-01 cho đủ trạng thái đang tải, trống, lỗi | TV5 |
| Khung web có sẵn header, React Query và các khung trạng thái dùng chung, Sprint 2 làm giỏ hàng chỉ cần thêm trang | TV6 |

### Điều chưa tốt (cần thay đổi)

| Ý kiến | Người nêu |
| --- | --- |
| PR Definition of Done dán nhầm nội dung vào file mẫu pull request, phải mở thêm một PR để sửa; tiêu đề PR để tên GitHub tự đặt | TV1 |
| Chưa tạo Project board và Issue cho các user story Sprint 1 – 2, nên pull request chưa liên kết được với user story | TV2 |
| Nhánh đã merge không xóa, danh sách nhánh trên GitHub dài, dễ chọn nhầm nhánh cũ | TV3 |
| Có pull request mô tả chép nhầm từ PR khác hoặc mở khi chưa đủ file, người review phải hỏi lại | TV4 |
| Pull request phải chờ review khá lâu; có PR được merge khi người review được giao chưa xem | TV5 |
| Chưa review kịp các pull request được giao trong Sprint 1 | TV6 |

### Hành động cải tiến cho Sprint 2

| Hành động | Người phụ trách | Cách kiểm tra |
| --- | --- | --- |
| Tạo Project board và Issue cho từng user story Sprint 2; mô tả pull request ghi Closes #<số issue> | TV2 | Mọi PR code Sprint 2 liên kết với một Issue, board cập nhật theo trạng thái PR |
| Trước khi mở PR, đối chiếu tab Files changed với danh sách tệp, đọc lại tiêu đề và mô tả | TV1 nhắc trong Daily Scrum | Retrospective Sprint 2 đếm số PR phải sửa lại sau khi mở (mục tiêu 0) |
| Người review phản hồi trong 24 giờ; chỉ merge khi người review được giao đã Approve; merge xong xóa nhánh | TV1 | Mọi PR Sprint 2 có Approve của đúng người review trước khi merge; không còn nhánh đã merge |

## Sprint 2

*Số liệu Sprint:* 18 hạng mục backlog (US-02 – US-13, TK-07 – TK-10); test tự động: 6 nhóm unit test (UT-01 – UT-06), 17 integration test API (API-T01 – API-T17), 3 component test (CT-01 – CT-03), 4 E2E test (E2E-T01 – E2E-T04) chạy trong CI.

### Kiểm tra hành động cải tiến của Sprint 1

| Hành động | Kết quả |
| --- | --- |
| Tạo Project board và Issue cho từng user story Sprint 2; mô tả pull request ghi Closes #<số issue> (TV2) | [ĐIỀN: Đạt hoặc Chưa đạt, số PR Sprint 2 chưa liên kết Issue] |
| Trước khi mở PR, đối chiếu tab Files changed với danh sách tệp, đọc lại tiêu đề và mô tả (TV1) | Chưa đạt: ít nhất PR42 (README, Retrospective) bị yêu cầu sửa 6 mục sau khi mở (ghi đè Retrospective Sprint 1, bảng còn trống, số liệu test lệch, README còn `<WEB_URL>`, tiêu đề PR, thứ tự merge). [ĐIỀN: số PR khác phải sửa lại nếu có] |
| Người review phản hồi trong 24 giờ; chỉ merge khi người review được giao đã Approve; merge xong xóa nhánh (TV1) | [ĐIỀN: Đạt hoặc Chưa đạt, số nhánh đã merge nhưng chưa xóa] |

### Điều làm tốt (giữ lại)

| Ý kiến | Người nêu |
| --- | --- |
| Docker Compose chạy web, API và PostgreSQL bằng một lệnh; API tự áp migration và nạp dữ liệu mẫu khi khởi động | TV1 |
| Ma trận truy vết cập nhật theo từng mã test (UT, API-T, CT, E2E) nên đối chiếu yêu cầu với kết quả test nhanh | TV2 |
| Integration test chạy trên PostgreSQL thật, cổng MoMo và VNPay giả không gọi Internet nên test ổn định, chạy được cả ở máy cá nhân và trên CI | TV3 |
| Tạo đơn tính giá ở server, trừ nguyên liệu bằng optimistic locking và Idempotency-Key nên gọi lặp không làm trừ kho trùng | TV4 |
| Khung web có sẵn từ Sprint 1 (header, React Query, trạng thái đang tải, trống, lỗi) nên các trang đăng nhập, lịch sử đơn, chi tiết món làm nhanh | TV5 |
| Giỏ hàng chặn vượt tồn kho (CT-03) và PWA có trang mất mạng, người dùng không bị mất thao tác khi mạng yếu | TV6 |

### Điều chưa tốt (cần thay đổi)

| Ý kiến | Người nêu |
| --- | --- |
| Đến PR41a mới phát hiện Prisma CLI phải nằm ở dependencies để chạy migrate trong image Docker; nên build image sớm hơn | TV1 |
| Tài liệu cuối Sprint phụ thuộc nhau: link tới release-notes.md chỉ mở được sau khi PR chứa tệp đó merge nên PR42 phải chờ | TV2 |
| E2E (PR40) phải chờ PR38 và PR41b nên làm dồn ở cuối Sprint, ít thời gian sửa lỗi | TV3 |
| Cổng MoMo, VNPay sandbox cần Internet và khóa sandbox không được commit, mỗi người phải tự cấu hình .env nên dễ sai khi chạy lần đầu | TV4 |
| Các PR frontend nối tiếp nhau (PR34 → PR35 → PR36), PR sau phải chờ PR trước merge nên khó làm song song | TV5 |
| Các trang nhân viên (PR37 → PR39 → PR45) làm nối tiếp trong đợt 9, việc dồn về cuối Sprint | TV6 |

### Bài học cho phiên bản sau

| Bài học | Áp dụng thế nào |
| --- | --- |
| Kiểm tra build image Docker từ sớm, không để đến cuối Sprint | Chạy `docker compose build` trước khi mở PR có đổi package.json hoặc Dockerfile |
| Tệp dùng chung (Retrospective, README) dễ bị ghi đè khi chép từ gói PR | Trước khi chép, chạy Update from main và đối chiếu tab Files changed để chỉ thấy phần mình thêm |
| Số liệu test chỉ lấy từ một nguồn duy nhất | Lấy số lượng từ bảng Kiểm thử trong README, cập nhật cùng lúc khi thêm test |
