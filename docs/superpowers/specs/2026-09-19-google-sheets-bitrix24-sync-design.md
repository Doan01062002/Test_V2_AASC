# Tài Liệu Thiết Kế Kỹ Thuật: Hệ Thống Tích Hợp Google Sheets với Bitrix24 CRM (Vòng 2)

- **Dự án**: `tich-hop-google-sheet-bitrix24`
- **Mã bài thi**: `V2 - De bai Tich hop Google Sheet voi Bitrix24 CRM - Version 2.pdf`
- **Vị trí lưu trữ**: `D:\AASC_V2\tich-hop-google-sheet-bitrix24`
- **Ngày thiết kế**: 2026-09-19
- **Công nghệ chính**: NestJS 10, TypeScript, Google Sheets API v4, Bitrix24 REST API, SQLite (TypeORM), @nestjs/schedule, Tailwind CSS + Alpine.js, Jest, Docker.

---

## 1. Mục Tiêu và Bối Cảnh Hệ Thống

Hệ thống đóng vai trò cầu nối tự động hóa hai chiều giữa **Google Sheets** (nơi lưu trữ danh sách lead từ website, chiến dịch marketing, đối tác) và **Bitrix24 CRM** (nơi đội ngũ Sales & Marketing quản lý cơ hội bán hàng):
1. **Một chiều (Sheet -> CRM)**: Tự động phát hiện hàng mới, kiểm tra trùng lặp qua Email/SĐT, tạo mới hoặc cập nhật Lead trên Bitrix24, ghi nhận Lead ID và trạng thái đồng bộ ngược về Sheet.
2. **Hai chiều (CRM -> Sheet)**: Lắng nghe realtime webhook (`ONCRMLEADUPDATE`, `ONCRMLEADADD`) từ Bitrix24 để cập nhật trạng thái (`STATUS_ID`) và người phụ trách (`ASSIGNED_BY_ID`) về Google Sheet.
3. **Độ tin cậy & Hiệu năng**: Batching API, Rate limiting, Exponential Backoff, Idempotency hash chống tạo trùng bản ghi khi chạy lại cùng 1 tác vụ.
4. **Giao diện & Tiện ích**: Web Admin Panel quản lý trực quan (`/admin`), CLI Runner độc lập (`npm run sync:cli`), Unit test coverage > 80%.

---

## 2. Kiến Trúc Tổng Thể (System Architecture)

Hệ thống được tổ chức theo mô hình **Modular Pipeline Architecture** trên nền tảng NestJS 10:

```
                  +----------------------------------------------+
                  |         Google Sheets API v4                 |
                  +----------------------------------------------+
                                ^                    |
                     batchUpdate|                    |values.get
                                |                    v
                  +----------------------------------------------+
                  |            GoogleSheetsService               |
                  +----------------------------------------------+
                                         ^
                                         |
+--------------------------------------------------------------------------------+
|                                SyncEngineService                               |
|  - Idempotency & Change Detection (SHA-256 Hash)                               |
|  - Batch Coordination & Rate Limit Throttling (2 req/s)                        |
|  - Error Handling & Exponential Backoff Retry (1s, 2s, 4s)                     |
+--------------------------------------------------------------------------------+
     |                       |                            |              ^
     v                       v                            v              |
+----------------+  +-------------------+  +--------------------+  +---------------+
| DataTransformer|  | ConflictResolver  |  |    Bitrix24Service |  | WebhookService|
| - Phone / Email|  | - Field Priority  |  | - crm.lead.add/upd |  | - Realtime    |
| - Custom Fields|  | - Last-Write-Wins |  | - crm.lead.list    |  |   Bitrix24    |
| - Enum Mapping |  | - Loop Prevention |  | - Batch API calls  |  |   Events      |
+----------------+  +-------------------+  +--------------------+  +---------------+
                                                          |              ^
                                                          v              |
                                           +-------------------------------+
                                           |      Bitrix24 REST API        |
                                           +-------------------------------+
```

---

## 3. Cấu Trúc Thư Mục Dự Án

