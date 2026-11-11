# Quy trình Git: nhánh, pull request và commit

Áp dụng cho mọi thay đổi trong repository, kể cả tài liệu. Liên quan: [Definition of Done](definition-of-done.md), [ADR-009](../architecture/adr/009-ci-cd-github-actions.md).

## 1. Chiến lược nhánh

Nhóm dùng **trunk-based** với nhánh ngắn hạn:

- `main` luôn ở trạng thái chạy được và triển khai được. **Không push thẳng lên `main`.**
- Mỗi hạng mục làm trên một nhánh riêng tách từ `main` mới nhất, sống tối đa vài ngày, merge xong thì xóa.
- Tên nhánh: `<loại>/<số-task>-<mô-tả-ngắn>`, chữ thường, không dấu, nối bằng gạch ngang.

| Loại | Dùng khi | Ví dụ |
| --- | --- | --- |
| `feat` | Thêm tính năng | `feat/4-api-san-pham` |
| `fix` | Sửa lỗi | `fix/5-tinh-sai-giam-gia` |
| `docs` | Chỉ sửa tài liệu | `docs/4-definition-of-done` |
| `test` | Chỉ thêm hoặc sửa test | `test/4-api-san-pham` |
| `ci` | Pipeline CI/CD | `ci/4-pipeline` |
| `chore` | Cấu hình, công cụ, phụ thuộc | `chore/4-khung-api` |

`<số-task>` là số task của đề (1–5), giúp biết nhánh thuộc giai đoạn nào.

Bản phát hành gắn **tag** dạng `vX.Y.Z` trên `main` (Semantic Versioning). Tag kích hoạt pipeline CD và là mốc để rollback.

## 2. Pull request

1. Cập nhật `main`, tạo nhánh mới theo quy ước.
2. Commit nhỏ, mỗi commit một ý; push nhánh và mở pull request vào `main`.
3. Điền mẫu mô tả (`.github/pull_request_template.md`): nội dung, **lý do**, mã yêu cầu/test liên quan, cách kiểm tra.
4. Chọn ít nhất một người review (khác người làm).
5. Người review đọc diff, chạy thử khi cần, để lại **nhận xét bằng lời của mình**, rồi Approve hoặc Request changes.
6. Góp ý được sửa bằng commit mới trên cùng nhánh (không force-push khi đã có review).
7. Chỉ merge khi: **CI xanh** và **có Approve**. Repository private trên gói GitHub Free không bật được bảo vệ nhánh, nên người merge tự kiểm tra hai điều kiện này trước khi bấm Merge.
8. Merge xong: xóa nhánh, cả nhóm cập nhật `main`.

Mọi thay đổi yêu cầu, sơ đồ hoặc kiến trúc sau khi đã merge đều đi qua pull request và ghi rõ lý do thay đổi; cập nhật ma trận truy vết nếu ảnh hưởng tới mã yêu cầu.

## 3. Quy ước commit

Theo [Conventional Commits](https://www.conventionalcommits.org/vi/v1.0.0/), mô tả bằng tiếng Việt:

```
<loại>(<phạm vi>): <mô tả ngắn, thể mệnh lệnh, không chấm cuối>

[thân: giải thích vì sao, nếu cần]
```

| Loại | Ý nghĩa |
| --- | --- |
| `feat` | Tính năng mới |
| `fix` | Sửa lỗi |
| `docs` | Tài liệu |
| `test` | Thêm hoặc sửa test |
| `refactor` | Sửa cấu trúc code, không đổi hành vi |
| `ci` | Pipeline CI/CD |
| `build` | Docker, phụ thuộc, cấu hình build |
| `chore` | Việc khác (công cụ, dọn dẹp) |

Phạm vi thường là module hoặc thư mục: `api`, `web`, `products`, `orders`, `payments`, `auth`, `gateway`, `docs`, `ci`.

Ví dụ:

- `feat(products): API danh sách và chi tiết sản phẩm`
- `fix(orders): trả 409 khi tồn kho không đủ`
- `test(api): integration test GET /products`
- `ci: chạy lint, unit test và build khi mở pull request`

Không commit: file `.env`, thư mục `node_modules`, `dist`, `.next`, file log.
