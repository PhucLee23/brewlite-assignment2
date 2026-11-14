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

*Số liệu Sprint:* 23 hạng mục backlog (US-02 – US-13, US-16, TK-07 – TK-10), 23 pull request đã merge. Test tự động chạy trong CI: unit test API 33 (6 nhóm), integration test API 73 (10 nhóm), component test web 15 (4 nhóm), E2E 5 (E2E-T01 – E2E-T04). Pipeline CD deploy lên production sau mỗi lần merge vào `main`.

### Kiểm tra hành động cải tiến của Sprint 1

| Hành động | Kết quả |
| --- | --- |
| Project board và Issue cho từng user story; mô tả PR ghi `Closes #<số issue>` | Đạt: 23/23 PR đã merge của Sprint 2 liên kết với Issue, board chuyển cột theo trạng thái PR |
| Đối chiếu Files changed, tiêu đề và mô tả trước khi mở PR (mục tiêu 0 PR phải sửa lại) | Chưa đạt: 4 PR phải sửa sau khi mở (#87 đóng rồi mở lại thành #88; #97, #98, #99 nhận Request changes); 2 PR để tiêu đề GitHub tự đặt theo tên nhánh |
| Phản hồi review trong 24 giờ; chỉ merge khi người review được giao đã Approve; merge xong xóa nhánh | Đạt một phần: mọi PR có phản hồi đầu tiên trong vòng 7 giờ và branch protection bắt buộc có Approve; nhưng 7 PR được merge với Approve của thành viên khác khi người review được giao chưa xem; nhóm thống nhất giữ nhánh tới khi kết thúc dự án để đối chiếu |

### Điều làm tốt (giữ lại)

| Ý kiến | Người nêu |
| --- | --- |
| Docker Compose chạy cả web, API, PostgreSQL bằng một lệnh; CI chặn merge khi một trong ba job API, Web, E2E đỏ hoặc chưa có Approve | TV1 |
| Mọi PR Sprint 2 đều gắn Issue, nhìn board là biết user story nào xong, user story nào còn chờ review | TV2 |
| Integration test chạy trên PostgreSQL thật với cổng MoMo, VNPay giả; E2E có cổng VNPay giả nên chạy được trong CI mà không cần Internet | TV3 |
| Đơn chỉ sang PAID khi có kết quả có chữ ký của cổng; CD tự migrate, deploy, smoke test và có workflow rollback | TV4 |
| Các trang Sprint 2 dùng lại khung trạng thái đang tải, trống, lỗi và store của Sprint 1 nên làm nhanh, ít lỗi giao diện | TV5 |
| Giỏ hàng, thanh toán, Doanh thu, Kho dùng tốt ở khổ điện thoại 375 px; cài được như ứng dụng nhờ PWA | TV6 |

### Điều chưa tốt (cần thay đổi)

| Ý kiến | Người nêu |
| --- | --- |
| Một số tiêu đề PR vẫn để tên nhánh GitHub tự đặt (#75, #76), lặp lại lỗi của Sprint 1 | TV1 |
| Ma trận truy vết lúc đầu sửa đè làm mất nội dung đang có trên `main`, phải sửa lại sau review | TV2 |
| PR hủy đơn phải đóng và mở lại; PR E2E mở khi còn thiếu test màn hình quầy và nhập kho | TV3 |
| Job migrate của CD từng đỏ vì CSDL Neon gói miễn phí đang ngủ, phải chạy lại; API trên Render ngủ sau 15 phút nên lần mở đầu chậm | TV4 |
| Chưa review kịp một số PR được giao, PR được merge với Approve của thành viên khác | TV5 |
| PWA và trang Kho mới kiểm thử thủ công, chưa có test tự động | TV6 |

### Bài học cho phiên bản sau

| Bài học | Áp dụng thế nào |
| --- | --- |
| Lỗi tiêu đề và thiếu tệp lặp lại dù đã có hành động cải tiến | Thêm dòng "đã đối chiếu tiêu đề, Files changed" vào mẫu pull request; người review từ chối PR có tiêu đề theo tên nhánh |
| Người review được giao bận thì PR bị dồn cho người khác | Mỗi hạng mục có thêm một người review dự phòng ngay khi lập Sprint Backlog |
| Dịch vụ miễn phí (Render, Neon) ngủ khi không dùng | Mở production trước buổi demo vài phút; CD đỏ ở bước migrate vì không kết nối được CSDL thì chạy lại job |
| Test E2E có muộn, lỗi giao diện chỉ phát hiện khi chạy tay | Viết E2E cho luồng chính ngay từ Sprint đầu, đưa vào check bắt buộc của CI |
