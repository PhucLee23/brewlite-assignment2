# Definition of Done

Một hạng mục backlog (user story hoặc task kỹ thuật) chỉ được coi là **Done** khi thỏa mọi điều kiện dưới đây. Người review kiểm tra danh sách này trước khi Approve.

## 1. Mức hạng mục

| # | Điều kiện | Cách kiểm chứng |
| --- | --- | --- |
| 1 | Đáp ứng đủ tiêu chí chấp nhận của các mã yêu cầu liên quan trong [SRS](../requirements/srs.md) | Người review đối chiếu từng tiêu chí |
| 2 | Code đi qua pull request, có ít nhất **một Approve** của thành viên khác, người review để lại nhận xét về nội dung | Trang pull request |
| 3 | **CI xanh**: lint, unit test, integration test, build (và E2E khi có) đều thành công | Dấu ✓ trên trang pull request |
| 4 | Có test cho phần nghiệp vụ mới: unit test cho quy tắc nghiệp vụ, integration test cho API mới, component test cho màn hình có trạng thái tải/trống/lỗi | Mã test (UT, API-T, CT, E2E-T) ghi trong mô tả pull request |
| 5 | API trả lỗi bằng tiếng Việt, đúng mã HTTP theo SRS (400, 401, 403, 404, 409) | Integration test |
| 6 | Giao diện dùng được ở chiều rộng 375 px, có trạng thái đang tải, trống, lỗi (NFR-08) | Người review mở thử trên trình duyệt ở khổ điện thoại |
| 7 | Không có secret, mật khẩu, chuỗi kết nối thật trong code, commit hay log | Người review đọc diff; `.env` không được commit |
| 8 | Thay đổi schema có migration đi kèm, chạy được bằng `prisma migrate deploy` | Integration test trong CI chạy migration từ đầu |
| 9 | Tài liệu liên quan được cập nhật: [ma trận truy vết](../traceability-matrix.md), `.env.example` khi thêm biến, README khi đổi cách chạy | Diff của pull request |
| 10 | Commit theo [quy ước](git-workflow.md#3-quy-ước-commit) | Lịch sử commit |

## 2. Mức Sprint

Sprint kết thúc khi:

- Mọi hạng mục cam kết trong Sprint Backlog đạt Definition of Done ở mục 1, hoặc được chuyển lại Product Backlog kèm lý do.
- Nhánh `main` build và chạy được bằng `docker compose up` (từ Sprint 2: có bản production truy cập được).
- Đã tổ chức Sprint Review (demo cho Product Owner) và Sprint Retrospective, có biên bản trong `docs/scrum/`.

## 3. Không được coi là Done

- Chạy được trên máy cá nhân nhưng CI đỏ.
- Test bị tắt (`skip`) hoặc xóa để CI xanh.
- Còn `TODO` cho phần thuộc tiêu chí chấp nhận.
- Màn hình chỉ có giao diện tĩnh, chưa gọi API thật.
