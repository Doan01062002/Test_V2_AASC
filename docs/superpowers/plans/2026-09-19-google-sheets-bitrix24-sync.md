# Google Sheets with Bitrix24 CRM Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng giải pháp tự động hóa tích hợp đồng bộ dữ liệu hai chiều giữa Google Sheets và Bitrix24 CRM bằng NestJS 10, hỗ trợ batching, rate limiting, chống trùng lặp, giải quyết xung đột, Web Admin Panel và CLI runner.

**Architecture:** Áp dụng mô hình Modular Pipeline Architecture trên NestJS 10. Tách biệt các module: GoogleSheets (Google API v4), Bitrix24 (REST API & Webhook), SyncEngine (Pipeline điều phối, Idempotency hash, Batching, Backoff Retry), Webhook (Realtime CRM receiver), Admin (Web UI Single-port), và CLI runner độc lập.

**Tech Stack:** Node.js, NestJS 10, TypeScript, TypeORM, SQLite, googleapis, axios, @nestjs/schedule, Tailwind CSS, Alpine.js, Jest, Docker.

## Global Constraints

- Source code lưu tại: `d:\AASC_V2\tich-hop-google-sheet-bitrix24`
- Google Sheets API: Google Cloud Service Account (`aasc-sync-d2f414812b2c.json`) & OAuth2
- Bitrix24 REST API: Inbound Webhook (`https://b24-lgjau5.bitrix24.vn/rest/1/x05gotm70jw0jfcg/`)
- Spreadsheet Test ID: `1FulIWv_CjZiq9dil9iYg5uu2iT-C5d0OLeAOFWrQbUc`
- Unit Test Coverage: Tối thiểu 70% (mục tiêu > 85%)
- Xử lý Rate Limiting: 2 requests/giây đối với Bitrix24 Cloud, Exponential Backoff retry tối đa 3 lần (1s, 2s, 4s)
- Tự động bổ sung 4 cột tracking nếu chưa có: `Trạng thái đồng bộ`, `Lead ID Bitrix24`, `Thời gian đồng bộ cuối`, `Thông báo lỗi`

---

### Task 1: Khởi Tạo Dự Án NestJS và Cấu Trúc Thư Mục
**Files:**
- Create: `tich-hop-google-sheet-bitrix24/package.json`
- Create: `tich-hop-google-sheet-bitrix24/tsconfig.json`
- Create: `tich-hop-google-sheet-bitrix24/nest-cli.json`
- Create: `tich-hop-google-sheet-bitrix24/src/main.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/app.module.ts`

**Interfaces:**
- Produces: NestJS bootstrap server lắng nghe tại port 3000, cấu hình CORS, global validation pipe.

- [ ] **Step 1: Khởi tạo thư mục và package.json với toàn bộ dependencies**
  - Cài đặt `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/config`, `@nestjs/typeorm`, `typeorm`, `sqlite3`, `googleapis`, `axios`, `@nestjs/axios`, `@nestjs/schedule`, `class-validator`, `class-transformer`. Dev dependencies: `@nestjs/testing`, `jest`, `ts-jest`, `typescript`, `@types/node`, `@types/jest`.
- [ ] **Step 2: Cấu hình tsconfig.json, tsconfig.build.json, nest-cli.json**
- [ ] **Step 3: Tạo src/main.ts và src/app.module.ts**
- [ ] **Step 4: Chạy `npm install` và kiểm tra `npm run build`**
- [ ] **Step 5: Commit**
  - `git add tich-hop-google-sheet-bitrix24; git commit -m "chore: scaffold nestjs 10 project structure"`

---

### Task 2: Config Module & SQLite Database Module
**Files:**
- Create: `tich-hop-google-sheet-bitrix24/src/config/configuration.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/config/env.validation.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/database/entities/sync-log.entity.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/database/entities/sync-hash.entity.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/database/entities/mapping-config.entity.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/database/database.module.ts`
- Test: `tich-hop-google-sheet-bitrix24/src/config/env.validation.spec.ts`

**Interfaces:**
- Consumes: Environment variables (`.env`)
- Produces: TypeORM repositories cho `SyncLog`, `SyncHash`, `MappingConfig`

