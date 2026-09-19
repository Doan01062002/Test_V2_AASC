# Tài Liệu Thiết Kế Kỹ Thuật: Ứng Dụng Tích Hợp TikTok Lead Generation Với Bitrix24 CRM (Vòng 2)

- **Dự án**: `tich-hop-tiktok-bitrix24`
- **Mã đề bài**: `V2 - Bai Tich hop Tiktok voi Bitrix24 - Version 1.pdf`
- **Vị trí lưu trữ**: `D:\AASC_V2\tich-hop-tiktok-bitrix24`
- **Ngày thiết kế**: 2026-09-19
- **Công nghệ chính**: NestJS 10, TypeScript, PostgreSQL (TypeORM), Redis, BullMQ, Swagger/OpenAPI, Tailwind CSS + Alpine.js, Jest, Supertest, Docker.

---

## 1. Mục Tiêu và Bối Cảnh Hệ Thống

Hệ thống đóng vai trò tự động hóa quy trình thu thập, xử lý và chuyển đổi khách hàng tiềm năng (Lead Generation) từ các chiến dịch quảng cáo TikTok vào hệ thống CRM Bitrix24:
1. **Thu thập dữ liệu thời gian thực (Module 1)**: Xây dựng endpoint tiếp nhận Webhook từ TikTok Lead Generation Forms, xác thực chữ ký bảo mật HMAC-SHA256, lưu trữ raw data (JSONB) và đẩy vào BullMQ Queue để xử lý bất đồng bộ trong <50ms.
2. **Xử lý & Chuẩn hóa dữ liệu**: Chuẩn hóa số điện thoại theo chuẩn quốc tế (+84 / 09x), lowercase email RFC 5322, phân loại theo campaign/ad/form, tính điểm chất lượng Lead Quality Score (0-100), và chống trùng lặp dữ liệu (Deduplication).
3. **Tích hợp Bitrix24 CRM (Module 2)**: Tự động tạo hoặc cập nhật Lead trên Bitrix24 với custom fields linh hoạt.
4. **Deal Conversion Pipeline (Module 2)**: Rule Engine tự động đánh giá các điều kiện (chiến dịch, thành phố, ngân sách) để tự động convert Lead thành Deal, gán nhân viên phụ trách và gửi notification trên CRM.
5. **Analytics & Reporting (Module 3)**: API đo lường tỷ lệ chuyển đổi, hiệu suất chiến dịch (Cost Per Lead, ROI), xuất báo cáo định dạng CSV/JSON và Web Dashboard trực quan.

---

## 2. Kiến Trúc Tổng Thể (System Architecture)

```
       +-------------------------------------------------------------+
       |               TikTok Lead Generation Forms                  |
       +-------------------------------------------------------------+
                                      |
                      POST /webhooks/tiktok/leads
                       (Header: TikTok-Signature)
                                      v
       +-------------------------------------------------------------+
       |                  TikTokSignatureGuard                       |
       |              (HMAC-SHA256 Verification)                     |
       +-------------------------------------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       |                  TikTokWebhookController                    |
       |  - Lưu raw_data JSONB vào PostgreSQL (status: 'pending')    |
       |  - Phản hồi HTTP 200 OK ngay lập tức (< 50ms)               |
       |  - Đẩy job vào BullMQ Queue (tiktok-leads-queue)            |
       +-------------------------------------------------------------+
                                      |
                                      v
                           [ Redis / BullMQ Queue ]
                       (Rate Limiter 2/s, Retry 3x, DLQ)
                                      |
                                      v
       +-------------------------------------------------------------+
       |                    TikTokLeadConsumer                       |
       |  1. Chuẩn hóa Phone E.164, Email, Phân loại Source          |
       |  2. Tính điểm Lead Quality Score (0 - 100)                  |
       |  3. Deduplication Check (Email / Phone)                     |
       +-------------------------------------------------------------+
                     /                                 \
                    v                                   v
       +-------------------------+         +-------------------------+
       |     Bitrix24Service     |         |    RuleEngineService    |
       | - crm.lead.add/update   | <------ | - Evaluate conditions   |
       | - crm.deal.add          |         | - Auto convert to Deal  |
       | - im.notify.system.add  |         | - Assign salesperson    |
       +-------------------------+         +-------------------------+
                    |                                   |
                    v                                   v
       +-------------------------+         +-------------------------+
       |       Bitrix24 CRM      |         |   PostgreSQL Database   |
       |   (Leads, Deals, Noti)  |         |  (leads, deals, configs)|
       +-------------------------+         +-------------------------+
```

