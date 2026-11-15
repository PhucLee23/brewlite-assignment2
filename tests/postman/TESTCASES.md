# Kiểm thử API BrewLite – Assignment 2

Bộ test Postman chia theo use case và mã yêu cầu trong `docs/traceability-matrix.md`. Tên request ghi mã FR/NFR, tên folder ghi mã test tự động tương ứng trong `tests/integration` (API-Txx), nên từ một request tra ngược được yêu cầu trong `docs/requirements/srs.md`. Mỗi use case có request đúng để show endpoint khi demo và request sai cho các ca lỗi theo Definition of Done (400, 401, 403, 404, 409, thông báo tiếng Việt).

- Bộ test: [`brewlite-a2.postman_collection.json`](brewlite-a2.postman_collection.json) (Postman Collection v2.1, 102 request, 231 kiểm tra)
- Script chạy tự động: [`run-postman-tests.mjs`](run-postman-tests.mjs)

---

## 1. Cách chạy

### Cách 1: chạy tự động bằng script (nên dùng)

Lệnh dùng PowerShell trong VS Code, bắt đầu từ thư mục dự án `d:\brewlite-assignment2`.

**Bước 1. Bật toàn bộ hệ thống bằng Docker.** Backend tự chạy migration và nạp dữ liệu mẫu khi khởi động.

```powershell
docker compose up -d --build
```

File `.env` cạnh `docker-compose.yml` phải có `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET` (khóa sandbox của nhóm), vì phần thanh toán mở phiên VNPay. Kiểm tra backend đã lên: mở http://localhost:4000.

**Bước 2. Chạy toàn bộ test** (lần đầu cần `npm install` để cài Newman):

```powershell
cd tests/postman
npm install
node run-postman-tests.mjs
```

Script tự làm các bước sau, không cần thao tác tay:

1. Chạy mọi folder, trừ folder luồng Quầy.
2. Đánh dấu PAID cho 2 đơn vừa tạo, bằng `docker compose exec db psql`.
3. Chạy folder luồng Quầy.

Kết quả mong đợi ở cuối:

```
========== TỔNG KẾT ==========
✓ PASS  Các folder chính: …/… kiểm tra đạt
✓ PASS  … Luồng Quầy (cần 2 đơn PAID): …/… kiểm tra đạt
```

Phía trên phần tổng kết, mỗi request được in ra cùng các kiểm tra: `✓` là đạt, số thứ tự màu đỏ là không đạt (chi tiết lỗi in ở bảng cuối mỗi lần chạy).

Backend chạy ở cổng khác thì đặt biến `BASE_URL`, ví dụ `$env:BASE_URL="http://localhost:4001"; node run-postman-tests.mjs`.

### Cách 2: chạy riêng một folder bằng Newman

Luôn chạy kèm folder `0. Chuẩn bị – Đăng nhập` để có token:

```powershell
cd tests/postman
npx newman run <tên file collection> --folder "0. Chuẩn bị – Đăng nhập" --folder "<tên folder>"
```

### Cách 3: chạy trong Postman (app, bản web hoặc extension Postman trong VS Code)

1. **Import** → chọn file collection trong `tests/postman`.
2. Bản web: bật **Desktop Agent** (góc dưới bên phải) để Postman gọi được `localhost`.
3. Chạy folder **0. Chuẩn bị** trước, rồi mở từng request bấm **Send** và xem tab **Test Results**; hoặc bấm `...` cạnh tên folder → **Run**.
4. Trước folder luồng Quầy, mở **Console** (góc dưới) để lấy mã 2 đơn in ở request tạo đơn cuối cùng, rồi đánh dấu PAID:

```powershell
docker compose exec db psql -U brewlite -d brewlite
```

Trong màn hình psql, dán câu lệnh in ở Console (dạng `UPDATE "Order" SET status = 'PAID' WHERE id IN (10, 11);`), Enter, rồi gõ `\q` để thoát.

---

## 2. Dữ liệu dùng khi test

Dữ liệu mẫu tạo bởi `apps/api/prisma/seed.ts`:

| Loại | Dữ liệu |
| --- | --- |
| Tài khoản | `khach@brewlite.vn` / `123456` (CUSTOMER); `barista@brewlite.vn` / `123456` (STAFF) |
| Món dùng trong test | #1 Espresso 25.000; #2 Cà phê sữa đá 29.000; #3 Bạc xỉu 32.000; #5 Latte 45.000; #6 Cappuccino 45.000; #9 Matcha latte 49.000; #10 Trà bưởi hồng (hết nguyên liệu); Cold brew (tìm theo tên) |
| Topping | #1 Trân châu đen 8.000; Kem cheese 10.000 |
| Phụ thu size | S: 0; M: +5.000; L: +10.000 |
| Mã giảm giá | BREW10: 10%; WELCOME20: 20%, đơn từ 100.000; HETHAN: đã hết hạn; TAMNGUNG: ngừng áp dụng |
| Nguyên liệu dùng cho test đặt đồng thời | "Cold brew ủ sẵn": 1 ly Cold brew size S cần 200 ml |