- [ ] **Step 1: Viết test validate biến môi trường**
- [ ] **Step 2: Hiện thực Configuration & Env Validation**
- [ ] **Step 3: Định nghĩa TypeORM Entities (`SyncLog`, `SyncHash`, `MappingConfig`)**
- [ ] **Step 4: Cấu hình DatabaseModule kết nối SQLite `data/sync.sqlite`**
- [ ] **Step 5: Chạy unit test xác minh cấu hình hợp lệ**
- [ ] **Step 6: Commit**
  - `git commit -m "feat(config,database): setup configuration and sqlite typeorm entities"`

---

### Task 3: Google Sheets Module (API v4, Service Account & Auto Header Injection)
**Files:**
- Create: `tich-hop-google-sheet-bitrix24/src/google-sheets/google-sheets.interface.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/google-sheets/google-sheets.service.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/google-sheets/google-sheets.module.ts`
- Test: `tich-hop-google-sheet-bitrix24/src/google-sheets/google-sheets.service.spec.ts`

**Interfaces:**
- Produces:
  - `getRows(spreadsheetId: string, range?: string): Promise<SheetRow[]>`
  - `batchUpdateRows(spreadsheetId: string, updates: SheetValueUpdate[]): Promise<void>`
  - `appendRow(spreadsheetId: string, values: string[]): Promise<void>`
  - `ensureTrackingColumns(spreadsheetId: string, sheetName: string): Promise<TrackingColumnIndices>`

- [ ] **Step 1: Viết failing test cho GoogleSheetsService** (Mock `googleapis.sheets('v4')`)
- [ ] **Step 2: Hiện thực cơ chế xác thực Service Account JWT / OAuth2**
- [ ] **Step 3: Hiện thực đọc dữ liệu range và parse headers linh hoạt**
- [ ] **Step 4: Hiện thực tự động nhận diện và chèn 4 cột tracking nếu chưa có**
- [ ] **Step 5: Hiện thực batchUpdate các cột trạng thái**
- [ ] **Step 6: Chạy test GoogleSheetsService kiểm tra PASS 100%**
- [ ] **Step 7: Commit**
  - `git commit -m "feat(google-sheets): implement api v4 service account client and batch update"`

---

### Task 4: Bitrix24 Module (REST API, Rate Limiting & Exponential Backoff)
**Files:**
- Create: `tich-hop-google-sheet-bitrix24/src/bitrix24/bitrix24.interface.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/bitrix24/bitrix24.service.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/bitrix24/bitrix24.module.ts`
- Test: `tich-hop-google-sheet-bitrix24/src/bitrix24/bitrix24.service.spec.ts`

**Interfaces:**
- Produces:
  - `findLeadByEmailOrPhone(email?: string, phone?: string): Promise<BitrixLead | null>`
  - `createLead(fields: Record<string, any>): Promise<number>`
  - `updateLead(id: number, fields: Record<string, any>): Promise<boolean>`
  - `getLead(id: number): Promise<BitrixLead | null>`
  - `batchExecute(commands: Record<string, string>): Promise<Record<string, any>>`

- [ ] **Step 1: Viết failing test cho Bitrix24Service** (Mock axios HTTP client)
- [ ] **Step 2: Hiện thực Rate Limiter** (Throttling 2 requests/giây để tránh lỗi 429)
- [ ] **Step 3: Hiện thực Exponential Backoff Retry** (Tối đa 3 lần: 1s, 2s, 4s khi gặp 429/timeout)
- [ ] **Step 4: Hiện thực các API CRM: `crm.lead.list`, `crm.lead.add`, `crm.lead.update`, `crm.lead.get`**
- [ ] **Step 5: Hiện thực Bitrix24 `batch` API để gửi nhóm lệnh**
- [ ] **Step 6: Chạy test Bitrix24Service kiểm tra PASS 100%**
- [ ] **Step 7: Commit**
  - `git commit -m "feat(bitrix24): implement rest api client with rate limiter and backoff retry"`

---

### Task 5: Data Transformer & Conflict Resolver
**Files:**
- Create: `tich-hop-google-sheet-bitrix24/src/sync/data-transformer.service.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/sync/conflict-resolver.service.ts`
- Test: `tich-hop-google-sheet-bitrix24/src/sync/data-transformer.service.spec.ts`
- Test: `tich-hop-google-sheet-bitrix24/src/sync/conflict-resolver.service.spec.ts`