---

## 3. Cấu Trúc Thư Mục Dự Án

```
d:\AASC_V2/
├── docs/
│   └── superpowers/
│       └── specs/
│           ├── 2026-09-19-google-sheets-bitrix24-sync-design.md
│           └── 2026-09-19-tiktok-bitrix24-integration-design.md
├── tich-hop-google-sheet-bitrix24/        # Bài 1 đã hoàn thành
└── tich-hop-tiktok-bitrix24/              # Bài 2 đang triển khai
    ├── src/
    │   ├── analytics/
    │   │   ├── analytics.controller.ts    # /api/v1/analytics/..., /api/v1/reports/export
    │   │   ├── analytics.service.ts       # Conversion rates, CPL, ROI, Quality scoring
    │   │   └── analytics.service.spec.ts
    │   ├── bitrix24/
    │   │   ├── bitrix24.interface.ts
    │   │   ├── bitrix24.service.ts        # crm.lead.*, crm.deal.*, im.notify.*
    │   │   ├── bitrix24.service.spec.ts
    │   │   └── bitrix24-webhook.controller.ts # /webhooks/bitrix24/deals
    │   ├── config/
    │   │   ├── configuration.ts
    │   │   └── env.validation.ts
    │   ├── database/
    │   │   ├── entities/
    │   │   │   ├── lead.entity.ts
    │   │   │   ├── deal.entity.ts
    │   │   │   └── configuration.entity.ts
    │   │   ├── migrations/
    │   │   │   └── 1709876543000-InitSchema.ts
    │   │   ├── seeds/
    │   │   │   └── initial-config.seed.ts
    │   │   └── database.module.ts
    │   ├── health/
    │   │   ├── health.controller.ts       # /health
    │   │   └── health.module.ts
    │   ├── management/
    │   │   ├── leads.controller.ts        # /api/v1/leads, /api/v1/leads/:id/convert-to-deal
    │   │   ├── deals.controller.ts        # /api/v1/deals
    │   │   ├── config.controller.ts       # /api/v1/config/mappings, /api/v1/config/rules
    │   │   ├── dashboard.controller.ts    # /dashboard (UI route)
    │   │   └── views/
    │   │       └── index.html             # Web Dashboard SPA (Tailwind + Alpine.js + Chart.js)
    │   ├── queue/
    │   │   ├── queue.module.ts
    │   │   └── queue.constants.ts
    │   ├── rules/
    │   │   ├── rule-engine.interface.ts
    │   │   ├── rule-engine.service.ts     # AST / condition evaluator (CONTAINS, >, <, IN, ==)
    │   │   └── rule-engine.service.spec.ts
    │   ├── tiktok/
    │   │   ├── guards/
    │   │   │   └── tiktok-signature.guard.ts # HMAC-SHA256 verification
    │   │   ├── consumers/
    │   │   │   └── tiktok-lead.consumer.ts   # BullMQ processor
    │   │   ├── tiktok.controller.ts       # /webhooks/tiktok/leads
    │   │   ├── tiktok.service.ts
    │   │   └── tiktok.service.spec.ts
    │   ├── app.module.ts
    │   └── main.ts
    ├── scripts/
    │   └── mock-tiktok-webhook.ts         # Script test gửi webhook có chữ ký HMAC-SHA256
    ├── test/
    │   ├── app.e2e-spec.ts
    │   └── webhooks.e2e-spec.ts
    ├── .env.example
    ├── Dockerfile
    ├── docker-compose.yml
    ├── package.json
    ├── tsconfig.json
    └── README.md
```

