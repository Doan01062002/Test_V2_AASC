# AASC V2 - Tích Hợp Google Sheets Với Bitrix24 CRM

> Dự án bài thi kỹ thuật Vòng 2: **Giải pháp tự động hóa đồng bộ dữ liệu hai chiều giữa Google Sheets và Bitrix24 CRM**.

---

## 🎥 Video Demo Sản Phẩm

[![Video Demo Tích hợp Google Sheets với Bitrix24 CRM](https://img.youtube.com/vi/QYbhUP7QNC4/maxresdefault.jpg)](https://youtu.be/QYbhUP7QNC4)

> 👆 *Nhấp vào ảnh trên để xem video trên YouTube (Full HD 1080p), hoặc lựa chọn các phương thức xem dưới đây:*

- 📺 **Xem trên YouTube (Khuyên dùng)**: [https://youtu.be/QYbhUP7QNC4](https://youtu.be/QYbhUP7QNC4)
- 🎬 **Xem trực tiếp trên GitHub Player (Không cần tải về)**: [Demo_01.mp4 trên GitHub](https://github.com/Doan01062002/Test_V2_AASC/blob/main/docs/demo/Demo_01.mp4)
- 📁 **File video gốc trong repository**: [`docs/demo/Demo_01.mp4`](./docs/demo/Demo_01.mp4)

### 💡 Các Nội Dung Nghiệp Vụ Trong Video Demo:
1. **Tổng quan giao diện**: Trải nghiệm **Web Admin Dashboard** trực quan phục vụ tại route `/admin`.
2. **Kích hoạt đồng bộ thủ công**: Thêm mới khách hàng trên Google Sheet và kích hoạt nút **"Đồng bộ Ngay"**.
3. **Kiểm tra Bitrix24 CRM**: Xác nhận Lead mới được tạo thành công với đầy đủ thông tin chuẩn hóa (Họ tên, SĐT, Email, Công ty, Ngân sách, Nguồn).
4. **Cập nhật hai chiều ngược về Sheet**: Google Sheet tự động ghi nhận **Lead ID Bitrix24**, trạng thái **"Đã đồng bộ"** và mốc thời gian cập nhật.
5. **Kiểm thử chống trùng lặp (TC3) & Idempotency**: Nhận diện khách hàng đã tồn tại trên CRM để cập nhật thay vì tạo trùng lặp; bỏ qua dữ liệu không đổi chỉ trong ~800ms.

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