**Interfaces:**
- Produces:
  - `DataTransformerService.transformSheetRowToLead(row: Record<string, any>, mapping: MappingRule[]): TransformedLead`
  - `DataTransformerService.normalizePhone(phone: string): string`
  - `DataTransformerService.normalizeEmail(email: string): string`
  - `ConflictResolverService.resolveLeadConflict(crmLead: BitrixLead, sheetRow: SheetRow): ConflictResolutionResult`

- [ ] **Step 1: Viết unit test kiểm thử chuẩn hóa số điện thoại, email, tiền tệ, enum status**
- [ ] **Step 2: Hiện thực DataTransformerService**
- [ ] **Step 3: Viết unit test kiểm thử giải quyết xung đột (Field Priority & Last-Write-Wins)**
- [ ] **Step 4: Hiện thực ConflictResolverService và phòng chống infinite loop**
- [ ] **Step 5: Chạy unit test kiểm tra PASS 100%**
- [ ] **Step 6: Commit**
  - `git commit -m "feat(sync): implement data transformer and conflict resolver services"`

---

### Task 6: Sync Engine Pipeline & Scheduler (Core MVP)
**Files:**
- Create: `tich-hop-google-sheet-bitrix24/src/sync/sync-engine.service.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/sync/sync-scheduler.service.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/sync/sync.controller.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/sync/sync.module.ts`
- Test: `tich-hop-google-sheet-bitrix24/src/sync/sync-engine.service.spec.ts`

**Interfaces:**
- Produces:
  - `SyncEngineService.executeSync(options?: SyncOptions): Promise<SyncSummary>`
  - `SyncController`: `POST /api/sync/trigger`
  - `SyncSchedulerService`: Cron job định kỳ (`@Cron(cronExpression)`)

- [ ] **Step 1: Viết unit test bao phủ toàn bộ Test Cases theo đề bài:**
  - **TC1**: Tạo Lead mới -> Lead ID được ghi vào Sheet -> Status "Đã đồng bộ"
  - **TC2**: Cập nhật Lead -> Lead ID đã có -> CRM được cập nhật -> Cập nhật thời gian sync
  - **TC3**: Chống trùng lặp -> Email/SĐT đã có -> Cập nhật lead hiện có thay vì tạo mới
  - **TC4**: Error handling -> Retry với backoff -> Log lỗi chi tiết -> Tiếp tục records khác
  - **TC5**: Idempotency -> Chạy lại job không sinh lead trùng
- [ ] **Step 2: Hiện thực thuật toán tính SHA-256 hash và kiểm soát trạng thái row**
- [ ] **Step 3: Hiện thực luồng xử lý Batching và cập nhật Sheet qua `batchUpdateRows`**
- [ ] **Step 4: Hiện thực SyncSchedulerService với Cron cấu hình linh hoạt qua .env**
- [ ] **Step 5: Hiện thực SyncController để trigger thủ công qua HTTP REST API**
- [ ] **Step 6: Chạy test SyncEngine kiểm tra PASS 100%**
- [ ] **Step 7: Commit**
  - `git commit -m "feat(sync): implement sync engine pipeline with idempotency and scheduler"`

---

### Task 7: Real-time Webhook Receiver (Bonus Feature: Bitrix24 -> Sheet)
**Files:**
- Create: `tich-hop-google-sheet-bitrix24/src/webhook/webhook.controller.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/webhook/webhook.service.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/webhook/webhook.module.ts`
- Test: `tich-hop-google-sheet-bitrix24/src/webhook/webhook.service.spec.ts`

**Interfaces:**
- Produces:
  - `POST /api/webhook/bitrix24`: Tiếp nhận event `ONCRMLEADUPDATE`, `ONCRMLEADADD`
  - Bỏ qua nếu dữ liệu khớp `last_synced_hash` (tránh infinite loop)
  - Cập nhật dòng tương ứng trên Google Sheet

- [ ] **Step 1: Viết test cho Webhook Receiver và xác thực token**
- [ ] **Step 2: Hiện thực WebhookController và WebhookService**
- [ ] **Step 3: Chạy test WebhookModule PASS 100%**
- [ ] **Step 4: Commit**
  - `git commit -m "feat(webhook): implement realtime bitrix24 outbound webhook listener"`