---

## 4. Chi Tiết Các Thực Thể Dữ Liệu (Database Schema)

```sql
-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(255) UNIQUE NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'tiktok',
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  campaign_id VARCHAR(255),
  ad_id VARCHAR(255),
  raw_data JSONB,
  bitrix24_id INTEGER,
  quality_score INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_leads_external_id ON leads(external_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX idx_leads_status ON leads(status);

-- Deals table
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  bitrix24_id INTEGER,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'VND',
  stage VARCHAR(50) DEFAULT 'NEW',
  probability INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_deals_lead_id ON deals(lead_id);
CREATE INDEX idx_deals_bitrix24_id ON deals(bitrix24_id);
CREATE INDEX idx_deals_stage ON deals(stage);

-- Configuration table
CREATE TABLE configurations (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. Quy Trình Xử Lý & Động Cơ Luật (Rule Engine)

### 5.1. Thuật Toán Lead Quality Scoring (0 - 100 điểm)
- Có Số điện thoại hợp lệ (+84 / 09x): +25 điểm.
- Có Email hợp lệ RFC 5322: +25 điểm.
- Có Tỉnh/Thành phố (`city`): +15 điểm.
- Có Ngân sách dự kiến (`Budget range` trong `custom_questions`): +20 điểm.
- Có Timeline dự án: +15 điểm.
- Tổng điểm $\ge 70$ điểm: Xếp loại **Hot Lead**; $50 - 69$: **Warm Lead**; $< 50$: **Cold Lead**.

### 5.2. Cấu Trúc Rule Engine Chuyển Đổi Deal
Cấu hình mẫu lưu trong `configurations` key `'deal_rules'`:
```json
[
  {
    "id": "rule_sale_campaign",
    "name": "Chuyển đổi Deal cho chiến dịch Sale",
    "condition": "campaign.campaign_name CONTAINS 'sale'",
    "action": "create_deal",
    "pipeline_id": "0",
    "stage_id": "NEW",
    "probability": 30,
    "assigned_to": "1",
    "notify": true
  },
  {
    "id": "rule_high_budget",
    "name": "Ưu tiên khách hàng ngân sách cao",
    "condition": "lead_data.city EQUALS 'Hà Nội'",
    "action": "create_deal",
    "pipeline_id": "0",
    "stage_id": "PREPARATION",
    "probability": 50,
    "assigned_to": "1",
    "notify": true
  }
]
```

### 5.3. Xử Lý Chống Trùng Lặp (Deduplication)
1. Tra cứu trong cơ sở dữ liệu `leads` theo `email` hoặc `phone`.
2. Tra cứu trên Bitrix24 CRM (`crm.duplicate.findbycomm` hoặc `crm.lead.list`).
3. Nếu tìm thấy: Áp dụng chiến lược Merge/Update (cập nhật thông tin mới, ghi log timeline, không tạo Lead mới).

---

## 6. Danh Mục Endpoints Bắt Buộc

- **Webhooks**:
  - `POST /webhooks/tiktok/leads`
  - `POST /webhooks/bitrix24/deals`
- **Quản lý (Management)**:
  - `GET /api/v1/leads?page=1&limit=10&source=tiktok`
  - `GET /api/v1/deals?status=open&assigned_to=user_id`
  - `POST /api/v1/leads/:id/convert-to-deal`
- **Cấu hình (Configuration)**:
  - `GET /api/v1/config/mappings`
  - `PUT /api/v1/config/mappings`
  - `GET /api/v1/config/rules`
  - `PUT /api/v1/config/rules`
- **Phân tích & Báo cáo (Analytics & Reporting)**:
  - `GET /api/v1/analytics/conversion-rates`
  - `GET /api/v1/analytics/campaign-performance`
  - `GET /api/v1/reports/export?format=csv&date_range=30d`
- **Giao diện & Tài liệu**:
  - `GET /dashboard`: Web Dashboard UI
  - `GET /api/docs`: Swagger OpenAPI UI
  - `GET /health`: Health check
