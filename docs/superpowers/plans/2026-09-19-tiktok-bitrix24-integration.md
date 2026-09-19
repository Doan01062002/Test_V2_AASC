# TikTok Lead Generation with Bitrix24 CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng ứng dụng NestJS 10 tích hợp TikTok Lead Generation với Bitrix24 CRM sử dụng PostgreSQL, Redis, BullMQ, Rule Engine tự động convert Deal, hệ thống Analytics & Reporting, Web Dashboard và Swagger OpenAPI.

**Architecture:** Áp dụng mô hình Event-Driven Queue Architecture với BullMQ và Redis. Webhook TikTok được tiếp nhận, xác thực chữ ký HMAC-SHA256 và phản hồi tức thì <50ms. Background worker đảm nhận chuẩn hóa dữ liệu, tính điểm Lead Quality Score (0-100), chống trùng lặp (Deduplication), đồng bộ sang Bitrix24 CRM, và thực thi Rule Engine để tự động tạo Deal và gửi thông báo.

**Tech Stack:** NestJS 10, TypeScript, PostgreSQL (TypeORM), Redis, BullMQ, @nestjs/throttler, Swagger/OpenAPI, Tailwind CSS, Alpine.js, Chart.js, Jest, Supertest, Docker Compose.

## Global Constraints

- Thư mục dự án: `d:\AASC_V2\tich-hop-tiktok-bitrix24`
- Cơ sở dữ liệu: PostgreSQL 16 (TypeORM), Redis 7 (BullMQ)
- Bitrix24 Inbound Webhook: `https://b24-lgjau5.bitrix24.vn/rest/1/jis7d07lt4b98fqe/`
- Chữ ký Webhook: `TikTok-Signature` (HMAC-SHA256 với `TIKTOK_APP_SECRET`, hỗ trợ cờ `BYPASS_WEBHOOK_SIGNATURE` trong dev)
- Unit Test Coverage: Tối thiểu 80% (theo yêu cầu trang 3 của đề bài)
- Bắt buộc đủ 10 API endpoints theo đặc tả trang 4-5 của đề bài

---

### Task 1: Khởi Tạo Dự Án NestJS và Cấu Trúc Thư Mục
**Files:**
- Create: `tich-hop-tiktok-bitrix24/package.json`
- Create: `tich-hop-tiktok-bitrix24/tsconfig.json`
- Create: `tich-hop-tiktok-bitrix24/tsconfig.build.json`
- Create: `tich-hop-tiktok-bitrix24/nest-cli.json`
- Create: `tich-hop-tiktok-bitrix24/src/main.ts`
- Create: `tich-hop-tiktok-bitrix24/src/app.module.ts`