```
d:\AASC_V2/
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-09-19-google-sheets-bitrix24-sync-design.md
├── tich-hop-google-sheet-bitrix24/
│   ├── src/
│   │   ├── admin/
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   └── views/
│   │   │       └── index.html               # Web Admin Dashboard (Tailwind + Alpine.js)
│   │   ├── bitrix24/
│   │   │   ├── bitrix24.interface.ts
│   │   │   ├── bitrix24.service.ts
│   │   │   └── bitrix24.service.spec.ts
│   │   ├── cli/
│   │   │   └── main.ts                      # CLI Entry point (npm run sync:cli)
│   │   ├── config/
│   │   │   ├── configuration.ts
│   │   │   └── env.validation.ts
│   │   ├── database/
│   │   │   ├── entities/
│   │   │   │   ├── sync-log.entity.ts
│   │   │   │   ├── sync-hash.entity.ts
│   │   │   │   └── mapping-config.entity.ts
│   │   │   └── database.module.ts
│   │   ├── google-sheets/
│   │   │   ├── google-sheets.interface.ts
│   │   │   ├── google-sheets.service.ts
│   │   │   └── google-sheets.service.spec.ts
│   │   ├── sync/
│   │   │   ├── sync-engine.service.ts
│   │   │   ├── sync-engine.service.spec.ts
│   │   │   ├── data-transformer.service.ts
│   │   │   ├── data-transformer.service.spec.ts
│   │   │   ├── conflict-resolver.service.ts
│   │   │   ├── conflict-resolver.service.spec.ts
│   │   │   ├── sync-scheduler.service.ts
│   │   │   └── sync.controller.ts
│   │   ├── webhook/
│   │   │   ├── webhook.controller.ts
│   │   │   └── webhook.service.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/
│   │   ├── sync-flow.e2e-spec.ts
│   │   └── performance.spec.ts
│   ├── .env.example
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── mapping.json
│   ├── template-leads.csv
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
└── README.md
```

---

## 4. Chi Tiết Các Thành Phần Chính