Mỗi lần chạy, test đăng ký một tài khoản mới (email theo thời gian) để làm "người khác" và "khách B".

---

## 3. Đối chiếu với task của đề

Task 1 – 3 của A2 là tài liệu (yêu cầu, mô hình, kiến trúc) nên không có request riêng; bộ test kiểm phần code của Task 4 (Sprint 1) và Task 5 (Sprint 2).

| Folder | Yêu cầu | Test tự động tương ứng | Task |
| --- | --- | --- | --- |
| NFR-07 – Health check | NFR-07 | API-T14, SMK-01 | 4 |
| UC-01, UC-02 – Xem menu, chi tiết món | FR-01 – FR-03, FR-05, NFR-01 | API-T01 | 4 |
| UC-04, UC-05 – Đăng ký, đăng nhập | FR-06, FR-07, NFR-03 | API-T02 | 5 |
| UC-06 – Đặt đơn | FR-08, FR-10, NFR-04 | API-T03, API-T05 | 5 |
| UC-07 – Mã giảm giá | FR-09 | API-T13 | 5 |
| UC-06 – Thanh toán qua cổng | FR-11, FR-12 | API-T06, API-T07 | 5 |
| UC-14 – Giao dịch, doanh thu, biên lai | FR-26 | API-T16 | 5 |
| UC-08 – Theo dõi đơn, lịch sử | FR-14, FR-15 | API-T09 | 5 |
| UC-12 – Điểm thưởng | FR-13, FR-21 | API-T08 | 5 |
| UC-10 – Cập nhật trạng thái, UC-10b – Luồng Quầy | FR-17 – FR-19 | API-T11 | 5 |
| UC-13, UC-09 – Kho, đặt đồng thời, hủy đơn | FR-16, FR-24, NFR-06 | API-T04, API-T10, API-T17 | 5 |

FR-04 (giỏ hàng) nằm ở trình duyệt, kiểm bằng component test CT-03; FR-20 (tự hủy đơn quá 15 phút) cần chờ thời gian nên kiểm bằng API-T12.

---

## 4. Danh sách test case

Bảng dưới đây sinh từ chính collection: cột *Kiểm tra* là tên từng `pm.test` trong tab Scripts → Post-response của request.

### 0. Chuẩn bị – Đăng nhập

Lấy token của khách và nhân viên quầy, lưu vào customerToken, staffToken. Luôn chạy folder này trước.

| Request | Endpoint, body | Token | Kiểm tra |
| --- | --- | --- | --- |
| 0.1 Đăng nhập tài khoản khách | `POST /auth/login`<br>`{"email":"khach@brewlite.vn","password":"123456"}` | – | Mã trạng thái 200; Có accessToken, vai trò CUSTOMER |
| 0.2 Đăng nhập tài khoản nhân viên quầy | `POST /auth/login`<br>`{"email":"barista@brewlite.vn","password":"123456"}` | – | Mã trạng thái 200; Có accessToken, vai trò STAFF |

### NFR-07 – Health check (API-T14)

GET /health trả trạng thái API, CSDL và phiên bản đang chạy; CD dùng request này làm smoke test.

| Request | Endpoint, body | Token | Kiểm tra |
| --- | --- | --- | --- |
| NFR-07 API và CSDL hoạt động | `GET /health` | – | Mã trạng thái 200; status ok, db ok, có version và uptime |

### UC-01, UC-02 – Xem menu, chi tiết món (FR-01 – FR-03, FR-05, NFR-01; API-T01)

Số ly còn bán được tính từ nguyên liệu theo công thức (BR-09, ADR-011). UC-03 Giỏ hàng nằm ở trình duyệt, demo trên giao diện.

| Request | Endpoint, body | Token | Kiểm tra |
| --- | --- | --- | --- |
| FR-01 Danh sách menu | `GET /products` | – | Mã trạng thái 200; Phản hồi dưới 500 ms; Có 15 món; Mỗi món có id, name, price, imageUrl, stock; Không lộ công thức pha chế; FR-02: có món hết hàng (stock 0) để web gắn nhãn "Hết hàng" |
| FR-03 Chi tiết một món | `GET /products/1` | – | Mã trạng thái 200; Phản hồi dưới 500 ms; Món id 1 là Espresso, giá gốc 25.000đ; 3 size S/M/L, phụ thu 0/5.000/10.000; Size lớn tốn nhiều nguyên liệu hơn: số ly còn S ≥ M ≥ L; Có danh sách topping kèm giá và số phần còn |
| FR-05 Thành tiền theo size và topping | `GET /products/6` | – | Mã trạng thái 200; Cappuccino S 45.000đ, M 50.000đ, L 55.000đ; Size L thêm Kem cheese thành 65.000đ |
| FR-03 Món không tồn tại | `GET /products/9999` | – | Mã trạng thái 404; Thông báo có "Không tìm thấy sản phẩm" |
| FR-03 Mã món không phải số | `GET /products/abc` | – | Mã trạng thái 400; Thông báo có "Mã không hợp lệ" |
| FR-03 Mã món vượt phạm vi số nguyên | `GET /products/99999999999` | – | Mã trạng thái 400 |