- [x] **Step 1: Khởi tạo package.json với toàn bộ dependencies**
  - Cài đặt: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/config`, `@nestjs/typeorm`, `typeorm`, `pg`, `@nestjs/bullmq`, `bullmq`, `ioredis`, `@nestjs/throttler`, `@nestjs/swagger`, `swagger-ui-express`, `axios`, `@nestjs/axios`, `class-validator`, `class-transformer`.
- [x] **Step 2: Cấu hình tsconfig.json, tsconfig.build.json, nest-cli.json**
- [x] **Step 3: Tạo src/main.ts (kích hoạt Swagger tại `/api/docs`, ValidationPipe, CORS) và src/app.module.ts**
- [x] **Step 4: Chạy `npm install` và kiểm tra `npm run build`**
- [x] **Step 5: Commit**

---

### Task 2: Cấu Hình Môi Trường & PostgreSQL Database Module
**Files:**
- Create: `tich-hop-tiktok-bitrix24/src/config/configuration.ts`
- Create: `tich-hop-tiktok-bitrix24/src/config/env.validation.ts`
- Create: `tich-hop-tiktok-bitrix24/src/database/entities/lead.entity.ts`
- Create: `tich-hop-tiktok-bitrix24/src/database/entities/deal.entity.ts`
- Create: `tich-hop-tiktok-bitrix24/src/database/entities/configuration.entity.ts`
- Create: `tich-hop-tiktok-bitrix24/src/database/seeds/initial-config.seed.ts`
- Create: `tich-hop-tiktok-bitrix24/src/database/database.module.ts`
- Test: `tich-hop-tiktok-bitrix24/src/config/env.validation.spec.ts`

- [x] **Step 1: Viết test cho Env Validation**
- [x] **Step 2: Định nghĩa các Entities TypeORM chuẩn xác theo schema trang 5-6 đề bài**
- [x] **Step 3: Viết Seed script nạp cấu hình mặc định (field_mapping và deal_rules)**
- [x] **Step 4: Cấu hình DatabaseModule kết nối PostgreSQL**
- [x] **Step 5: Commit**

---

### Task 3: Queue Module với BullMQ & Redis
**Files:**
- Create: `tich-hop-tiktok-bitrix24/src/queue/queue.constants.ts`
- Create: `tich-hop-tiktok-bitrix24/src/queue/queue.module.ts`

- [x] **Step 1: Cấu hình BullMQModule kết nối Redis (hỗ trợ retry 3 lần, backoff exponential)**
- [x] **Step 2: Đăng ký queue `tiktok-leads-queue` và Dead Letter Queue**
- [x] **Step 3: Commit**

---

### Task 4: TikTok Module (Webhook, Security & Background Consumer)
**Files:**
- Create: `tich-hop-tiktok-bitrix24/src/tiktok/guards/tiktok-signature.guard.ts`
- Create: `tich-hop-tiktok-bitrix24/src/tiktok/tiktok.service.ts`
- Create: `tich-hop-tiktok-bitrix24/src/tiktok/tiktok.controller.ts`
- Create: `tich-hop-tiktok-bitrix24/src/tiktok/consumers/tiktok-lead.consumer.ts`
- Create: `tich-hop-tiktok-bitrix24/src/tiktok/tiktok.module.ts`
- Test: `tich-hop-tiktok-bitrix24/src/tiktok/guards/tiktok-signature.guard.spec.ts`
- Test: `tich-hop-tiktok-bitrix24/src/tiktok/tiktok.service.spec.ts`

- [x] **Step 1: Viết failing test cho `TikTokSignatureGuard` (xác thực HMAC-SHA256 với secret)**
- [x] **Step 2: Hiện thực `TikTokSignatureGuard` và `TikTokWebhookController` (`POST /webhooks/tiktok/leads`)**
- [x] **Step 3: Viết test cho chuẩn hóa SĐT, Email, tính Quality Score và Deduplication**
- [x] **Step 4: Hiện thực `TikTokService` và `TikTokLeadConsumer`**
- [x] **Step 5: Chạy unit tests kiểm tra PASS 100%**
- [x] **Step 6: Commit**

---

### Task 5: Bitrix24 Module (Leads, Deals & Notifications)
**Files:**
- Create: `tich-hop-tiktok-bitrix24/src/bitrix24/bitrix24.interface.ts`
- Create: `tich-hop-tiktok-bitrix24/src/bitrix24/bitrix24.service.ts`
- Create: `tich-hop-tiktok-bitrix24/src/bitrix24/bitrix24-webhook.controller.ts`
- Create: `tich-hop-tiktok-bitrix24/src/bitrix24/bitrix24.module.ts`
- Test: `tich-hop-tiktok-bitrix24/src/bitrix24/bitrix24.service.spec.ts`

- [x] **Step 1: Viết test cho Bitrix24Service**
- [x] **Step 2: Hiện thực các phương thức CRM: `createLead`, `updateLead`, `findLeadByEmailOrPhone`, `createDeal`, `updateDeal`, `sendNotification` (`im.notify.system.add`)**
- [x] **Step 3: Hiện thực endpoint `POST /webhooks/bitrix24/deals` tiếp nhận cập nhật Deal từ Bitrix24**
- [x] **Step 4: Chạy test Bitrix24Service PASS 100%**
- [x] **Step 5: Commit**

---

### Task 6: Rule Engine Module (Lead-to-Deal Conversion Pipeline)
**Files:**
- Create: `tich-hop-tiktok-bitrix24/src/rules/rule-engine.interface.ts`
- Create: `tich-hop-tiktok-bitrix24/src/rules/rule-engine.service.ts`
- Create: `tich-hop-tiktok-bitrix24/src/rules/rule-engine.module.ts`
- Test: `tich-hop-tiktok-bitrix24/src/rules/rule-engine.service.spec.ts`

- [x] **Step 1: Viết unit test cho các toán tử điều kiện (`CONTAINS`, `EQUALS`, `>`, `<`, `IN`)**
- [x] **Step 2: Hiện thực `RuleEngineService` đánh giá payload và tự động kích hoạt tạo Deal trên Bitrix24**
- [x] **Step 3: Chạy test RuleEngineService PASS 100%**
- [x] **Step 4: Commit**

---

### Task 7: Management Module (Leads, Deals & Configuration Endpoints)
**Files:**
- Create: `tich-hop-tiktok-bitrix24/src/management/leads.controller.ts`
- Create: `tich-hop-tiktok-bitrix24/src/management/deals.controller.ts`
- Create: `tich-hop-tiktok-bitrix24/src/management/config.controller.ts`
- Create: `tich-hop-tiktok-bitrix24/src/management/management.module.ts`
- Test: `tich-hop-tiktok-bitrix24/src/management/leads.controller.spec.ts`

- [x] **Step 1: Hiện thực `GET /api/v1/leads` (phân trang, lọc theo source=tiktok) và `POST /api/v1/leads/:id/convert-to-deal`**
- [x] **Step 2: Hiện thực `GET /api/v1/deals` (lọc theo status, assigned_to)**
- [x] **Step 3: Hiện thực `GET/PUT /api/v1/config/mappings` và `GET/PUT /api/v1/config/rules`**
- [x] **Step 4: Commit**

---

### Task 8: Analytics & Reporting Module (Metrics & CSV Export)
**Files:**
- Create: `tich-hop-tiktok-bitrix24/src/analytics/analytics.service.ts`
- Create: `tich-hop-tiktok-bitrix24/src/analytics/analytics.controller.ts`
- Create: `tich-hop-tiktok-bitrix24/src/analytics/analytics.module.ts`
- Test: `tich-hop-tiktok-bitrix24/src/analytics/analytics.service.spec.ts`

- [x] **Step 1: Viết test cho tính toán Conversion Rates, Cost Per Lead, ROI và xuất CSV**
- [x] **Step 2: Hiện thực `GET /api/v1/analytics/conversion-rates`**
- [x] **Step 3: Hiện thực `GET /api/v1/analytics/campaign-performance`**
- [x] **Step 4: Hiện thực `GET /api/v1/reports/export?format=csv&date_range=30d` (chuẩn UTF-8 with BOM)**
- [x] **Step 5: Chạy test Analytics PASS 100%**
- [x] **Step 6: Commit**

---

### Task 9: Web Dashboard UI, Swagger OpenAPI & Health Check
**Files:**
- Create: `tich-hop-tiktok-bitrix24/src/health/health.controller.ts`
- Create: `tich-hop-tiktok-bitrix24/src/health/health.module.ts`
- Create: `tich-hop-tiktok-bitrix24/src/management/dashboard.controller.ts`
- Create: `tich-hop-tiktok-bitrix24/public/index.html` (Giao diện Web Dashboard)

- [x] **Step 1: Hiện thực endpoint `GET /health` (kiểm tra Postgres, Redis)**
- [x] **Step 2: Xây dựng giao diện Web Dashboard trực quan tại `/dashboard` (Tailwind CSS + Alpine.js + Chart.js)**
- [x] **Step 3: Kiểm tra Swagger UI tại `/api/docs` đầy đủ schemas và endpoints**
- [x] **Step 4: Commit**

---

### Task 10: Mock Scripts, Docker Compose & Documentation
**Files:**
- Create: `tich-hop-tiktok-bitrix24/scripts/mock-tiktok-webhook.ts`
- Create: `tich-hop-tiktok-bitrix24/Dockerfile`
- Create: `tich-hop-tiktok-bitrix24/docker-compose.yml`
- Create: `tich-hop-tiktok-bitrix24/.env.example`
- Create: `tich-hop-tiktok-bitrix24/README.md`
- Modify: `README.md` (Root documentation)

- [x] **Step 1: Viết script `scripts/mock-tiktok-webhook.ts` tự động sinh payload và chữ ký HMAC-SHA256 để test**
- [x] **Step 2: Viết `Dockerfile` và `docker-compose.yml` (Postgres, Redis, App)**
- [x] **Step 3: Viết tài liệu `README.md` chi tiết từ A-Z với kiến trúc, API docs và hướng dẫn chạy**
- [x] **Step 4: Commit**

---

### Task 11: Kiểm Thử Toàn Diện (Coverage >= 80%) & Xác Minh End-to-End
- [x] **Step 1: Chạy toàn bộ Unit Tests và E2E Tests: `npm test` & `npm run test:cov` đạt coverage >= 80%**
- [x] **Step 2: Chạy script gửi webhook mock và kiểm tra Lead/Deal xuất hiện trên Bitrix24 CRM thực tế**
- [x] **Step 3: Kiểm tra xuất báo cáo CSV và giao diện Dashboard**
- [x] **Step 4: Commit và đẩy lên GitHub repository**
