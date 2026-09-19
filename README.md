# AASC V2 - Tuyển Tập Bài Kiểm Tra Tích Hợp & Tự Động Hóa Bitrix24

> Tuyển tập giải pháp tự động hóa tích hợp doanh nghiệp Vòng 2 Developer:
> 1. **Bài 1**: Đồng bộ dữ liệu hai chiều giữa Google Sheets và Bitrix24 CRM.
> 2. **Bài 2**: Tích hợp TikTok Lead Generation Ads với Bitrix24 CRM qua BullMQ Queue, Rule Engine tự động tạo Deal và Analytics Dashboard.
> 3. **Bài 3**: Xây dựng 2 quy trình Workflow trên Bitrix24 (Quy trình nghỉ phép 3 cấp & Quy trình chi phí công tác 4 cấp) và xuất file `.bpt`.

---

## 📂 Danh Mục Bài Tập & Cấu Trúc Dự Án

### 1. Bài 1: Tích Hợp Google Sheets Với Bitrix24 CRM
- **Thư mục dự án**: [`tich-hop-google-sheet-bitrix24/`](./tich-hop-google-sheet-bitrix24/)
- **Tài liệu thiết kế**: [`docs/superpowers/specs/2026-09-19-google-sheets-bitrix24-sync-design.md`](./docs/superpowers/specs/2026-09-19-google-sheets-bitrix24-sync-design.md)
- **Kế hoạch triển khai**: [`docs/superpowers/plans/2026-09-19-google-sheets-bitrix24-sync.md`](./docs/superpowers/plans/2026-09-19-google-sheets-bitrix24-sync.md)
- **Đặc điểm nổi bật**:
  - Đồng bộ 2 chiều (Bi-directional sync): Sheet ➔ Bitrix24 và Webhook Bitrix24 ➔ Sheet.
  - Tự động phát hiện và sinh 4 cột Tracking trên Sheet: `Trạng thái đồng bộ`, `Lead ID Bitrix24`, `Thời gian đồng bộ cuối`, `Thông báo lỗi`.
  - Cơ chế Idempotency qua SHA-256 Hash lưu trữ trên SQLite cục bộ, chống trùng lặp (Deduplication) và chống vòng lặp vô tận (Infinite Loop Prevention).
  - Web Admin Dashboard trực quan (`/admin`) với nút kích hoạt đồng bộ ngay, biểu đồ thống kê và chỉnh sửa field mapping.
  - Hỗ trợ CLI Command Runner độc lập (`npm run sync:cli`).

#### 🎥 Video Demo Bài 1 (Nhấp vào ảnh để xem trên YouTube):

