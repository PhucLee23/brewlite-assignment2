# Tài liệu BrewLite

| Thư mục / tệp | Nội dung | Task |
| --- | --- | --- |
| [requirements/](requirements/) | Bối cảnh, stakeholder, phạm vi; SRS; use-case tổng quát; đặc tả UC-06 | Task 1 |
| [diagrams/](diagrams/) | Activity, sequence, class diagram | Task 2 |
| [architecture/](architecture/) | Mô tả kiến trúc (C4 + phân lớp), ADR, deployment diagram | Task 3 |
| [traceability-matrix.md](traceability-matrix.md) | Ma trận truy vết yêu cầu → thiết kế → code → test | Task 1–5 |
| `deployment.md` | Hướng dẫn deploy và rollback (bổ sung ở Sprint 2) | Task 5 |

## Quy ước

- **Mọi thay đổi tài liệu đi qua pull request**, mô tả pull request ghi rõ lý do thay đổi và các mã yêu cầu bị ảnh hưởng (`FR-xx`, `NFR-xx`). Thay đổi yêu cầu thì cập nhật luôn ma trận truy vết.
- Sơ đồ vẽ bằng **PlantUML** (tệp nguồn `.puml`) hoặc **draw.io** (tệp nguồn `.drawio`). Commit cả tệp nguồn và ảnh kết xuất `.svg` cùng tên, nằm cạnh nhau. Mỗi sơ đồ chỉ có **một** tệp nguồn; sửa sơ đồ thì dùng đúng công cụ của tệp nguồn đó.
- Không ghi secret, mật khẩu thật hay chuỗi kết nối CSDL vào tài liệu.

## Xuất ảnh sơ đồ

Sau khi sửa tệp nguồn, xuất lại ảnh `.svg` cùng tên rồi commit cả hai.

**Sơ đồ draw.io** (`.drawio`): mở bằng https://app.diagrams.net hoặc extension *Draw.io Integration* (`hediet.vscode-drawio`), chọn *File → Export as → SVG*, nền trắng, lưu đè tệp `.svg` cùng tên.

**Sơ đồ PlantUML** (`.puml`), một trong hai cách:

1. **VS Code / Antigravity:** cài extension *PlantUML* (`jebbs.plantuml`), mở tệp `.puml`, chạy lệnh *PlantUML: Export Current Diagram* và chọn định dạng `svg`.
2. **Dòng lệnh** (cần Java và [Graphviz](https://graphviz.org/download/)):

   ```bash
   java -jar plantuml.jar -charset UTF-8 -tsvg docs/diagrams/sequence-checkout.puml
   ```

Có thể xem nhanh không cần cài đặt bằng cách dán nội dung `.puml` vào https://www.plantuml.com/plantuml.
