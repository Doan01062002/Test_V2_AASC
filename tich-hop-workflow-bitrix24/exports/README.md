# Thư Mục Lưu Trữ File Template Quy Trình (.bpt)

Thư mục này dùng để lưu trữ 2 file xuất (Export) từ Business Process Designer trên Bitrix24 theo đúng định dạng và quy cách đặt tên trong đề bài:

1. **`NghiPhep_3Cap.bpt`**: File mẫu quy trình Nghỉ phép 3 cấp phê duyệt.
   - **Trạng thái**: ✅ **ĐÃ HOÀN THÀNH & XUẤT THÀNH CÔNG TỪ BITRIX24**
   - **Kích thước**: 3,333 bytes (Giải nén: 18,146 bytes)
   - **Cấu trúc kỹ thuật**: Nén zlib chuẩn Bitrix24 chứa 3 cấp duyệt (`ApproveActivity`: Quản lý trực tiếp $\rightarrow$ Trưởng phòng Nhân sự $\rightarrow$ Giám đốc), khối rẽ nhánh điều kiện `IfElseActivity` (`Số ngày xin nghỉ <= Số ngày phép còn lại`), các khối `SocNetMessageActivity` thông báo từ chối khi vượt ngày phép hoặc khi bị từ chối tại các cấp duyệt, và khối `SocNetMessageActivity` gửi thông báo thành công đến người tạo.
2. **`ChiPhiCongTac_4Cap.bpt`**: File mẫu quy trình Phê duyệt Chi phí đi công tác 4 cấp.
   - **Trạng thái**: ✅ **ĐÃ HOÀN THÀNH & XUẤT THÀNH CÔNG TỪ BITRIX24**
   - **Kích thước**: 3,841 bytes (Giải nén: 22,591 bytes)
   - **Cấu trúc kỹ thuật**: Nén zlib chuẩn Bitrix24 chứa đầy đủ 4 cấp phê duyệt (`ApproveActivity`: Quản lý trực tiếp $\rightarrow$ Trưởng phòng Tài chính $\rightarrow$ Phó Giám đốc Tài chính $\rightarrow$ Giám đốc), khối rẽ nhánh điều kiện `IfElseActivity` (`Tổng chi phí dự kiến <= Ngân sách khả dụng`), các khối `SocNetMessageActivity` gửi thông báo từ chối tương ứng tại từng cấp duyệt và khi vượt hạn mức ngân sách, cùng khối `SocNetMessageActivity` gửi thông báo chúc mừng phê duyệt hoàn tất.

---

### Hướng Dẫn Thao Tác Xuất File Từ Bitrix24:
1. Đăng nhập vào portal Bitrix24: `https://b24-lgjau5.bitrix24.vn/`
2. Mở trình thiết kế quy trình (**Business Process Designer**).
3. Bấm vào menu **Xuất (Export)** trên thanh menu ngang trên cùng của Designer.
4. Đổi tên file tải về thành `NghiPhep_3Cap.bpt` hoặc `ChiPhiCongTac_4Cap.bpt` và copy vào thư mục này.
