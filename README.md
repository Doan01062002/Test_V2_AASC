# AASC V2 - Tích Hợp Google Sheets Với Bitrix24 CRM

Dự án bài thi kỹ thuật Vòng 2: **Giải pháp tự động hóa đồng bộ dữ liệu hai chiều giữa Google Sheets và Bitrix24 CRM**.

## Cấu Trúc Dự Án

- `tich-hop-google-sheet-bitrix24/`: Toàn bộ mã nguồn ứng dụng NestJS 10, tests, Docker, Web Admin Panel và CLI runner.
- `docs/superpowers/specs/2026-09-19-google-sheets-bitrix24-sync-design.md`: Tài liệu thiết kế kỹ thuật chi tiết.
- `docs/superpowers/plans/2026-09-19-google-sheets-bitrix24-sync.md`: Kế hoạch triển khai từng bước.

## Hướng Dẫn Nhanh

Xem hướng dẫn chi tiết từ A-Z tại [`tich-hop-google-sheet-bitrix24/README.md`](./tich-hop-google-sheet-bitrix24/README.md).

```bash
cd tich-hop-google-sheet-bitrix24

# Cài đặt
npm install

# Kiểm thử (Coverage > 87%)
npm run test:cov

# Chạy thử nghiệm CLI (Dry Run)
npm run sync:cli -- --dry-run

# Chạy Server và Web Admin Panel (/admin)
npm run start:dev
```