### UC-04, UC-05 – Đăng ký, đăng nhập (FR-06, FR-07, NFR-03; API-T02)

Mật khẩu băm bcrypt, JWT hạn 1 ngày; sai email và sai mật khẩu trả cùng một thông báo.

| Request | Endpoint, body | Token | Kiểm tra |
| --- | --- | --- | --- |
| FR-06 Đăng ký tài khoản mới | `POST /auth/register`<br>`{"email":"{{newEmail}}","password":"123456","fullName":"Khách Test"}` | – | Mã trạng thái 201; Có accessToken; Vai trò CUSTOMER, 0 điểm; Email được chuyển về chữ thường; Không trả passwordHash |
| FR-06 Đăng ký trùng email (viết hoa khác) | `POST /auth/register`<br>`{"email":"{{upperEmail}}","password":"123456","fullName":"Khách Test"}` | – | Mã trạng thái 409; Thông báo có "Email đã được đăng ký" |
| FR-06 Dữ liệu đăng ký sai | `POST /auth/register`<br>`{"email":"khong-phai-email","password":"123","fullName":"A"}` | – | Mã trạng thái 400; Báo đủ 3 lỗi tiếng Việt: email, mật khẩu, họ tên |
| FR-06 Mật khẩu dài quá 72 byte | `POST /auth/register`<br>`{"email":"dai-qua-{{$timestamp}}@brewlite.vn","password":"{{longPassword}}","fullName":"Khách Test"}` | – | Mã trạng thái 400; Thông báo có "Mật khẩu quá dài" |
| FR-06 Trường lạ khi đăng ký (tự đặt vai trò) | `POST /auth/register`<br>`{"email":"vai-tro-{{$timestamp}}@brewlite.vn","password":"123456","fullName":"Khách Test","role":"STAFF"}` | – | Mã trạng thái 400; Thông báo có "role" |
| FR-07 Đăng nhập tài khoản vừa tạo | `POST /auth/login`<br>`{"email":"{{newEmail}}","password":"123456"}` | – | Mã trạng thái 200; accessToken là JWT 3 phần; JWT chứa email, vai trò, hạn 1 ngày |
| FR-07 Sai mật khẩu | `POST /auth/login`<br>`{"email":"khach@brewlite.vn","password":"sai-mat-khau"}` | – | Mã trạng thái 401; Thông báo có "Email hoặc mật khẩu không đúng" |
| FR-07 Email chưa đăng ký | `POST /auth/login`<br>`{"email":"chua-co@brewlite.vn","password":"123456"}` | – | Mã trạng thái 401; Cùng thông báo với sai mật khẩu (không lộ email nào đã có) |
| FR-07 Xem thông tin của mình | `GET /auth/me` | tài khoản mới | Mã trạng thái 200; Đúng tài khoản vừa tạo, không có passwordHash |
| FR-07 Không có token | `GET /auth/me` | – | Mã trạng thái 401; Thông báo có "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" |
| FR-07 Token giả | `GET /auth/me` | token giả | Mã trạng thái 401 |

### UC-06 – Đặt đơn (FR-08, FR-10, NFR-04; API-T03, API-T05)

POST /orders: server tự tính giá (BR-02, không nhận giá từ client), mỗi dòng 1–20 ly, tối đa 5 topping (BR-03), trường lạ trả 400. Công thức: đơn giá = giá gốc + phụ thu size + giá topping; giảm giá = làm tròn xuống (tạm tính × % giảm).

