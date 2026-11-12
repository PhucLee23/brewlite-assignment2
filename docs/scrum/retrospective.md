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
