# Bài 3: Xây Dựng 2 Workflow Trên Bitrix24 (Nghỉ Phép & Chi Phí Công Tác)

> **Đề bài:** `V2 - Bai Kiem tra Xay dung Workflow tren Bitrix24 - Version 1`  
> **Nền tảng:** Bitrix24 Cloud (`https://b24-lgjau5.bitrix24.vn/`)  
> **Sản phẩm bàn giao:**  
> - File template xuất từ Bitrix24: [`exports/NghiPhep_3Cap.bpt`](./exports/NghiPhep_3Cap.bpt)  
> - File template xuất từ Bitrix24: [`exports/ChiPhiCongTac_4Cap.bpt`](./exports/ChiPhiCongTac_4Cap.bpt)  
> - Tài liệu mô tả Word: [`docs/Tai_Lieu_Mo_Ta_Workflow_Bitrix24.docx`](./docs/Tai_Lieu_Mo_Ta_Workflow_Bitrix24.docx)  
> - Tài liệu hướng dẫn Markdown: [`docs/Huong_Dan_Xay_Dung_Workflow_Bitrix24.md`](./docs/Huong_Dan_Xay_Dung_Workflow_Bitrix24.md)  

---

## 1. Tóm Tắt 2 Quy Trình

### 1.1. Quy Trình Nghỉ Phép (3 Cấp Phê Duyệt)
- **Trường thông tin**: Đầy đủ các trường cơ bản và trường **Phòng ban (`DEPARTMENT`)** bắt buộc.
- **Khối trạng thái**: Tích hợp các khối **Đặt tên trạng thái (Set Status Message)** cập nhật trạng thái rõ ràng qua từng cấp.
- **Cấp 1**: Quản lý trực tiếp (Direct Manager) kiểm tra tính cần thiết.
- **Cấp 2**: Trưởng phòng Nhân sự (HR Manager) kiểm tra hồ sơ.
- **Rẽ nhánh điều kiện**: Kiểm tra `Số ngày xin nghỉ <= Số ngày phép còn lại`. Nếu vượt quá ngày phép $\rightarrow$ Tự động rẽ nhánh từ chối và thông báo lý do.
- **Cấp 3**: Giám đốc (Director / CEO) phê duyệt cuối cùng.
- **Thông báo & Lịch sử**: Gửi tin nhắn thông báo kết quả cho nhân viên ở cả trường hợp phê duyệt hoặc từ chối ở bất kỳ cấp nào; ghi nhận đầy đủ Execution Log (Audit Trail).

### 1.2. Quy Trình Chi Phí Công Tác (4 Cấp Phê Duyệt)
- **Trường thông tin**: Đầy đủ các trường chi phí, tạm ứng, báo giá và trường **Phòng ban (`DEPARTMENT`)** bắt buộc.
- **Khối trạng thái**: Tích hợp các khối **Đặt tên trạng thái (Set Status Message)** cập nhật trạng thái tương ứng từng cấp.
- **Cấp 1**: Quản lý trực tiếp (Direct Manager) xem xét sự cần thiết. Nếu từ chối $\rightarrow$ Gửi thông báo tức thời cho nhân viên kèm lý do.
- **Rẽ nhánh điều kiện**: Kiểm tra `Tổng chi phí <= Ngân sách khả dụng`. Nếu vượt ngân sách $\rightarrow$ Rẽ nhánh từ chối và cảnh báo.
- **Cấp 2**: Trưởng phòng Tài chính (Finance Manager) kiểm tra tính khả dụng của ngân sách.
- **Cấp 3**: Phó Giám đốc phụ trách Tài chính (Deputy Finance Director) xem xét tính hợp lý.
- **Cấp 4**: Giám đốc (Director / CEO) phê duyệt lệnh chi tạm ứng.
- **Đính kèm chứng từ**: Bắt buộc đính kèm hóa đơn, báo giá dự kiến, vé máy bay.
- **Thông báo từ chối**: Đảm bảo 100% các cấp (Cấp 1, Cấp 2, Cấp 3, Cấp 4 và Vượt ngân sách) đều có khối gửi thông báo cho nhân viên.

---

## 2. Hướng Dẫn Thao Tác Trên Bitrix24

### 2.1. Cách Thiết Lập Form & Quy Trình
Chi tiết từng bước cấu hình các trường nhập liệu và các khối Action trong **Business Process Designer** được trình bày đầy đủ tại:
👉 [**Huong_Dan_Xay_Dung_Workflow_Bitrix24.md**](./docs/Huong_Dan_Xay_Dung_Workflow_Bitrix24.md)

### 2.2. Cách Xuất File (.bpt)
1. Trong Business Process Designer, bấm nút **Thao tác (Action)** ở góc trên bên phải.
2. Chọn **Export (Xuất)**.
3. Lưu 2 file về thư mục `exports/`:
   - `exports/NghiPhep_3Cap.bpt`
   - `exports/ChiPhiCongTac_4Cap.bpt`

### 2.3. Cách Nhập File (.bpt) Cho Người Chấm Thi
1. Truy cập Bitrix24 $\rightarrow$ Mở danh sách hoặc workflow tương ứng.
2. Mở trình thiết kế quy trình $\rightarrow$ Bấm nút **Import (Nhập)**.
3. Chọn file `.bpt` tương ứng và bấm **Save (Lưu)**.

---

## 3. Cấu Trúc Thư Mục Dự Án

```
tich-hop-workflow-bitrix24/
├── exports/
│   ├── NghiPhep_3Cap.bpt
│   └── ChiPhiCongTac_4Cap.bpt
├── docs/
│   ├── Huong_Dan_Xay_Dung_Workflow_Bitrix24.md
│   └── Tai_Lieu_Mo_Ta_Workflow_Bitrix24.docx
├── scripts/
│   └── generate-docx.js
├── package.json
└── README.md
```