| Request | Endpoint, body | Token | Kiểm tra |
| --- | --- | --- | --- |
| FR-08 Đơn mẫu có mã BREW10 | `POST /orders`<br>`{"items":[{"productId":1,"size":"M","toppingIds":[1],"qty":2},{"productId":9,"size":"L","qty":1}],"promotio...` | khách | Mã trạng thái 201; Tạm tính 135.000đ, đúng công thức; Giảm giá 13.500đ; Tổng 121.500đ = tạm tính − giảm giá; Đơn ở trạng thái PENDING; Đơn giá từng dòng do server tính |
| FR-10 Bấm đặt đơn lần hai (cùng Idempotency-Key) | `POST /orders`<br>`{"items":[{"productId":1,"size":"M","toppingIds":[1],"qty":2},{"productId":9,"size":"L","qty":1}],"promotio...` | khách | Thành công (2xx); Trả lại đúng đơn cũ, không tạo đơn mới |
| FR-08 Tăng số lượng espresso lên 3 | `POST /orders`<br>`{"items":[{"productId":1,"size":"M","toppingIds":[1],"qty":3},{"productId":9,"size":"L","qty":1}],"promotio...` | khách | Mã trạng thái 201; Tạm tính 173.000đ, đúng công thức; Giảm giá 17.300đ; Tổng 155.700đ = tạm tính − giảm giá; Đơn ở trạng thái PENDING; Đơn giá từng dòng do server tính |
| FR-08 Không dùng mã giảm giá | `POST /orders`<br>`{"items":[{"productId":1,"size":"M","toppingIds":[1],"qty":2},{"productId":9,"size":"L","qty":1}]}` | khách | Mã trạng thái 201; Tạm tính 135.000đ, đúng công thức; Giảm giá 0đ; Tổng 135.000đ = tạm tính − giảm giá; Đơn ở trạng thái PENDING; Đơn giá từng dòng do server tính |
| FR-08 Khách tự gửi giá (price) | `POST /orders`<br>`{"items":[{"productId":2,"size":"S","qty":3,"price":15000}]}` | khách | Mã trạng thái 400; Thông báo có "Trường "items.0.price" không được phép gửi lên" |
| FR-08 Khách tự gửi đơn giá (unitPrice) | `POST /orders`<br>`{"items":[{"productId":2,"size":"S","qty":1,"unitPrice":1000}]}` | khách | Mã trạng thái 400; Thông báo có "unitPrice" |
| FR-08 Khách tự gửi tổng tiền (total) | `POST /orders`<br>`{"items":[{"productId":2,"size":"S","qty":1}],"total":1000}` | khách | Mã trạng thái 400; Thông báo có "total" |
| FR-08 Gõ sai tên trường (qt thay cho qty) | `POST /orders`<br>`{"items":[{"productId":2,"size":"S","qt":3}]}` | khách | Mã trạng thái 400; Thông báo có "qt"; Thông báo có "Số lượng phải là số nguyên" |
| FR-08 Số lượng bằng 0 | `POST /orders`<br>`{"items":[{"productId":2,"size":"S","qty":0}]}` | khách | Mã trạng thái 400; Thông báo có "Số lượng mỗi dòng từ 1 đến 20" |
| FR-08 Số lượng 21 | `POST /orders`<br>`{"items":[{"productId":2,"size":"S","qty":21}]}` | khách | Mã trạng thái 400; Thông báo có "Số lượng mỗi dòng từ 1 đến 20" |
| FR-08 Số lượng âm | `POST /orders`<br>`{"items":[{"productId":2,"size":"S","qty":-2}]}` | khách | Mã trạng thái 400; Thông báo có "Số lượng mỗi dòng từ 1 đến 20" |
| FR-08 Số lượng không phải số nguyên | `POST /orders`<br>`{"items":[{"productId":2,"size":"S","qty":2.5}]}` | khách | Mã trạng thái 400; Thông báo có "Số lượng phải là số nguyên" |
| FR-08 Đơn không có món | `POST /orders`<br>`{"items":[]}` | khách | Mã trạng thái 400; Thông báo có "Đơn hàng phải có ít nhất một món" |
| FR-08 Size không hợp lệ | `POST /orders`<br>`{"items":[{"productId":2,"size":"XL","qty":1}]}` | khách | Mã trạng thái 400; Thông báo có "Size phải là S, M hoặc L" |
| FR-08 Quá 5 topping một ly | `POST /orders`<br>`{"items":[{"productId":2,"size":"S","qty":1,"toppingIds":[1,2,3,4,5,1]}]}` | khách | Mã trạng thái 400; Thông báo có "Mỗi ly tối đa 5 topping" |
| FR-08 Món không tồn tại | `POST /orders`<br>`{"items":[{"productId":9999,"size":"S","qty":1}]}` | khách | Mã trạng thái 400; Thông báo có "Món #9999 không tồn tại" |
| FR-08 Món hết nguyên liệu | `POST /orders`<br>`{"items":[{"productId":10,"size":"S","qty":1}]}` | khách | Mã trạng thái 409; Báo hết nguyên liệu, không tạo đơn |
| FR-10 Idempotency-Key sai định dạng | `POST /orders`<br>`{"items":[{"productId":2,"size":"S","qty":1}]}` | khách | Mã trạng thái 400; Thông báo có "Idempotency-Key" |
| FR-08 Chưa đăng nhập | `POST /orders`<br>`{"items":[{"productId":2,"size":"S","qty":1}]}` | – | Mã trạng thái 401 |

### UC-07 – Mã giảm giá (FR-09; API-T13)

