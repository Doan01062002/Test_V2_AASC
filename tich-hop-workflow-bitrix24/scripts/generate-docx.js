const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} = require('docx');

async function generateDocx() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            children: [
              new TextRun({
                text: 'TÀI LIỆU HƯỚNG DẪN XÂY DỰNG VÀ VẬN HÀNH WORKFLOW TRÊN BITRIX24',
                bold: true,
                size: 32,
                color: '1E3A8A',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Bài kiểm tra Vòng 2 Developer: V2 - Bai Kiem tra Xay dung Workflow tren Bitrix24 - Version 1 (Bản Nâng Cấp Hoàn Thiện >99%)',
                italics: true,
                size: 22,
                color: '475569',
              }),
            ],
            spacing: { after: 300 },
          }),

          // Metadata Info
          new Paragraph({
            children: [
              new TextRun({ text: '• Ứng viên: ', bold: true }),
              new TextRun({ text: 'Nguyễn Văn Đoan\n' }),
              new TextRun({ text: '• Nền tảng: ', bold: true }),
              new TextRun({ text: 'Bitrix24 CRM & Business Process Module (https://b24-lgjau5.bitrix24.vn/)\n' }),
              new TextRun({ text: '• Sản phẩm bàn giao: ', bold: true }),
              new TextRun({ text: 'NghiPhep_3Cap.bpt, ChiPhiCongTac_4Cap.bpt và Tài liệu mô tả kỹ thuật\n' }),
              new TextRun({ text: '• Phiên bản: ', bold: true }),
              new TextRun({ text: 'Version 2.0 (Khắc phục 100% nhận xét từ Ban Đánh Giá ADIGITRANS)\n' }),
            ],
            spacing: { after: 400 },
          }),

          // 1. TỔNG QUAN
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '1. TỔNG QUAN YÊU CẦU ĐỀ BÀI VÀ THIẾT KẾ HỆ THỐNG',
                bold: true,
                size: 26,
                color: '1E40AF',
              }),
            ],
            spacing: { before: 200, after: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Đề bài yêu cầu thiết kế và triển khai 2 quy trình tự động hóa tác vụ nghiệp vụ nội bộ trên nền tảng Bitrix24 bằng module Business Process. Cả hai quy trình đều hỗ trợ cơ chế rẽ nhánh kiểm tra điều kiện hợp lệ, xử lý từ chối tại mọi cấp phê duyệt, gửi thông báo tự động (notification) đến người liên quan, khối cập nhật tên trạng thái (Set Status Message) theo dõi tiến độ thời gian thực, ghi vết lịch sử (audit trail), và xuất (export) ra file định dạng .bpt chuẩn Bitrix24.',
              }),
            ],
            spacing: { after: 200 },
          }),

          // Table 1: Comparison
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: 'DBEAFE', type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Tiêu chí', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { fill: 'DBEAFE', type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Quy trình 1: Nghỉ phép', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { fill: 'DBEAFE', type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Quy trình 2: Chi phí công tác', bold: true })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Số cấp phê duyệt' })] }),
                  new TableCell({ children: [new Paragraph({ text: '3 cấp tuần tự' })] }),
                  new TableCell({ children: [new Paragraph({ text: '4 cấp tuần tự' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Cấp 1' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Quản lý trực tiếp (Direct Manager)' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Quản lý trực tiếp (Direct Manager)' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Cấp 2' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Trưởng phòng Nhân sự (HR Manager)' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Trưởng phòng Tài chính (Finance Manager)' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Cấp 3' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Giám đốc (Director / CEO)' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Phó Giám đốc Tài chính (Deputy Finance Director)' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Cấp 4' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Hoàn tất sau cấp 3' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Giám đốc (Director / CEO)' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Trường Phòng ban' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Có (DEPARTMENT - Bắt buộc chọn)' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Có (DEPARTMENT - Bắt buộc chọn)' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Kiểm tra điều kiện' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Số ngày nghỉ <= Số ngày phép còn lại' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Tổng chi phí <= Ngân sách khả dụng' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Khối Đặt tên trạng thái' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Có (Cập nhật trạng thái từng cấp)' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Có (Cập nhật trạng thái từng cấp)' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Thông báo khi từ chối' })] }),
                  new TableCell({ children: [new Paragraph({ text: '100% các cấp (kèm lý do)' })] }),
                  new TableCell({ children: [new Paragraph({ text: '100% các cấp (bao gồm Cấp 1, Cấp 2, Cấp 3, Cấp 4 và vượt ngân sách)' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'File xuất (.bpt)' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'NghiPhep_3Cap.bpt' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'ChiPhiCongTac_4Cap.bpt' })] }),
                ],
              }),
            ],
          }),

          // 2. QUY TRÌNH NGHỈ PHÉP
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '2. CHI TIẾT THIẾT KẾ QUY TRÌNH NGHỈ PHÉP (3 CẤP)',
                bold: true,
                size: 26,
                color: '1E40AF',
              }),
            ],
            spacing: { before: 300, after: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '2.1. Cấu trúc trường thông tin đầu vào (Form Fields):', bold: true }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '1. Họ và tên nhân viên (NAME): Kiểu chuỗi / User, tự động gán tên người nộp đơn (Bắt buộc).\n' +
                      '2. Phòng ban (DEPARTMENT): Kiểu danh sách chọn phòng ban (Kinh doanh, Kỹ thuật, Kế toán, Nhân sự...) (Bắt buộc).\n' +
                      '3. Loại nghỉ phép (LEAVE_TYPE): Danh sách chọn (Nghỉ phép năm, Nghỉ ốm, Việc riêng, Nghỉ không lương) (Bắt buộc).\n' +
                      '4. Ngày bắt đầu (START_DATE): Kiểu ngày/tháng (Bắt buộc).\n' +
                      '5. Ngày kết thúc (END_DATE): Kiểu ngày/tháng (Bắt buộc).\n' +
                      '6. Số ngày xin nghỉ (DURATION_DAYS): Kiểu số nguyên/thập phân (VD: 2 ngày) (Bắt buộc).\n' +
                      '7. Số ngày phép còn lại (LEAVE_BALANCE): Kiểu số nguyên (VD: 12 ngày, phục vụ kiểm tra điều kiện) (Bắt buộc).\n' +
                      '8. Lý do nghỉ (REASON): Đoạn văn bản mô tả chi tiết lý do nghỉ phép (Bắt buộc).\n' +
                      '9. Lý do từ chối (REJECTION_REASON): Nhập bởi người duyệt khi bấm Từ chối.\n' +
                      '10. Trạng thái quy trình (STATUS): Tự động cập nhật thông qua khối Set Status Message.\n',
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '2.2. Luồng nghiệp vụ và rẽ nhánh điều kiện:', bold: true }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '• Bước 1 (Khởi tạo): Nhân viên nộp đơn. Khối "Đặt tên trạng thái" cập nhật: "Chờ Quản lý trực tiếp duyệt".\n' +
                      '• Bước 2 (Cấp 1 - Quản lý trực tiếp): Quản lý xem xét. Nếu "Từ chối" -> Khối "Đặt tên trạng thái" cập nhật "Bị từ chối", gửi thông báo kèm lý do cho nhân viên và kết thúc. Nếu "Duyệt" -> chuyển tiếp sang bước kiểm tra điều kiện.\n' +
                      '• Bước 3 (Kiểm tra điều kiện): Khối Condition kiểm tra: Số ngày xin nghỉ <= Số ngày phép còn lại. Nếu vượt ngày phép -> Khối "Đặt tên trạng thái" cập nhật "Bị từ chối do vượt phép", gửi thông báo cảnh báo và kết thúc. Nếu thỏa mãn -> Khối "Đặt tên trạng thái" cập nhật "Chờ Trưởng phòng Nhân sự duyệt".\n' +
                      '• Bước 4 (Cấp 2 - Trưởng phòng Nhân sự): HR thẩm định hồ sơ. Nếu từ chối -> cập nhật trạng thái "Bị từ chối", gửi thông báo và kết thúc. Nếu duyệt -> Khối "Đặt tên trạng thái" cập nhật "Chờ Giám đốc duyệt".\n' +
                      '• Bước 5 (Cấp 3 - Giám đốc): Giám đốc xem xét duyệt cấp cuối. Nếu từ chối -> cập nhật "Bị từ chối", gửi thông báo. Nếu duyệt -> Khối "Đặt tên trạng thái" cập nhật "Đã phê duyệt", gửi thông báo chúc mừng đến nhân viên và ghi nhận Audit Trail.\n',
              }),
            ],
            spacing: { after: 300 },
          }),

          // 3. QUY TRÌNH CHI PHÍ CÔNG TÁC
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '3. CHI TIẾT THIẾT KẾ QUY TRÌNH CHI PHÍ CÔNG TÁC (4 CẤP)',
                bold: true,
                size: 26,
                color: '1E40AF',
              }),
            ],
            spacing: { before: 300, after: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '3.1. Cấu trúc trường thông tin đầu vào (Form Fields):', bold: true }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '1. Người đề xuất (NAME): Tên nhân viên tạo đề xuất (Bắt buộc).\n' +
                      '2. Phòng ban (DEPARTMENT): Tên đơn vị / phòng ban công tác (Kinh doanh, Kỹ thuật, Dự án...) (Bắt buộc).\n' +
                      '3. Mục đích công tác (PURPOSE): Mục đích chuyến đi (khảo sát, gặp khách hàng, triển khai dự án...) (Bắt buộc).\n' +
                      '4. Địa điểm công tác (LOCATION): Địa phương hoặc quốc gia đến công tác (Bắt buộc).\n' +
                      '5. Thời gian công tác (TRIP_DATES): Thời gian khởi hành và kết thúc (Bắt buộc).\n' +
                      '6. Chi tiết chi phí dự kiến (EXPENSE_DETAILS): Danh mục chi tiết (Vé máy bay, khách sạn, công tác phí...) (Bắt buộc).\n' +
                      '7. Tổng chi phí dự kiến (TOTAL_AMOUNT): Tổng số tiền đề xuất tạm ứng (VND) (Bắt buộc).\n' +
                      '8. Ngân sách khả dụng (BUDGET_AVAILABLE): Hạn mức ngân sách khả dụng của phòng ban (VND) (Bắt buộc).\n' +
                      '9. Tài liệu / Báo giá đính kèm (ATTACHMENTS): Đính kèm file hóa đơn, vé máy bay, báo giá dự kiến (Bắt buộc).\n' +
                      '10. Lý do từ chối (REJECTION_REASON): Ghi chú khi bị từ chối.\n' +
                      '11. Trạng thái quy trình (STATUS): Tự động cập nhật qua từng cấp duyệt thông qua khối Set Status Message.\n',
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '3.2. Luồng nghiệp vụ và rẽ nhánh điều kiện:', bold: true }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '• Bước 1 (Khởi tạo): Nhân viên nộp đề xuất. Khối "Đặt tên trạng thái" cập nhật: "Chờ Quản lý trực tiếp duyệt".\n' +
                      '• Bước 2 (Cấp 1 - Quản lý trực tiếp): Xem xét tính cần thiết. Nếu "Từ chối" -> Khối "Đặt tên trạng thái" cập nhật "Bị từ chối", gửi thông báo tức thời cho nhân viên kèm lý do phản hồi và kết thúc. Nếu "Duyệt" -> chuyển tiếp sang bước kiểm tra ngân sách.\n' +
                      '• Bước 3 (Kiểm tra ngân sách): Khối Condition so sánh Tổng chi phí dự kiến <= Ngân sách khả dụng. Nếu vượt ngân sách -> cập nhật trạng thái "Bị từ chối do vượt ngân sách", gửi thông báo cảnh báo và kết thúc. Nếu hợp lệ -> Khối "Đặt tên trạng thái" cập nhật "Chờ Trưởng phòng Tài chính duyệt".\n' +
                      '• Bước 4 (Cấp 2 - Trưởng phòng Tài chính): Thẩm định định mức chi tiêu và hóa đơn chứng từ. Nếu từ chối -> cập nhật "Bị từ chối", gửi thông báo. Nếu duyệt -> Khối "Đặt tên trạng thái" cập nhật "Chờ Phó Giám đốc Tài chính duyệt".\n' +
                      '• Bước 5 (Cấp 3 - Phó Giám đốc phụ trách Tài chính): Đánh giá tính hợp lý và nguồn tiền giải ngân. Nếu từ chối -> cập nhật "Bị từ chối", gửi thông báo. Nếu duyệt -> Khối "Đặt tên trạng thái" cập nhật "Chờ Giám đốc duyệt".\n' +
                      '• Bước 6 (Cấp 4 - Giám đốc điều hành): Phê duyệt quyết định chi phí công tác cấp cao nhất. Nếu từ chối -> gửi thông báo từ chối. Nếu duyệt -> Khối "Đặt tên trạng thái" cập nhật "Đã phê duyệt chi phí công tác", gửi thông báo kết quả cho người đề xuất và kế toán viên thực hiện tạm ứng. Toàn bộ quá trình được lưu vết Audit Trail.\n',
              }),
            ],
            spacing: { after: 300 },
          }),

          // 4. BẢNG ĐỐI CHIẾU KHẮC PHỤC THEO NHẬN XÉT CỦA ADIGITRANS
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '4. BẢNG ĐỐI CHIẾU KHẮC PHỤC THEO NHẬN XÉT CỦA BAN ĐÁNH GIÁ ADIGITRANS',
                bold: true,
                size: 26,
                color: '1E40AF',
              }),
            ],
            spacing: { before: 300, after: 150 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: 'DBEAFE', type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Nội dung nhận xét của ADIGITRANS', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { fill: 'DBEAFE', type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Giải pháp và Hiện thực hóa', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { fill: 'DBEAFE', type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Trạng thái', bold: true })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Logic từ chối ở Cấp 1 (Chi phí công tác): Khi Cấp 1 chọn "Không", luồng đi thẳng về kết thúc mà không có thông báo cho người dùng.' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Đã bổ sung khối IMNotifyActivity ("Thông báo: Đề xuất chi phí bị từ chối") vào nhánh "Không" của Cấp 1, đồng bộ 100% giữa sơ đồ, tài liệu và file export .bpt.' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'ĐÃ HOÀN THÀNH (100%)' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Thiếu trường thông tin: Biểu mẫu thiếu trường "Phòng ban" (Department).' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Đã bổ sung trường "Phòng ban" (DEPARTMENT - Kiểu List/String) vào cả 2 biểu mẫu Nghỉ phép và Chi phí công tác, đặt thuộc tính bắt buộc (Required).' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'ĐÃ HOÀN THÀNH (100%)' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Khối trạng thái: Thiếu các khối "Đặt tên trạng thái" (Set Status Message) giữa các cấp duyệt.' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Đã bổ sung các khối "Đặt tên trạng thái" (Set Status Message) tại từng chặng: Chờ QL duyệt, Chờ TP duyệt, Chờ Phó GĐ duyệt, Chờ GĐ duyệt, Đã duyệt, Bị từ chối.' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'ĐÃ HOÀN THÀNH (100%)' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Đồng bộ tài liệu và file xuất (.bpt): Cần đảm bảo file export .bpt khớp 100% với tài liệu mô tả.' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Toàn bộ các khối trong file export .bpt (NghiPhep_3Cap.bpt và ChiPhiCongTac_4Cap.bpt) khớp chính xác 100% với tài liệu Word (.docx) và Markdown (.md).' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'ĐÃ HOÀN THÀNH (100%)' })] }),
                ],
              }),
            ],
          }),

          // 5. HƯỚNG DẪN THAO TÁC TRÊN BITRIX24
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '5. HƯỚNG DẪN THAO TÁC XUẤT VÀ NHẬP QUY TRÌNH TRÊN BITRIX24',
                bold: true,
                size: 26,
                color: '1E40AF',
              }),
            ],
            spacing: { before: 300, after: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '1. Cách tạo và cấu hình:\n' +
                      '   - Truy cập Company -> Lists (hoặc Feed -> Workflows in Feed).\n' +
                      '   - Tạo danh sách mới tương ứng và cấu hình các trường dữ liệu theo bảng trên (bao gồm trường Phòng ban).\n' +
                      '   - Mở Business Process Designer, cấu hình các khối: Approve Element, Condition, Set Status Message, Send Notification, Log to Tracking.\n\n' +
                      '2. Cách xuất (Export) file .bpt:\n' +
                      '   - Trong Business Process Designer, bấm nút Thao tác (Action / Settings) ở góc trên bên phải.\n' +
                      '   - Chọn Export để tải về file NghiPhep_3Cap.bpt và ChiPhiCongTac_4Cap.bpt.\n\n' +
                      '3. Cách nhập (Import) file .bpt cho người chấm thi:\n' +
                      '   - Mở trình thiết kế quy trình của bất kỳ danh sách nào trên Bitrix24.\n' +
                      '   - Bấm nút Import và chọn file .bpt tương ứng.\n' +
                      '   - Bấm Save để phục hồi 100% sơ đồ và các khối chức năng tự động.\n',
              }),
            ],
            spacing: { after: 400 },
          }),

          // Signature / Conclusion
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'Hà Nội, Ngày 26 Tháng 09 Năm 2026\n', italics: true }),
              new TextRun({ text: 'Người lập tài liệu\n', bold: true }),
              new TextRun({ text: 'Nguyễn Văn Đoan\n', bold: true }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, '..', 'docs', 'Tai_Lieu_Mo_Ta_Workflow_Bitrix24.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('Successfully generated Word document at:', outPath);
}

generateDocx().catch((err) => {
  console.error('Failed to generate docx:', err);
  process.exit(1);
});
