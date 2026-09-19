# Thư Mục Lưu Trữ File Template Quy Trình (.bpt)

Thư mục này dùng để lưu trữ 2 file xuất (Export) từ Business Process Designer trên Bitrix24 theo đúng định dạng và quy cách đặt tên trong đề bài:

1. **`NghiPhep_3Cap.bpt`**: File mẫu quy trình Nghỉ phép 3 cấp phê duyệt.
   - **Trạng thái**: ✅ **ĐÃ HOÀN THÀNH & XUẤT THÀNH CÔNG TỪ BITRIX24**
   - **Kích thước**: 3,156 bytes
   - **Cấu trúc kỹ thuật**: Nén zlib chuẩn Bitrix24 chứa 3 cấp duyệt (`ApproveActivity`: Quản lý trực tiếp $\rightarrow$ Trưởng phòng Nhân sự $\rightarrow$ Giám đốc), khối rẽ nhánh điều kiện `IfElseActivity` (`Số ngày xin nghỉ <= Số ngày phép còn lại`), và khối `SocNetMessageActivity` gửi thông báo thành công đến người tạo.
2. **`ChiPhiCongTac_4Cap.bpt`**: File mẫu quy trình Phê duyệt Chi phí đi công tác 4 cấp.
   - **Trạng thái**: ⏳ Đang tiến hành thực hiện tiếp theo.

---

### Hướng Dẫn Thao Tác Xuất File Từ Bitrix24:
1. Đăng nhập vào portal Bitrix24: `https://b24-lgjau5.bitrix24.vn/`
2. Mở trình thiết kế quy trình (**Business Process Designer**).
3. Bấm vào menu **Xuất (Export)** trên thanh menu ngang trên cùng của Designer.
4. Đổi tên file tải về thành `NghiPhep_3Cap.bpt` hoặc `ChiPhiCongTac_4Cap.bpt` và copy vào thư mục này.