Mã hợp lệ được trừ vào tổng; mã sai, hết hạn, ngừng áp dụng hoặc chưa đủ giá trị tối thiểu bị từ chối kèm lý do.

| Request | Endpoint, body | Token | Kiểm tra |
| --- | --- | --- | --- |
| FR-09 Mã hợp lệ | `GET /promotions/BREW10?subtotal=60000` | – | Mã trạng thái 200; Hợp lệ, giảm 10% của 60.000đ = 6.000đ |
| FR-09 Chưa đủ giá trị tối thiểu | `GET /promotions/WELCOME20?subtotal=60000` | – | Mã trạng thái 200; Không hợp lệ, lý do có "tối thiểu" |
| FR-09 Mã đã hết hạn | `GET /promotions/HETHAN?subtotal=60000` | – | Mã trạng thái 200; Không hợp lệ, lý do có "hết hạn" |
| FR-09 Mã không tồn tại | `GET /promotions/KHONGCO?subtotal=60000` | – | Mã trạng thái 200; Không hợp lệ, lý do có "không tồn tại" |
| FR-09 Đặt đơn đủ điều kiện WELCOME20 | `POST /orders`<br>`{"items":[{"productId":1,"size":"M","toppingIds":[1],"qty":2},{"productId":9,"size":"L","qty":1}],"promotio...` | khách | Mã trạng thái 201; Tạm tính 135.000đ, đúng công thức; Giảm giá 27.000đ; Tổng 108.000đ = tạm tính − giảm giá; Đơn ở trạng thái PENDING; Đơn giá từng dòng do server tính |
| FR-09 Đặt đơn dưới mức tối thiểu của mã | `POST /orders`<br>`{"items":[{"productId":2,"size":"S","qty":1}],"promotionCode":"WELCOME20"}` | khách | Mã trạng thái 400; Thông báo có "tối thiểu" |
| FR-09 Đặt đơn bằng mã hết hạn | `POST /orders`<br>`{"items":[{"productId":2,"size":"S","qty":1}],"promotionCode":"HETHAN"}` | khách | Mã trạng thái 400; Thông báo có "hết hạn" |

### UC-06 – Thanh toán qua cổng (FR-11, FR-12; API-T06, API-T07)

Mở phiên VNPay sandbox (API tự ký link HMAC-SHA512, cần VNPAY_TMN_CODE, VNPAY_HASH_SECRET trong .env). Đơn chỉ sang PAID khi cổng xác nhận bằng kết quả có chữ ký (ADR-010), nên ở đây kiểm tra phiên mở đúng, gửi lặp không mở phiên mới, kết quả giả bị từ chối.

| Request | Endpoint, body | Token | Kiểm tra |
| --- | --- | --- | --- |
| FR-11 Tạo đơn để thanh toán | `POST /orders`<br>`{"items":[{"productId":6,"size":"S","qty":1}]}` | khách | Mã trạng thái 201; Tổng 45.000đ, đơn PENDING |
| FR-11 Mở phiên thanh toán VNPay | `POST /payments`<br>`{ "orderId": {{payOrderId}}, "provider": "VNPAY" }` | khách | Mã trạng thái 201; Phiên mới (replayed = false), PROCESSING, đúng số tiền của đơn; Có link sang trang VNPay sandbox, link có chữ ký; Phiên hết hạn sau 15 phút; Đơn vẫn PENDING cho tới khi cổng xác nhận; Không trả idempotencyKey ra ngoài |
| FR-12 Bấm thanh toán lần hai (cùng Idempotency-Key) | `POST /payments`<br>`{ "orderId": {{payOrderId}}, "provider": "VNPAY" }` | khách | Thành công (2xx); replayed = true, cùng phiên, không mở giao dịch thứ hai |
| FR-12 Thiếu Idempotency-Key | `POST /payments`<br>`{ "orderId": {{payOrderId}}, "provider": "VNPAY" }` | khách | Mã trạng thái 400; Thông báo có "Thiếu header Idempotency-Key" |
| FR-11 Cổng không hỗ trợ | `POST /payments`<br>`{ "orderId": {{payOrderId}}, "provider": "ZALOPAY" }` | khách | Mã trạng thái 400; Thông báo có "Cổng thanh toán phải là MOMO hoặc VNPAY" |
| FR-11 Thanh toán đơn của người khác | `POST /payments`<br>`{ "orderId": {{payOrderId}}, "provider": "VNPAY" }` | tài khoản mới | Mã trạng thái 404; Thông báo có "Không tìm thấy đơn hàng" |
| FR-11 Xem phiên thanh toán | `GET /payments/{{paymentId}}` | khách | Mã trạng thái 200; Đúng phiên, vẫn PROCESSING |
| FR-11 Kết quả thanh toán giả (sai chữ ký) | `POST /payments/{{paymentId}}/return`<br>`{"params":{"vnp_TxnRef":"GIA-MAO","vnp_Amount":"4500000","vnp_ResponseCode":"00","vnp_TransactionStatus":"0...` | khách | Mã trạng thái 400; Thông báo có "Chữ ký kết quả thanh toán không hợp lệ" |
| FR-11 IPN VNPay giả (sai chữ ký) | `GET /payments/vnpay/ipn?vnp_TxnRef=GIA-MAO&vnp_Amount=4500000&vnp_ResponseCode=00&vnp_SecureHash=chu-ky-gia` | – | Mã trạng thái 200; Cổng nhận RspCode 97: chữ ký không hợp lệ, đơn không đổi |
| FR-11 Đơn vẫn PENDING sau kết quả giả | `GET /orders/{{payOrderId}}` | khách | Mã trạng thái 200; Trạng thái vẫn PENDING |

