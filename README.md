# AASC V2 - Hệ Thống Tích Hợp CRM Bitrix24

> Tuyển tập giải pháp tự động hóa tích hợp doanh nghiệp Vòng 2 Developer:
> 1. **Bài 1**: Đồng bộ dữ liệu hai chiều giữa Google Sheets và Bitrix24 CRM.
> 2. **Bài 2**: Tích hợp TikTok Lead Generation Ads với Bitrix24 CRM qua BullMQ Queue, Rule Engine tự động tạo Deal và Analytics Dashboard.

---

## 📂 Danh Mục Bài Tập & Cấu Trúc Dự Án

### 1. Bài 1: Tích Hợp Google Sheets Với Bitrix24 CRM
- **Thư mục dự án**: [`tich-hop-google-sheet-bitrix24/`](./tich-hop-google-sheet-bitrix24/)
- **Tài liệu thiết kế**: [`docs/superpowers/specs/2026-09-19-google-sheets-bitrix24-sync-design.md`](./docs/superpowers/specs/2026-09-19-google-sheets-bitrix24-sync-design.md)
- **Kế hoạch triển khai**: [`docs/superpowers/plans/2026-09-19-google-sheets-bitrix24-sync.md`](./docs/superpowers/plans/2026-09-19-google-sheets-bitrix24-sync.md)
- **Video Demo**: [`docs/demo/Demo_01.mp4`](./docs/demo/Demo_01.mp4) (Xem trên YouTube: [https://youtu.be/QYbhUP7QNC4](https://youtu.be/QYbhUP7QNC4))

### 2. Bài 2: Tích Hợp TikTok Lead Generation Với Bitrix24 CRM
- **Thư mục dự án**: [`tich-hop-tiktok-bitrix24/`](./tich-hop-tiktok-bitrix24/)
- **Tài liệu thiết kế**: [`docs/superpowers/specs/2026-09-19-tiktok-bitrix24-integration-design.md`](./docs/superpowers/specs/2026-09-19-tiktok-bitrix24-integration-design.md)
- **Kế hoạch triển khai**: [`docs/superpowers/plans/2026-09-19-tiktok-bitrix24-integration.md`](./docs/superpowers/plans/2026-09-19-tiktok-bitrix24-integration.md)
- **Đặc điểm nổi bật**:
  - Webhook xác thực chữ ký bảo mật HMAC-SHA256 phản hồi tức thì <50ms.
  - Hàng đợi xử lý bất đồng bộ BullMQ & Redis (Rate Limiter 2/s, Retry 3x, DLQ).
  - Chuẩn hóa số điện thoại E.164, Email RFC 5322, Lead Quality Score (0-100 pts) và chống trùng lặp dữ liệu.
  - Rule Engine tự động chuyển đổi Lead thành Deal trên Bitrix24, gán nhân viên phụ trách và gửi notification.
  - Web Dashboard SPA (`/dashboard`), Swagger OpenAPI (`/api/docs`), và xuất báo cáo CSV UTF-8 with BOM.

---

## 🚀 Hướng Dẫn Nhanh Bài 2: TikTok - Bitrix24

```bash
cd tich-hop-tiktok-bitrix24

# 1. Cài đặt dependencies
npm install

# 2. Nạp dữ liệu cấu hình ban đầu
npm run seed

# 3. Chạy kiểm thử tự động (Coverage >= 80%)
npm run test:cov

# 4. Khởi động ứng dụng
npm run start:dev
# -> Web Dashboard: http://localhost:3000/dashboard
# -> Swagger Docs:   http://localhost:3000/api/docs

# 5. Gửi thử nghiệm Mock TikTok Webhook có chữ ký HMAC-SHA256
npm run mock:webhook
```