### 4.1. Google Sheets Module
- **Xác thực**:
  - Hỗ trợ Google Service Account qua file `.json` hoặc qua biến môi trường (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`).
  - Hỗ trợ OAuth 2.0 Client credentials (nếu có `GOOGLE_REFRESH_TOKEN`).
- **Thao tác dữ liệu**:
  - `readSheetData(spreadsheetId, range)`: Sử dụng Google Sheets API `spreadsheets.values.get`.
  - `batchUpdateRows(spreadsheetId, updates)`: Sử dụng `spreadsheets.values.batchUpdate` ghi toàn bộ trạng thái trong 1 lượt request.
  - `ensureTrackingHeaders(spreadsheetId, sheetName, currentHeaders)`: Tự động kiểm tra và thêm 4 cột tracking vào cuối dòng 1 nếu chưa có:
    1. `Trạng thái đồng bộ`
    2. `Lead ID Bitrix24`
    3. `Thời gian đồng bộ cuối`
    4. `Thông báo lỗi`

### 4.2. Bitrix24 Module
- **Xác thực**: Inbound Webhook (`BITRIX24_WEBHOOK_URL`) và OAuth 2.0 access token.
- **REST Methods**:
  - `crm.lead.list`: Tìm kiếm trùng lặp qua filter Email (`{"=EMAIL": email}`) hoặc Số điện thoại (`{"=PHONE": phone}`).
  - `crm.lead.add`: Tạo mới lead với mảng Multifield chuẩn cho Email & Phone, các trường cơ bản và custom fields (`UF_CRM_...`).
  - `crm.lead.update`: Cập nhật thông tin lead hiện có.
  - `batch`: Đóng gói tối đa 50 commands/request để tối ưu hiệu năng.
- **Reliability & Rate Limiting**:
  - Rate Limiter in-process giới hạn 2 requests/giây theo quota của Bitrix24 Cloud.
  - Exponential Backoff retry: Tối đa 3 lần với delay 1s, 2s, 4s khi gặp HTTP 429 hoặc lỗi mạng tạm thời.

### 4.3. Data Transformer & Normalization
- **Chuẩn hóa Số điện thoại**: Loại bỏ dấu cách, dấu gạch ngang, đưa về định dạng số chuẩn (E.164 hoặc số nội địa hợp lệ).
- **Chuẩn hóa Email**: Cắt khoảng trắng thừa, lowercase toàn bộ, validate regex RFC 5322.
- **Định dạng Tiền tệ / Ngân sách**: Xử lý chuỗi (ví dụ "50,000,000 VND" -> `50000000`).
- **Enum Status Mapping**: Ánh xạ văn bản tiếng Việt sang mã trạng thái chuẩn CRM:
  - "Mới" / "New" -> `NEW`
  - "Đang liên hệ" / "In Process" -> `IN_PROCESS`
  - "Đạt tiêu chuẩn" -> `QUALIFIED`
  - "Chuyển giao" -> `CONVERTED`
  - "Không tiềm năng" -> `JUNK`
- **Ánh xạ người phụ trách**: Dựa trên email/tên nhân viên kinh doanh ra User ID trong Bitrix24.

### 4.4. Idempotency & Conflict Resolution
- **Sync Hash Generation**:
  `hash = SHA256(Name + Email + Phone + Company + UTM + Budget + Status + Assigned + Comments)`
  Lưu vào bảng `sync_hash` trong SQLite.
- **Chống vòng lặp vô tận (Infinite Loop Prevention)**:
  Lưu `last_synced_hash` và timestamp khi hệ thống vừa đẩy từ Sheet lên Bitrix24. Khi webhook gửi ngược từ Bitrix24 về, nếu hash dữ liệu khớp với giá trị vừa sync, hệ thống lập tức bỏ qua.
- **Quy tắc giải quyết xung đột (Conflict Resolution)**:
  - `STATUS_ID` và `ASSIGNED_BY_ID`: Bitrix24 là Master -> ghi đè về Google Sheet.
  - Thông tin nguồn (Tên, Email, SĐT, UTM, Ngân sách): Sheet là Master.
  - Xung đột đồng thời: So sánh timestamp (`DATE_MODIFY` trên CRM vs `Thời gian sửa đổi` trên Sheet) theo nguyên tắc Last-Write-Wins.

### 4.5. Web Admin Panel & CLI
- **Web Admin Panel (`/admin`)**:
  - Giao diện Single-Port Tailwind CSS + Alpine.js phục vụ tại port NestJS (mặc định 3000).
  - Dashboard thống kê tổng quan (Tổng số leads, số tạo mới, cập nhật, lỗi).
  - Xem bảng lịch sử đồng bộ (Sync History) và chi tiết log.
  - Nút Trigger Đồng Bộ Thủ Công (lựa chọn Full Sync hoặc Incremental Sync).
  - Trình biên tập Mapping JSON trực quan trên Web.
- **CLI Runner**:
  - Lệnh `npm run sync:cli` (chạy script console với cờ `--full` hoặc `--dry-run`).

---

## 5. Kịch Bản Kiểm Thử (Test Cases)

Đảm bảo bao phủ toàn bộ các yêu cầu trong mục 6 & 7 của đề bài với Unit Test Coverage > 80%:
1. **TC1 - Tạo Lead Mới**: Thêm hàng mới chưa có Lead ID -> Lead tạo thành công trên Bitrix24 -> Ghi Lead ID vào Sheet -> Trạng thái cập nhật "Đã đồng bộ".
2. **TC2 - Cập Nhật Lead**: Thay đổi dữ liệu của hàng đã có Lead ID -> Lead tương ứng trên Bitrix24 được cập nhật -> Cập nhật thời gian sync và hash mới.
3. **TC3 - Xử Lý Trùng Lặp**: Thêm lead mới với Email/SĐT đã có trên Bitrix24 -> Hệ thống detect trùng lặp qua `crm.lead.list` -> Cập nhật lead hiện có thay vì tạo mới.
4. **TC4 - Error Handling & Backoff**: Giả lập lỗi API 429 hoặc network timeout -> Hệ thống retry 3 lần với exponential backoff -> Ghi log chi tiết vào cột "Thông báo lỗi" và tiếp tục xử lý các hàng khác mà không crash app.
5. **TC5 - Idempotency Validation**: Chạy lại cùng 1 job đồng bộ liên tiếp -> Không phát sinh thêm bản ghi lead nào trên CRM.
6. **TC6 - Performance Test**: Kiểm thử với 100+ bản ghi bằng batch processing, đảm bảo tuân thủ rate limit và không bị timeout.

---

## 6. Deliverables

- Mã nguồn hoàn chỉnh kèm code comments chi tiết.
- Unit tests & integration tests chạy qua Jest.
- File cấu hình mẫu: `mapping.json`, `.env.example`, `template-leads.csv`.
- `Dockerfile` & `docker-compose.yml` cho việc triển khai container hóa dễ dàng.
- Tài liệu `README.md` hướng dẫn thiết lập từ A-Z.