### UC-14 – Giao dịch thanh toán, doanh thu, biên lai (FR-26; API-T16)

GET /payments: 100 giao dịch mới nhất cho nhân viên quầy; tiền đã nhận chỉ cộng SUCCESS của đơn chưa hủy; SUCCESS của đơn đã hủy là REFUND_DUE. Biên lai: khách xem của mình, nhân viên xem mọi giao dịch.

| Request | Endpoint, body | Token | Kiểm tra |
| --- | --- | --- | --- |
| FR-26 Nhân viên xem doanh thu | `GET /payments` | nhân viên | Mã trạng thái 200; Có tiền đã nhận, số giao dịch, mục cần hoàn tiền; Có phiên vừa mở, kèm cổng và trạng thái hiển thị; Phiên chưa được cổng xác nhận thì không tính vào tiền đã nhận |
| FR-26 Lọc giao dịch đang chờ | `GET /payments?status=PROCESSING` | nhân viên | Mã trạng thái 200; Chỉ có giao dịch PROCESSING |
| FR-26 Lọc sai trạng thái | `GET /payments?status=ABC` | nhân viên | Mã trạng thái 400; Thông báo có "status phải là" |
| FR-26 Khách xem doanh thu | `GET /payments` | khách | Mã trạng thái 403; Thông báo có "Bạn không có quyền thực hiện thao tác này" |
| FR-26 Chưa đăng nhập | `GET /payments` | – | Mã trạng thái 401 |
| FR-26 Biên lai: khách xem giao dịch của mình | `GET /payments/{{paymentId}}/receipt` | khách | Mã trạng thái 200; Đúng giao dịch và đúng đơn; Không trả khóa idempotency |
| FR-26 Biên lai: nhân viên xem | `GET /payments/{{paymentId}}/receipt` | nhân viên | Mã trạng thái 200 |
| FR-26 Biên lai: người khác xem | `GET /payments/{{paymentId}}/receipt` | tài khoản mới | Mã trạng thái 404; Thông báo có "Không tìm thấy giao dịch" |
| FR-26 Biên lai: mã vượt phạm vi | `GET /payments/99999999999/receipt` | khách | Mã trạng thái 400 |

### UC-08 – Theo dõi đơn, lịch sử (FR-14, FR-15; API-T09)

Khách xem đơn của chính mình, mới nhất trước; đơn của người khác trả 404.

| Request | Endpoint, body | Token | Kiểm tra |
| --- | --- | --- | --- |
| FR-15 Lịch sử đơn của khách | `GET /orders/me` | khách | Mã trạng thái 200; Đơn mới nhất là đơn vừa tạo để thanh toán; Sắp xếp mới nhất trước; Mọi đơn cùng một chủ, có danh sách món |
| FR-14 Xem chi tiết đơn của mình | `GET /orders/{{orderId}}` | khách | Mã trạng thái 200; Đúng đơn mẫu, có mã đơn và trạng thái |
| FR-15 Xem đơn của người khác | `GET /orders/{{orderId}}` | tài khoản mới | Mã trạng thái 404; Thông báo có "Không tìm thấy đơn hàng" |
| FR-15 Tài khoản mới chưa có đơn | `GET /orders/me` | tài khoản mới | Mã trạng thái 200; Mảng rỗng, không thấy đơn của người khác |
| FR-15 Chưa đăng nhập | `GET /orders/me` | – | Mã trạng thái 401 |
| FR-15 Mã đơn không phải số | `GET /orders/abc` | khách | Mã trạng thái 400; Thông báo có "Mã không hợp lệ" |

### UC-12 – Điểm thưởng (FR-13, FR-21; API-T08)

Điểm chỉ cộng khi đơn sang PAID (1 điểm mỗi 1.000đ). Tài khoản mới chưa có đơn PAID nên 0 điểm.

