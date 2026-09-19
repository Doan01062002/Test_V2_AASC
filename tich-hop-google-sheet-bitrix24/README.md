# Hệ Thống Tích Hợp Đồng Bộ Google Sheets với Bitrix24 CRM (Version 2)

Hệ thống tự động hóa đồng bộ dữ liệu hai chiều giữa **Google Sheets** và **Bitrix24 CRM** xây dựng trên nền tảng **NestJS 10**, **TypeScript**, **SQLite (TypeORM)**, hỗ trợ cơ chế Rate Limiting, Exponential Backoff, phát hiện trùng lặp thông minh, Idempotency SHA-256, Web Admin Dashboard trực quan và CLI Runner độc lập.

---

## 🎥 Video Demo Sản Phẩm

- **Đường dẫn video trong repository**: [`../docs/demo/Demo_01.mp4`](../docs/demo/Demo_01.mp4)
- **Xem trực tiếp trên GitHub**: [Tải hoặc xem video Demo_01.mp4](https://github.com/Doan01062002/Test_V2_AASC/raw/main/docs/demo/Demo_01.mp4)

Video minh họa toàn bộ các luồng nghiệp vụ:
- ✅ Thao tác trên **Web Admin Panel** (`http://localhost:3000/admin`).
- ✅ Tạo mới khách hàng trên Google Sheet và bấm nút **"Đồng bộ Ngay"**.
- ✅ Tự động ghi nhận **Lead ID Bitrix24** và cập nhật trạng thái **"Đã đồng bộ"** ngược về Google Sheet.
- ✅ Kiểm chứng khách hàng xuất hiện chính xác trên **Bitrix24 CRM** (`/crm/lead/list/`).
- ✅ Kiểm chứng cơ chế **chống trùng lặp (TC3)** và **Idempotency** khi dữ liệu không đổi.

---

## 1. Tính Năng Nổi Bật

### 1.1. Chức năng Cốt lõi (MVP)
- **Đồng bộ một chiều linh hoạt (Sheet ➔ Bitrix24)**: Đọc dữ liệu từ Google Sheet (Tên khách hàng, Email, Số điện thoại, Công ty, Nguồn lead, Ngân sách, Trạng thái, Người phụ trách, Ghi chú), tự động chuẩn hóa và tạo hoặc cập nhật Lead trên CRM.
- **Tự động gắn 4 cột Tracking trên Sheet**: Nếu Google Sheet chưa có các cột tracking, hệ thống tự động bổ sung:
  1. `Trạng thái đồng bộ` (`Chờ xử lý`, `Đã đồng bộ`, `Lỗi`)
  2. `Lead ID Bitrix24`
  3. `Thời gian đồng bộ cuối`
  4. `Thông báo lỗi`
- **Chống trùng lặp dữ liệu thông minh**: Trước khi tạo lead mới, tự động truy vấn Bitrix24 theo Email hoặc Số điện thoại. Nếu phát hiện lead đã tồn tại, hệ thống chuyển sang cập nhật bản ghi thay vì tạo trùng lặp.
- **Batch Processing & Cập nhật hàng loạt**: Cập nhật trạng thái ngược về Google Sheet theo đợt (`batchUpdate`) giúp tiết kiệm quota API.
- **Lập lịch tự động & Kích hoạt thủ công**: Hỗ trợ Cron scheduler định kỳ (`@nestjs/schedule`), REST API endpoint (`POST /api/sync/trigger`), Web Dashboard và CLI Runner.

### 1.2. Tính năng Nâng cao (Bonus Features)
- **Đồng bộ hai chiều theo thời gian thực (Bitrix24 ➔ Sheet Webhook)**: Lắng nghe sự kiện `ONCRMLEADUPDATE`, `ONCRMLEADADD` từ Bitrix24 để tự động cập nhật trạng thái (`STATUS_ID`) về Google Sheet ngay lập tức.
- **Phòng chống vòng lặp vô tận (Infinite Loop Prevention)**: So sánh hash dữ liệu để nhận diện các thay đổi do chính hệ thống vừa đồng bộ, ngăn chặn tình trạng Sheet và CRM cập nhật qua lại liên tục.
- **Giải quyết xung đột dữ liệu (Conflict Resolution)**:
  - Trường trạng thái (`STATUS_ID`) và Người phụ trách (`ASSIGNED_BY_ID`): Bitrix24 làm Master.
  - Thông tin liên hệ (Tên, Email, SĐT, Ngân sách, Ghi chú): Google Sheet làm Master.
  - Xung đột đồng thời: Áp dụng nguyên tắc Last-Write-Wins.
- **Chuẩn hóa dữ liệu nâng cao**:
  - Chuẩn hóa SĐT Việt Nam (+84, 84, dấu cách, gạch ngang -> `0xxxxxxxxx`).
  - Chuẩn hóa Email (lowercase, RFC 5322 regex).
  - Tự động tách Họ và Tên.
  - Chuẩn hóa tiền tệ/ngân sách (xóa ký tự VND, đ, dấu chấm phẩy phân tách hàng nghìn).
  - Ánh xạ đa ngôn ngữ Trạng thái (Mới, Đang liên hệ, Đạt tiêu chuẩn, Chuyển giao, Không tiềm năng).
- **Web Admin Panel (Single-Port UI)**: Giao diện trực quan tại `/admin` xây dựng bằng Tailwind CSS + Alpine.js, xem biểu đồ thống kê, lịch sử đồng bộ, kích hoạt sync thủ công và chỉnh sửa cấu hình mapping.
- **CLI Command Runner**: Lệnh `npm run sync:cli` hỗ trợ tham số `--full`, `--dry-run`, `--sheet`.

### 1.3. Độ tin cậy & Hiệu năng
- **Rate Limiting nghiêm ngặt**: Khống chế tối đa 2 requests/giây theo giới hạn của Bitrix24 Cloud API.
- **Exponential Backoff Retry**: Tự động thử lại tối đa 3 lần với thời gian chờ cấp số nhân (1s, 2s, 4s) khi gặp lỗi HTTP 429 hoặc lỗi mạng tạm thời.
- **Idempotency (SHA-256 Hash)**: Lưu vết hash của từng dòng, đảm bảo chạy lại cùng một tác vụ nhiều lần không phát sinh lead thừa.
- **Isolated Error Boundary**: Lỗi tại một dòng bất kỳ được ghi nhận chi tiết vào cột "Thông báo lỗi" của dòng đó mà không làm dừng hoặc crash tiến trình của các dòng còn lại.

---

## 2. Kiến Trúc Hệ Thống (Architecture)

```
                     +---------------------------------------+
                     |         Google Sheets API v4          |
                     +---------------------------------------+
                                  ^              |
                      batchUpdate |              | values.get
                                  |              v
                     +---------------------------------------+
                     |          GoogleSheetsService          |
                     +---------------------------------------+
                                         ^
                                         |
+---------------------------------------------------------------------------------+
|                                SyncEngineService                                |
|  - Idempotency & Change Detection (SHA-256 Hash via SQLite)                     |
|  - Rate Limiter Throttling (2 requests / second)                                |
|  - Exponential Backoff Retry (1s, 2s, 4s)                                       |
|  - Error Boundary per record                                                    |
+---------------------------------------------------------------------------------+
     |                     |                            |                     ^
     v                     v                            v                     |
+---------------+  +-------------------+  +--------------------+  +-------------------+
|DataTransformer|  | ConflictResolver  |  |  Bitrix24Service   |  |  WebhookService   |
| - Phone/Email |  | - CRM Master      |  | - crm.lead.add/upd |  | - Realtime Events |
| - Currency    |  | - Sheet Master    |  | - crm.lead.list    |  |   ONCRMLEADUPDATE |
| - Status Enum |  | - Loop Prevention |  | - Batch command    |  |   ONCRMLEADADD    |
+---------------+  +-------------------+  +--------------------+  +-------------------+
                                                        |                     ^
                                                        v                     |
                                          +---------------------------------------+
                                          |           Bitrix24 REST API           |
                                          +---------------------------------------+
```

---

## 3. Cấu Trúc Thư Mục

```
tich-hop-google-sheet-bitrix24/
├── src/
│   ├── admin/                         # Web Admin Module
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   └── admin.module.ts
│   ├── bitrix24/                      # Bitrix24 REST API Client
│   │   ├── bitrix24.interface.ts
│   │   ├── bitrix24.service.ts
│   │   └── bitrix24.module.ts
│   ├── cli/                           # CLI Command Runner
│   │   └── main.ts
│   ├── config/                        # Cấu hình & Validate biến môi trường
│   │   ├── configuration.ts
│   │   └── env.validation.ts
│   ├── database/                      # SQLite TypeORM Module & Entities
│   │   ├── entities/
│   │   │   ├── sync-log.entity.ts
│   │   │   ├── sync-hash.entity.ts
│   │   │   └── mapping-config.entity.ts
│   │   └── database.module.ts
│   ├── google-sheets/                 # Google Sheets API v4 Client
│   │   ├── google-sheets.interface.ts
│   │   ├── google-sheets.service.ts
│   │   └── google-sheets.module.ts
│   ├── sync/                          # Bộ điều phối đồng bộ (Core Engine)
│   │   ├── sync-engine.service.ts
│   │   ├── data-transformer.service.ts
│   │   ├── conflict-resolver.service.ts
│   │   ├── sync-scheduler.service.ts
│   │   ├── sync.controller.ts
│   │   └── sync.module.ts
│   ├── webhook/                       # Lắng nghe Webhook thời gian thực từ CRM
│   │   ├── webhook.controller.ts
│   │   ├── webhook.service.ts
│   │   └── webhook.module.ts
│   ├── app.module.ts
│   └── main.ts
├── public/
│   └── index.html                     # Web Admin Dashboard (Tailwind + Alpine.js)
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── mapping.json                       # Cấu hình ánh xạ cột
├── template-leads.csv                 # File CSV mẫu cho Google Sheets
├── package.json
└── tsconfig.json
```

---

## 4. Hướng Dẫn Cài Đặt và Khởi Chạy

### 4.1. Yêu Cầu Môi Trường
- Node.js >= 18.0.0 (khuyến nghị v20.x hoặc v22.x LTS)
- npm >= 9.x
- Docker & Docker Compose (tùy chọn)

### 4.2. Cài Đặt Thủ Công (Local)

1. Cài đặt dependencies:
   ```bash
   npm install
   ```

2. Cấu hình file `.env`:
   ```bash
   cp .env.example .env
   ```
   Chỉnh sửa các thông số:
   - `GOOGLE_SERVICE_ACCOUNT_FILE`: đường dẫn đến file JSON của Service Account (ví dụ `google-service-account.json`).
   - `GOOGLE_SPREADSHEET_ID`: ID của bảng tính Google Sheets.
   - `GOOGLE_SHEET_NAME`: Tên trang tính (ví dụ `Trang tính1`).
   - `BITRIX24_WEBHOOK_URL`: Đường dẫn Inbound Webhook của Bitrix24 (kết thúc bằng dấu `/`).

3. Đặt file Service Account Key vào thư mục gốc:
   ```bash
   # Copy file JSON tải từ Google Cloud Console
   cp path/to/service-account.json ./google-service-account.json
   ```
   > **Lưu ý quan trọng:** Cần mở Google Sheets, nhấn nút **Chia sẻ (Share)** và thêm email của Service Account (ví dụ: `sheets-sync-bot@aasc-sync.iam.gserviceaccount.com`) với quyền **Người chỉnh sửa (Editor)**.

4. Khởi động ứng dụng:
   ```bash
   # Chế độ phát triển (Watch mode)
   npm run start:dev

   # Hoặc build và chạy production
   npm run build
   npm run start:prod
   ```

5. Truy cập các dịch vụ:
   - **Web Admin Dashboard**: `http://localhost:3000/admin`
   - **Swagger API Docs**: `http://localhost:3000/api/docs`
   - **Webhook Endpoint**: `http://localhost:3000/api/webhook/bitrix24`

---

## 5. Hướng Dẫn Sử Dụng Chi Tiết

### 5.1. Chạy Đồng Bộ Qua CLI Runner
Hệ thống cung cấp CLI runner độc lập không phụ thuộc vào web server:
```bash
# Đồng bộ gia tăng mặc định (Incremental Sync)
npm run sync:cli

# Đồng bộ toàn bộ (Force Full Sync - bỏ qua cache hash)
npm run sync:cli -- --full

# Chạy thử nghiệm không ghi dữ liệu (Dry Run)
npm run sync:cli -- --dry-run

# Chỉ định worksheet cụ thể
npm run sync:cli -- --sheet "Khách hàng 2026"
```

### 5.2. Chạy Đồng Bộ Qua REST API
Trigger đồng bộ qua HTTP POST:
```bash
curl -X POST http://localhost:3000/api/sync/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "full": false,
    "dryRun": false
  }'
```

### 5.3. Sử Dụng Web Admin Panel (`/admin`)
Truy cập trình duyệt tại `http://localhost:3000/admin`:
- **Thẻ thống kê (Stats)**: Xem tổng số lượt chạy, số lead tạo mới, số lead cập nhật, số lead bỏ qua và lỗi.
- **Nút "Đồng bộ Ngay"**: Cho phép admin kích hoạt tức thì với các tùy chọn Full Sync hoặc Dry Run.
- **Bảng Lịch sử (Sync History)**: Xem danh sách chi tiết các lần chạy kèm mã Job ID, thời lượng, số dòng xử lý.
- **Trình soạn thảo Mapping (JSON Editor)**: Xem và điều chỉnh trực tiếp các quy tắc ánh xạ trường trên giao diện mà không cần restart server.

### 5.4. Thiết Lập Bitrix24 Outbound Webhook (Đồng bộ hai chiều)
Để Bitrix24 gửi thông báo realtime về Google Sheets khi nhân viên kinh doanh cập nhật trạng thái Lead:
1. Vào Bitrix24: **Developer Area (Khu vực nhà phát triển)** ➔ **Other (Khác)** ➔ **Outbound Webhook (Webhook gửi đi)**.
2. **URL xử lý**: Điền địa chỉ công khai của hệ thống: `https://your-domain.com/api/webhook/bitrix24`.
3. **Sự kiện lắng nghe**: Chọn `ONCRMLEADUPDATE` và `ONCRMLEADADD`.
4. Sao chép **Mã xác thực (Token)** và cấu hình vào biến `BITRIX24_OUTBOUND_TOKEN` trong `.env`.

---

## 6. Triển Khai Với Docker

Dự án hỗ trợ container hóa hoàn chỉnh qua Docker và Docker Compose:

```bash
# Khởi động dịch vụ qua Docker Compose
docker-compose up -d --build

# Xem logs hệ thống
docker-compose logs -f

# Dừng dịch vụ
docker-compose down
```

---

## 7. Kiểm Thử Hệ Thống (Automated Testing)

Toàn bộ các test cases theo yêu cầu của đề bài được bao phủ với **Test Coverage > 87%**:
- **TC1 - Tạo Lead Mới**: Tạo mới lead trên CRM khi hàng chưa có Lead ID, ghi nhận Lead ID và trạng thái `Đã đồng bộ`.
- **TC2 - Cập Nhật Lead**: Cập nhật lead tương ứng trên Bitrix24 khi hàng đã có Lead ID.
- **TC3 - Chống Trùng Lặp**: Nhận diện lead đã tồn tại qua Email/SĐT và chuyển sang cập nhật.
- **TC4 - Xử Lý Lỗi & Backoff**: Tự động thử lại khi gặp lỗi mạng/rate limit; ghi nhận thông báo lỗi chi tiết mà không crash app.
- **TC5 - Idempotency Validation**: Kiểm tra tính bất biến khi chạy lại nhiều lần cùng một dữ liệu.

Chạy kiểm thử:
```bash
# Chạy toàn bộ Unit Tests
npm test

# Chạy kiểm thử kèm báo cáo Coverage chi tiết
npm run test:cov
```

---

## 8. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

1. **Lỗi `Unable to parse range` hoặc `The caller does not have permission` trên Google Sheets**:
   - Kiểm tra xem file Google Sheet đã được Chia sẻ cho email của Service Account chưa.
   - Kiểm tra tên Sheet trong `.env` (`GOOGLE_SHEET_NAME`) có khớp với tên tab bảng tính không (ví dụ `Trang tính1` thay vì `Sheet1`).
2. **Lỗi `INVALID_CREDENTIALS` từ Bitrix24**:
   - Kiểm tra lại Webhook URL trong `.env`, đảm bảo có dấu gạch chéo `/` ở cuối.
   - Đảm bảo Inbound Webhook trong Bitrix24 có tích chọn quyền `crm` (Quản lý quan hệ khách hàng).
3. **Lỗi `QUERY_LIMIT_EXCEEDED` (HTTP 429)**:
   - Hệ thống đã tích hợp sẵn Rate Limiter (2 req/s) và Exponential Backoff Retry. Nếu Bitrix24 có các ứng dụng khác cùng gọi đồng thời, có thể giảm `RATE_LIMIT_RPS=1` trong file `.env`.