---

### Task 8: Web Admin Panel (Bonus Feature: Single-port UI)
**Files:**
- Create: `tich-hop-google-sheet-bitrix24/src/admin/admin.controller.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/admin/admin.service.ts`
- Create: `tich-hop-google-sheet-bitrix24/src/admin/admin.module.ts`
- Create: `tich-hop-google-sheet-bitrix24/public/index.html` (Giao diện Tailwind CSS + Alpine.js)

**Interfaces:**
- Produces:
  - `GET /admin`: Phục vụ Web Dashboard
  - `GET /api/admin/stats`: Trả về số liệu thống kê (Total synced, created, updated, errors)
  - `GET /api/admin/logs`: Trả về danh sách lịch sử đồng bộ
  - `GET /api/admin/mapping`: Lấy cấu hình mapping hiện tại
  - `PUT /api/admin/mapping`: Cập nhật cấu hình mapping

- [ ] **Step 1: Hiện thực AdminService và AdminController**
- [ ] **Step 2: Xây dựng giao diện Web Dashboard trực quan tại `public/index.html`**
- [ ] **Step 3: Tích hợp nút Trigger Sync trực tiếp trên giao diện**
- [ ] **Step 4: Commit**
  - `git commit -m "feat(admin): build single-port web admin panel with dashboard and mapping editor"`

---

### Task 9: CLI Command Runner
**Files:**
- Create: `tich-hop-google-sheet-bitrix24/src/cli/main.ts`
- Modify: `tich-hop-google-sheet-bitrix24/package.json` (thêm script `sync:cli`)

**Interfaces:**
- Produces: Command-line interface `npm run sync:cli [-- --full] [--dry-run]`

- [ ] **Step 1: Hiện thực standalone NestJS context runner cho CLI**
- [ ] **Step 2: Format output đẹp mắt trên terminal (ANSI colors, Summary table)**
- [ ] **Step 3: Thêm script vào package.json**
- [ ] **Step 4: Commit**
  - `git commit -m "feat(cli): add standalone sync cli command runner"`

---

### Task 10: Deliverables, Config Files, Docker & Documentation
**Files:**
- Create: `tich-hop-google-sheet-bitrix24/mapping.json`
- Create: `tich-hop-google-sheet-bitrix24/.env.example`
- Create: `tich-hop-google-sheet-bitrix24/template-leads.csv`
- Create: `tich-hop-google-sheet-bitrix24/Dockerfile`
- Create: `tich-hop-google-sheet-bitrix24/docker-compose.yml`
- Create: `tich-hop-google-sheet-bitrix24/README.md`
- Create: `README.md` (Root documentation)

- [ ] **Step 1: Tạo `mapping.json` chuẩn hóa đầy đủ các trường đề bài yêu cầu**
- [ ] **Step 2: Tạo `.env.example` với hướng dẫn cấu hình chi tiết**
- [ ] **Step 3: Tạo `template-leads.csv` mẫu cho người dùng import vào Sheet**
- [ ] **Step 4: Viết `Dockerfile` multi-stage build và `docker-compose.yml`**
- [ ] **Step 5: Viết tài liệu `README.md` chi tiết từ A-Z**
- [ ] **Step 6: Commit**
  - `git commit -m "docs: add configuration files, docker setup, and comprehensive readme"`

---

### Task 11: Live End-to-End Verification & Real Test Cases
**Files:**
- Create: `tich-hop-google-sheet-bitrix24/.env` (với credentials thật người dùng cung cấp)
- Copy: Service account key vào thư mục cấu hình

- [ ] **Step 1: Cấu hình credentials thật (Spreadsheet ID & Bitrix24 Webhook URL)**
- [ ] **Step 2: Chạy toàn bộ bộ test tự động (`npm test`) để xác minh 100% test pass**
- [ ] **Step 3: Chạy thử nghiệm Live Sync với Google Sheet thực tế**
- [ ] **Step 4: Kiểm tra kết quả ghi nhận trên Google Sheet và Bitrix24 CRM**
- [ ] **Step 5: Commit hoàn thiện**
  - `git commit -m "chore: verify live integration with google sheets and bitrix24"`