| Request | Endpoint, body | Token | Kiểm tra |
| --- | --- | --- | --- |
| FR-21 Lịch sử điểm của tài khoản mới | `GET /loyalty/me` | tài khoản mới | Mã trạng thái 200; 0 điểm, chưa có giao dịch điểm |
| FR-21 Chưa đăng nhập | `GET /loyalty/me` | – | Mã trạng thái 401 |

### UC-10 – Cập nhật trạng thái (FR-17 – FR-19; API-T11)

State machine BR-06: chuyển tiếp không có trong sơ đồ trả 409; nhân viên chỉ đặt PREPARING, READY, COMPLETED, CANCELLED (BR-07); khách không gọi được API của quầy.

| Request | Endpoint, body | Token | Kiểm tra |
| --- | --- | --- | --- |
| FR-17 Đơn PENDING nhảy thẳng sang PREPARING | `PATCH /orders/{{orderId}}/status`<br>`{"status":"PREPARING"}` | nhân viên | Mã trạng thái 409; Thông báo có "Không thể chuyển đơn từ "Chờ thanh toán" sang "Đang pha chế"" |
| FR-18 Nhân viên tự đặt đơn đã thanh toán | `PATCH /orders/{{orderId}}/status`<br>`{"status":"PAID"}` | nhân viên | Mã trạng thái 400; Thông báo có "Nhân viên chỉ được đặt trạng thái PREPARING, READY, COMPLETED hoặc CANCELLED" |
| FR-18 Khách đổi trạng thái pha chế | `PATCH /orders/{{orderId}}/status`<br>`{"status":"PREPARING"}` | khách | Mã trạng thái 403; Thông báo có "Bạn không có quyền thực hiện thao tác này" |
| FR-19 Nhân viên xem số đơn từng nhóm | `GET /orders/counts` | nhân viên | Mã trạng thái 200; Có số đơn của 5 nhóm |
| FR-19 Nhân viên xem hàng chờ | `GET /orders?status=PAID` | nhân viên | Mã trạng thái 200; Chỉ có đơn PAID |
| FR-19 Lọc sai trạng thái | `GET /orders?status=XYZ` | nhân viên | Mã trạng thái 400; Thông báo có "status không hợp lệ" |
| FR-19 Khách mở màn hình quầy | `GET /orders?status=PAID` | khách | Mã trạng thái 403 |

### UC-13, UC-09 – Kho nguyên liệu, đặt đồng thời, hủy đơn (FR-16, FR-24, NFR-06; API-T04, API-T10, API-T17)

Trừ nguyên liệu trong transaction bằng optimistic locking (ADR-006, ADR-011): nhiều khách đặt cùng lúc không làm tồn kho âm; hủy đơn trả lại đúng lượng đã trừ. Kho chỉ cho nhân viên quầy.

| Request | Endpoint, body | Token | Kiểm tra |
| --- | --- | --- | --- |
| FR-24 Nhân viên xem tồn nguyên liệu | `GET /ingredients` | nhân viên | Mã trạng thái 200; Có tồn kho từng nguyên liệu và số ly còn của từng món; Mỗi món ghi nguyên liệu hết trước |
| FR-24 Nhân viên nhập thêm nguyên liệu | `POST /ingredients/{{coldBrewIngId}}/restock`<br>`{ "amount": {{restockAmount}} }` | nhân viên | Mã trạng thái 200; Tồn kho tăng đúng số vừa nhập |
| FR-24 Nhập số lượng 0 | `POST /ingredients/{{coldBrewIngId}}/restock`<br>`{"amount":0}` | nhân viên | Mã trạng thái 400; Thông báo có "Số lượng nhập tối thiểu là 1" |
| FR-24 Khách nhập kho | `POST /ingredients/1/restock`<br>`{"amount":100}` | khách | Mã trạng thái 403 |
| FR-24 Khách xem kho | `GET /ingredients` | khách | Mã trạng thái 403 |
| NFR-06 Số ly Cold brew size S còn bán được | `GET /products/{{coldBrewId}}` | – | Mã trạng thái 200; Còn ít nhất 5 ly size S |
| NFR-06 Khách A và khách B đặt cùng lúc khi chỉ đủ cho một người | `GET /products/{{coldBrewId}}` (pre-request gửi song song) | – | Đúng 1 đơn thành công (201); Đúng 1 đơn bị từ chối 409 vì hết nguyên liệu; Chỉ trừ kho cho đơn thành công, không bao giờ âm |
| FR-16 Khách hủy đơn chưa thanh toán | `POST /orders/{{raceOrderId}}/cancel` | người đặt được | Mã trạng thái 200; Đơn chuyển sang CANCELLED |
| FR-16 Hủy đơn trả nguyên liệu về kho | `GET /products/{{coldBrewId}}` | – | Mã trạng thái 200; Số ly size S trở lại như trước khi đặt |
| FR-16 Hủy lại đơn đã hủy | `POST /orders/{{raceOrderId}}/cancel` | người đặt được | Mã trạng thái 409 |
| FR-16 Hủy đơn của người khác | `POST /orders/{{orderId}}/cancel` | tài khoản mới | Mã trạng thái 404; Thông báo có "Không tìm thấy đơn hàng" |
| FR-10 Ba yêu cầu đặt đơn cùng lúc, cùng Idempotency-Key | `GET /orders/me` (pre-request gửi song song) | khách | Cả 3 yêu cầu đều thành công; Cả 3 trả về cùng một đơn; Trong lịch sử chỉ có 1 đơn mang mã đó |
| FR-19 Tạo đơn cho luồng Quầy | `POST /orders`<br>`{"items":[{"productId":5,"size":"M","qty":1}]}` | khách | Mã trạng thái 201 |
| FR-19 Tạo đơn để nhân viên hủy | `POST /orders`<br>`{"items":[{"productId":3,"size":"S","qty":1}]}` | khách | Mã trạng thái 201 |

