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
                text: 'Bài kiểm tra Vòng 2 Developer: V2 - Bai Kiem tra Xay dung Workflow tren Bitrix24 - Version 1',
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
            ],
            spacing: { after: 400 },
          }),

          // 1. TỔNG QUAN
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '1. TỔNG QUAN YÊU CẦU ĐỀ BÀI',
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
                text: 'Đề bài yêu cầu thiết kế và triển khai 2 quy trình tự động hóa tác vụ nghiệp vụ nội bộ trên nền tảng Bitrix24 bằng module Business Process. Cả hai quy trình đều phải hỗ trợ cơ chế rẽ nhánh kiểm tra điều kiện hợp lệ, xử lý từ chối tại mọi cấp phê duyệt, gửi thông báo tự động (notification) đến người liên quan, ghi vết lịch sử (audit trail), và có khả năng xuất (export) ra file định dạng .bpt để phục vụ công tác chấm thi và triển khai lại trên các portal Bitrix24 khác.',
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
                  new TableCell({ children: [new Paragraph({ text: 'Kiểm tra điều kiện' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Số ngày nghỉ <= Số ngày phép còn lại' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Tổng chi phí <= Ngân sách khả dụng' })] }),
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
                text: '1. Họ và tên nhân viên (NAME): Kiểu chuỗi / User, tự động gán tên người nộp đơn.\n' +
                      '2. Phòng ban (DEPARTMENT): Kiểu danh sách chọn phòng ban.\n' +
                      '3. Loại nghỉ phép (LEAVE_TYPE): Danh sách chọn (Nghỉ phép năm, Nghỉ ốm, Việc riêng, Nghỉ không lương).\n' +
                      '4. Ngày bắt đầu (START_DATE): Kiểu ngày/tháng.\n' +
                      '5. Ngày kết thúc (END_DATE): Kiểu ngày/tháng.\n' +
                      '6. Số ngày xin nghỉ (DURATION_DAYS): Kiểu số nguyên/thập phân (VD: 2 ngày).\n' +
                      '7. Số ngày phép còn lại (LEAVE_BALANCE): Kiểu số nguyên (VD: 12 ngày, phục vụ kiểm tra điều kiện).\n' +
                      '8. Lý do nghỉ (REASON): Đoạn văn bản mô tả lý do nghỉ phép.\n' +
                      '9. Lý do từ chối (REJECTION_REASON): Nhập bởi người duyệt khi từ chối đơn.\n' +
                      '10. Trạng thái (STATUS): Cập nhật tự động qua từng giai đoạn của quy trình.\n',
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
                text: '• Bước 1: Nhân viên tạo đơn nghỉ phép trên giao diện Bitrix24. Trạng thái đặt là "Chờ Quản lý trực tiếp duyệt".\n' +
                      '• Bước 2 (Cấp 1): Quản lý trực tiếp nhận Task phê duyệt. Nếu bấm "Từ chối", quy trình yêu cầu nhập lý do từ chối, gửi tin nhắn thông báo cho nhân viên và kết thúc. Nếu bấm "Phê duyệt", chuyển tiếp sang bước kiểm tra điều kiện.\n' +
                      '• Bước 3 (Kiểm tra điều kiện): Khối Condition kiểm tra logic: Số ngày xin nghỉ <= Số ngày phép còn lại. Nếu không thỏa mãn (vượt ngày phép), kích hoạt rẽ nhánh từ chối và thông báo nhân viên. Nếu thỏa mãn, chuyển sang Cấp 2.\n' +
                      '• Bước 4 (Cấp 2): Trưởng phòng Nhân sự kiểm tra tính hợp lệ và hồ sơ nhân sự. Nếu từ chối, gửi thông báo và kết thúc. Nếu duyệt, chuyển sang Cấp 3.\n' +
                      '• Bước 5 (Cấp 3): Giám đốc xem xét phê duyệt cuối cùng. Khi Giám đốc duyệt, trạng thái chuyển thành "Đã phê duyệt", gửi thông báo chúc mừng đến nhân viên và ghi nhận đầy đủ lịch sử Audit Trail.\n',
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
                text: '1. Người đề xuất (NAME): Tên nhân viên tạo đề xuất.\n' +
                      '2. Phòng ban (DEPARTMENT): Tên đơn vị / phòng ban công tác.\n' +
                      '3. Mục đích công tác (PURPOSE): Mục đích chuyến đi (khảo sát, gặp khách hàng, triển khai dự án...).\n' +
                      '4. Địa điểm công tác (LOCATION): Địa phương hoặc quốc gia đến công tác.\n' +
                      '5. Thời gian công tác (TRIP_DATES): Thời gian khởi hành và kết thúc.\n' +
                      '6. Chi tiết chi phí dự kiến (EXPENSE_DETAILS): Danh mục chi tiết (Vé máy bay, khách sạn, công tác phí...).\n' +
                      '7. Tổng chi phí dự kiến (TOTAL_AMOUNT): Tổng số tiền (VND).\n' +
                      '8. Ngân sách khả dụng (BUDGET_AVAILABLE): Hạn mức ngân sách khả dụng của phòng ban (VND).\n' +
                      '9. Tài liệu / Báo giá đính kèm (ATTACHMENTS): Đính kèm file hóa đơn, vé máy bay, báo giá dự kiến.\n' +
                      '10. Lý do từ chối (REJECTION_REASON): Ghi chú khi bị từ chối.\n',
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
                text: '• Cấp 1 (Quản lý trực tiếp): Xem xét tính cần thiết của chuyến công tác so với kế hoạch nhiệm vụ.\n' +
                      '• Kiểm tra điều kiện ngân sách: Khối Condition so sánh Tổng chi phí dự kiến <= Ngân sách khả dụng. Nếu vượt ngân sách, hệ thống tự động cảnh báo và từ chối đề xuất.\n' +
                      '• Cấp 2 (Trưởng phòng Tài chính): Kiểm tra định mức chi tiêu, kiểm tra chứng từ/báo giá đính kèm.\n' +
                      '• Cấp 3 (Phó Giám đốc phụ trách Tài chính): Đánh giá tính hợp lý của chi phí và nguồn tiền phân bổ.\n' +
                      '• Cấp 4 (Giám đốc điều hành): Phê duyệt quyết định công tác và ký duyệt lệnh chi tạm ứng công tác phí.\n' +
                      '• Thông báo & Lưu vết: Bắn thông báo chuông hệ thống cho người đề xuất và kế toán viên thực hiện lệnh tạm ứng. Ghi nhận toàn bộ 4 bước phê duyệt vào Execution Log (Audit Trail).\n',
              }),
            ],
            spacing: { after: 300 },
          }),

          // 4. HƯỚNG DẪN THAO TÁC TRÊN BITRIX24
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '4. HƯỚNG DẪN THAO TÁC XUẤT VÀ NHẬP QUY TRÌNH TRÊN BITRIX24',
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
                      '   - Tạo danh sách mới tương ứng và cấu hình các trường dữ liệu theo bảng trên.\n' +
                      '   - Mở Business Process Designer, kéo thả các khối: Approve Element, Condition, Set Status, Send Notification, Log to Tracking.\n\n' +
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
              new TextRun({ text: 'Hà Nội, Ngày 19 Tháng 09 Năm 2026\n', italics: true }),
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