[![Video Demo Tích hợp Google Sheets với Bitrix24 CRM](https://img.youtube.com/vi/QYbhUP7QNC4/maxresdefault.jpg)](https://youtu.be/QYbhUP7QNC4)

> 👆 *Nhấp vào hình ảnh trên để chuyển sang xem video trên YouTube (Full HD 1080p)*  
> Hoặc xem trực tiếp file video trên trình phát GitHub: [Demo_01.mp4 trên GitHub](https://github.com/Doan01062002/Test_V2_AASC/blob/main/docs/demo/Demo_01.mp4)

---

### 2. Bài 2: Tích Hợp TikTok Lead Generation Với Bitrix24 CRM
- **Thư mục dự án**: [`tich-hop-tiktok-bitrix24/`](./tich-hop-tiktok-bitrix24/)
- **Tài liệu thiết kế**: [`docs/superpowers/specs/2026-09-19-tiktok-bitrix24-integration-design.md`](./docs/superpowers/specs/2026-09-19-tiktok-bitrix24-integration-design.md)
- **Kế hoạch triển khai**: [`docs/superpowers/plans/2026-09-19-tiktok-bitrix24-integration.md`](./docs/superpowers/plans/2026-09-19-tiktok-bitrix24-integration.md)
- **Tài liệu README chi tiết từ A-Z**: [`tich-hop-tiktok-bitrix24/README.md`](./tich-hop-tiktok-bitrix24/README.md)
- **Đặc điểm nổi bật**:
  - Webhook xác thực chữ ký bảo mật HMAC-SHA256 phản hồi tức thì <50ms.
  - Hàng đợi xử lý bất đồng bộ BullMQ & Redis (Rate Limiter 2/s, Exponential Backoff Retry 3x, Dead Letter Queue - DLQ & Quản trị DLQ).
  - Chuẩn hóa số điện thoại E.164, Email RFC 5322, Lead Quality Score (0-100 pts) song ngữ và chống trùng lặp dữ liệu.
  - Rule Engine tự động chuyển đổi Lead thành Deal trên Bitrix24, gán nhân viên phụ trách, cập nhật `STATUS_ID: CONVERTED`, và ghi chú lịch sử Timeline CRM (`crm.timeline.comment.add`).
  - Đồng bộ trạng thái chuyển đổi ngược về TikTok Events API (Conversion Events).
  - Xử lý hàng loạt (Batch Processing) phục vụ di chuyển dữ liệu lịch sử (`POST /api/v1/leads/batch`).
  - Web Dashboard SPA (`/dashboard`), Báo cáo định kỳ & Cảnh báo tự động (`/reports/scheduled-summary`, `/reports/trigger-alert`), Swagger OpenAPI (`/api/docs` & `docs/swagger.json`), và xuất báo cáo CSV UTF-8 with BOM / JSON.

---

### 3. Bài 3: Xây Dựng 2 Workflow Trên Bitrix24
- **Thư mục dự án**: [`tich-hop-workflow-bitrix24/`](./tich-hop-workflow-bitrix24/)
- **Tài liệu hướng dẫn Markdown**: [`tich-hop-workflow-bitrix24/docs/Huong_Dan_Xay_Dung_Workflow_Bitrix24.md`](./tich-hop-workflow-bitrix24/docs/Huong_Dan_Xay_Dung_Workflow_Bitrix24.md)
- **Tài liệu mô tả Word (.docx)**: [`tich-hop-workflow-bitrix24/docs/Tai_Lieu_Mo_Ta_Workflow_Bitrix24.docx`](./tich-hop-workflow-bitrix24/docs/Tai_Lieu_Mo_Ta_Workflow_Bitrix24.docx)
- **Thư mục lưu file export .bpt**: [`tich-hop-workflow-bitrix24/exports/`](./tich-hop-workflow-bitrix24/exports/)
  - `NghiPhep_3Cap.bpt`: Quy trình nghỉ phép qua 3 cấp phê duyệt (Quản lý $\rightarrow$ Nhân sự $\rightarrow$ Giám đốc), có rẽ nhánh kiểm tra số ngày phép còn lại.
  - `ChiPhiCongTac_4Cap.bpt`: Quy trình phê duyệt chi phí đi công tác qua 4 cấp (Quản lý $\rightarrow$ TP Tài chính $\rightarrow$ Phó GĐ Tài chính $\rightarrow$ Giám đốc), có kiểm tra hạn mức ngân sách và đính kèm hóa đơn/báo giá.
- **Đặc điểm nổi bật**:
  - Hỗ trợ xử lý từ chối tại bất kỳ cấp nào với lý do từ chối và thông báo tự động.
  - Giao diện thân thiện, dễ nhập liệu trên Bitrix24.
  - Lưu trữ đầy đủ lịch sử phê duyệt (Audit Trail).
  - Dễ dàng import vào bất kỳ cổng Bitrix24 nào chỉ với 1 cú nhấp chuột.

---

## 🚀 Hướng Dẫn Nhanh Bài 1: Google Sheets - Bitrix24

```bash
cd tich-hop-google-sheet-bitrix24

# 1. Cài đặt thư viện dependencies
npm install

# 2. Chạy kiểm thử tự động (Unit Tests Coverage >= 80%)
npm run test:cov

# 3. Khởi động Web Admin Server
npm run start:dev
# -> Mở trình duyệt Web Admin: http://localhost:3000/admin
# -> Mở tài liệu Swagger:       http://localhost:3000/api/docs

# 4. Hoặc chạy đồng bộ trực tiếp qua CLI Runner (không cần bật web)
npm run sync:cli
```

---

## 🚀 Hướng Dẫn Nhanh Bài 2: TikTok - Bitrix24

```bash
cd tich-hop-tiktok-bitrix24

# 1. Cài đặt thư viện dependencies
npm install

# 2. Nạp dữ liệu cấu hình ban đầu (Field Mappings & Rule Engine)
npm run seed

# 3. Chạy kiểm thử tự động (Unit Tests Coverage đạt 93.35%)
npm run test:cov

# 4. Khởi động ứng dụng
npm run start:dev
# -> Mở Web Dashboard:  http://localhost:3000/dashboard
# -> Mở Swagger Docs:   http://localhost:3000/api/docs
# -> Kiểm tra Health:   http://localhost:3000/health

# 5. Gửi thử nghiệm Mock TikTok Webhook có chữ ký HMAC-SHA256
npm run mock:webhook

# 6. Chạy thử nghiệm Batch Migration (nạp dữ liệu lịch sử hàng loạt)
npm run migrate:historical
```

---

## 🚀 Hướng Dẫn Nhanh Bài 3: Workflow Trên Bitrix24

```bash
cd tich-hop-workflow-bitrix24

# 1. Xem tài liệu hướng dẫn thiết lập từ A-Z:
# -> File Markdown: docs/Huong_Dan_Xay_Dung_Workflow_Bitrix24.md
# -> File Word:     docs/Tai_Lieu_Mo_Ta_Workflow_Bitrix24.docx

# 2. Tạo lại file Word (.docx) mới nhất bất kỳ lúc nào:
node scripts/generate-docx.js

# 3. Xuất file từ Bitrix24 về máy:
# -> Lưu NghiPhep_3Cap.bpt vào thư mục exports/
# -> Lưu ChiPhiCongTac_4Cap.bpt vào thư mục exports/
```
