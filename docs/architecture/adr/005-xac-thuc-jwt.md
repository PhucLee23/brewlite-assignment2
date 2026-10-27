# ADR-005: Xác thực bằng JWT không trạng thái, phân quyền theo vai trò

**Trạng thái:** Chấp nhận

## Bối cảnh

Đặt đơn, thanh toán, xem đơn cần đăng nhập (FR-07); nhân viên quầy có quyền cập nhật trạng thái (FR-18). Web và API chạy trên hai tên miền khác nhau (Vercel và Render). API chạy trên gói miễn phí có thể khởi động lại bất kỳ lúc nào.

## Quyết định

- Đăng nhập trả **JWT** ký HS256 bằng `JWT_SECRET`, payload `{ sub, email, role }`, hết hạn sau `JWT_EXPIRES_IN` (mặc định 1 ngày).
- Client gửi token qua header `Authorization: Bearer <token>`; `JwtAuthGuard` (Passport) kiểm tra chữ ký và hạn.
- Phân quyền bằng decorator `@Roles('STAFF')` và `RolesGuard`.
- Mật khẩu băm **bcrypt** cost 10; đăng nhập sai email hay sai mật khẩu trả cùng một thông báo 401.
- Web lưu token trong localStorage (Zustand persist); nhận 401 thì xóa phiên và chuyển tới trang đăng nhập.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
| --- | --- |
| Session lưu trên server | Phải lưu phiên ở CSDL/Redis để sống qua lần khởi động lại; thêm hạ tầng |
| Cookie httpOnly cho JWT | An toàn hơn trước XSS nhưng cần cấu hình cookie cross-site (`SameSite=None`, CSRF) giữa hai tên miền khác nhau; để phiên bản sau |
| Refresh token | Tăng độ phức tạp; thời hạn 1 ngày đủ cho nhu cầu đặt nước |

## Hệ quả

- API không lưu trạng thái phiên, khởi động lại không làm người dùng mất đăng nhập.
- Không thu hồi được token trước hạn; giảm rủi ro bằng thời hạn ngắn, CORS chỉ cho origin web, và không đưa dữ liệu nhạy cảm vào payload.
- Lưu token ở localStorage có rủi ro nếu web bị XSS; giảm thiểu bằng việc React tự escape dữ liệu hiển thị và không dùng `dangerouslySetInnerHTML`.