### UC-10b – Luồng Quầy (cần 2 đơn PAID)

FR-17 – FR-19: nhân viên đưa đơn PAID qua PREPARING → READY → COMPLETED; từ PREPARING trở đi không ai hủy được; nhân viên hủy được đơn PAID chưa pha. Đơn chỉ sang PAID khi cổng xác nhận (trang sandbox phải bấm tay), nên run-postman-tests.mjs đánh dấu PAID trực tiếp trong CSDL trước folder này.

| Request | Endpoint, body | Token | Kiểm tra |
| --- | --- | --- | --- |
| FR-19 Đơn đã thanh toán lên Quầy | `GET /orders?status=PAID` | nhân viên | Mã trạng thái 200; Có 2 đơn PAID vừa chuẩn bị |
| FR-18 Bắt đầu pha | `PATCH /orders/{{counterOrderId}}/status`<br>`{"status":"PREPARING"}` | nhân viên | Mã trạng thái 200; Trạng thái PREPARING |
| FR-16 Khách hủy đơn đang pha | `POST /orders/{{counterOrderId}}/cancel` | khách | Mã trạng thái 409 |
| FR-18 Báo sẵn sàng | `PATCH /orders/{{counterOrderId}}/status`<br>`{"status":"READY"}` | nhân viên | Mã trạng thái 200; Trạng thái READY |
| FR-18 Đã giao nước | `PATCH /orders/{{counterOrderId}}/status`<br>`{"status":"COMPLETED"}` | nhân viên | Mã trạng thái 200; Trạng thái COMPLETED |
| FR-17 Quay ngược đơn đã xong | `PATCH /orders/{{counterOrderId}}/status`<br>`{"status":"PREPARING"}` | nhân viên | Mã trạng thái 409; Thông báo có "Không thể chuyển đơn từ "Hoàn tất" sang "Đang pha chế"" |
| FR-14 Khách thấy trạng thái mới | `GET /orders/{{counterOrderId}}` | khách | Mã trạng thái 200; Đơn của khách ở COMPLETED |
| FR-16 Nhân viên hủy đơn đã thanh toán, chưa pha | `PATCH /orders/{{counterCancelId}}/status`<br>`{"status":"CANCELLED"}` | nhân viên | Mã trạng thái 200; Trạng thái CANCELLED |

---

## 5. Lưu ý

- **Test đặt đồng thời (NFR-06)** gửi 2 đơn song song thật bằng `pm.sendRequest` trong Pre-request. Mỗi khách đặt q ly với q ≤ số ly còn < 2q, nên luôn chỉ một đơn đủ hàng; ai được ai bị là ngẫu nhiên. Request nhập kho phía trước đưa "Cold brew ủ sẵn" lên ít nhất 1.000 ml nên chạy lại bao nhiêu lần cũng được.
- **Vì sao luồng Quầy phải đánh dấu PAID bằng SQL:** theo BR-07 và ADR-010, chỉ kết quả có chữ ký của cổng mới đặt được PAID, mà trang sandbox phải bấm tay. Luồng thanh toán thật đã có integration test và E2E dùng cổng giả ký đúng như cổng thật (`tests/integration/support`, `tests/e2e/mock-vnpay`).
- **Thanh toán:** request mở phiên VNPay trả 502 nếu `.env` thiếu khóa VNPay.
- **Chạy trên production:** đặt `BASE_URL` là URL API trên Render thì các folder chính chạy được, trừ bước đánh dấu PAID (cần quyền vào CSDL). Không nên chạy trên production trước buổi demo vì test tạo đơn, nhập kho thật.
- Đơn chưa thanh toán tự hủy sau 15 phút và trả nguyên liệu về kho, nên không cần xóa tay các đơn tạo ra khi test.
- Nếu báo lỗi kết nối: kiểm tra `docker compose ps` thấy `db` và `api` đang chạy, API nghe ở cổng 4000 (`curl http://localhost:4000/health`).
