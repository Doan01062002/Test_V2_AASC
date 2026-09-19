# AASC V2 - Tích Hợp Google Sheets Với Bitrix24 CRM

> Dự án bài thi kỹ thuật Vòng 2: **Giải pháp tự động hóa đồng bộ dữ liệu hai chiều giữa Google Sheets và Bitrix24 CRM**.

---

## 🎥 Video Demo Sản Phẩm

- **File video trực tiếp trong repository**: [`docs/demo/Demo_01.mp4`](./docs/demo/Demo_01.mp4)
- **Xem trực tiếp trên GitHub**: [Tải hoặc xem video Demo_01.mp4](https://github.com/Doan01062002/Test_V2_AASC/raw/main/docs/demo/Demo_01.mp4)

> 💡 **Nội dung video demo**:
> 1. Showcase giao diện **Web Admin Panel** trực quan (`http://localhost:3000/admin`).
> 2. Thêm mới dữ liệu trên Google Sheet và kích hoạt nút **"Đồng bộ Ngay"**.
> 3. Kiểm tra kết quả tạo Lead mới trên **Bitrix24 CRM** với đầy đủ thông tin chuẩn hóa.
> 4. Kiểm tra Google Sheet: Tự động ghi nhận **Lead ID Bitrix24**, trạng thái **"Đã đồng bộ"** và thời gian đồng bộ.
> 5. Kiểm thử cơ chế **chống trùng lặp dữ liệu (TC3)** và tính **Idempotent (SHA-256 Hash)** khi chạy lại.

---

## 📂 Cấu Trúc Dự Án

- [`tich-hop-google-sheet-bitrix24/`](./tich-hop-google-sheet-bitrix24/): Toàn bộ mã nguồn ứng dụng NestJS 10, tests, Docker, Web Admin Panel và CLI runner.
- [`docs/demo/Demo_01.mp4`](./docs/demo/Demo_01.mp4): Video demo thực tế quá trình vận hành hệ thống.
- [`docs/superpowers/specs/2026-09-19-google-sheets-bitrix24-sync-design.md`](./docs/superpowers/specs/2026-09-19-google-sheets-bitrix24-sync-design.md): Tài liệu thiết kế kỹ thuật chi tiết.
- [`docs/superpowers/plans/2026-09-19-google-sheets-bitrix24-sync.md`](./docs/superpowers/plans/2026-09-19-google-sheets-bitrix24-sync.md): Kế hoạch triển khai từng bước.

---

## 🚀 Hướng Dẫn Nhanh

Xem hướng dẫn chi tiết từ A-Z tại [`tich-hop-google-sheet-bitrix24/README.md`](./tich-hop-google-sheet-bitrix24/README.md).

```bash
cd tich-hop-google-sheet-bitrix24

# Cài đặt thư viện
npm install

# Chạy kiểm thử tự động (13 test suites, 79 tests PASS, Coverage 94.36%)
npm run test:cov

# Chạy Server và Web Admin Panel
npm start
# ➔ Mở trình duyệt: http://localhost:3000/admin

# Chạy đồng bộ thủ công qua CLI (nếu muốn)
npm run sync:cli
```
