import { DataTransformerService } from './data-transformer.service';

describe('DataTransformerService', () => {
  let service: DataTransformerService;

  beforeEach(() => {
    service = new DataTransformerService();
  });

  describe('normalizePhone', () => {
    it('should normalize Vietnam phone numbers properly', () => {
      expect(service.normalizePhone('0912 345 678')).toBe('0912345678');
      expect(service.normalizePhone('(091) 234-5678')).toBe('0912345678');
      expect(service.normalizePhone('+84912345678')).toBe('0912345678');
      expect(service.normalizePhone('+84(0)912345678')).toBe('0912345678');
      expect(service.normalizePhone('84912345678')).toBe('0912345678');
      // Google Sheets strips leading zero from phone numbers
      expect(service.normalizePhone('912345678')).toBe('0912345678');
      expect(service.normalizePhone(912345678)).toBe('0912345678');
      expect(service.normalizePhone('')).toBe('');
      expect(service.normalizePhone(undefined)).toBe('');
    });
  });

  describe('normalizeEmail and isValidEmail', () => {
    it('should normalize email to lowercase and trim spaces', () => {
      expect(service.normalizeEmail('  John.DOE@Example.COM  ')).toBe('john.doe@example.com');
      expect(service.normalizeEmail('')).toBe('');
    });

    it('should validate email format', () => {
      expect(service.isValidEmail('john.doe@example.com')).toBe(true);
      expect(service.isValidEmail('invalid-email')).toBe(false);
      expect(service.isValidEmail('')).toBe(false);
    });
  });

  describe('parseCurrency', () => {
    it('should parse currency formatted strings into clean numbers', () => {
      expect(service.parseCurrency('50,000,000 VND')).toBe(50000000);
      expect(service.parseCurrency('120.000.000 đ')).toBe(120000000);
      expect(service.parseCurrency('50,000,000.00')).toBe(50000000);
      expect(service.parseCurrency('35000000')).toBe(35000000);
      expect(service.parseCurrency(5000000)).toBe(5000000);
      expect(service.parseCurrency('')).toBe(0);
      expect(service.parseCurrency(undefined)).toBe(0);
    });
  });

  describe('mapStatusToBitrix and mapBitrixStatusToSheet', () => {
    it('should map Vietnamese and English statuses to Bitrix24 status codes', () => {
      expect(service.mapStatusToBitrix('Mới')).toBe('NEW');
      expect(service.mapStatusToBitrix('New')).toBe('NEW');
      expect(service.mapStatusToBitrix('Đang liên hệ')).toBe('IN_PROCESS');
      expect(service.mapStatusToBitrix('In Process')).toBe('IN_PROCESS');
      expect(service.mapStatusToBitrix('Đạt tiêu chuẩn')).toBe('QUALIFIED');
      expect(service.mapStatusToBitrix('Chuyển giao')).toBe('CONVERTED');
      expect(service.mapStatusToBitrix('Không tiềm năng')).toBe('JUNK');
      expect(service.mapStatusToBitrix('Unknown')).toBe('NEW');
      expect(service.mapStatusToBitrix('Custom Status', { 'custom status': 'CUSTOM_STATUS' })).toBe('CUSTOM_STATUS');
    });

    it('should map Bitrix24 status code back to Vietnamese text', () => {
      expect(service.mapBitrixStatusToSheet('NEW')).toBe('Mới');
      expect(service.mapBitrixStatusToSheet('IN_PROCESS')).toBe('Đang liên hệ');
      expect(service.mapBitrixStatusToSheet('QUALIFIED')).toBe('Đạt tiêu chuẩn');
      expect(service.mapBitrixStatusToSheet('CONVERTED')).toBe('Chuyển giao');
      expect(service.mapBitrixStatusToSheet('JUNK')).toBe('Không tiềm năng');
      expect(service.mapBitrixStatusToSheet('CUSTOM_ID', { CUSTOM_ID: 'Tùy chỉnh' })).toBe('Tùy chỉnh');
    });
  });

  describe('splitFullName', () => {
    it('should split full name into first and last name correctly', () => {
      expect(service.splitFullName('Nguyễn Văn An')).toEqual({ lastName: 'Nguyễn Văn', firstName: 'An' });
      expect(service.splitFullName('John')).toEqual({ lastName: '', firstName: 'John' });
      expect(service.splitFullName('')).toEqual({ lastName: '', firstName: '' });
    });
  });

  describe('transformSheetRowToLead', () => {
    it('should transform standard sheet row to Bitrix24 lead fields', () => {
      const row = {
        'Tên khách hàng': 'Nguyễn Văn An',
        'Email': 'an.nguyen@example.com',
        'Số điện thoại': '0912 345 678',
        'Công ty': 'Công ty TNHH Ánh Dương',
        'Nguồn lead': 'Facebook Ads',
        'Ngân sách dự kiến': '50,000,000 VND',
        'Trạng thái': 'Mới',
        'Người phụ trách': '1',
        'Ghi chú': 'Quan tâm CRM Cloud',
      };

      const result = service.transformSheetRowToLead(row);

      expect(result.leadTitle).toBe('Nguyễn Văn An - Công ty TNHH Ánh Dương');
      expect(result.normalizedEmail).toBe('an.nguyen@example.com');
      expect(result.normalizedPhone).toBe('0912345678');
      expect(result.fields['TITLE']).toBe('Nguyễn Văn An - Công ty TNHH Ánh Dương');
      expect(result.fields['NAME']).toBe('An');
      expect(result.fields['LAST_NAME']).toBe('Nguyễn Văn');
      expect(result.fields['COMPANY_TITLE']).toBe('Công ty TNHH Ánh Dương');
      expect(result.fields['EMAIL']).toEqual([
        { VALUE: 'an.nguyen@example.com', VALUE_TYPE: 'WORK' },
      ]);
      expect(result.fields['PHONE']).toEqual([
        { VALUE: '0912345678', VALUE_TYPE: 'WORK' },
      ]);
      expect(result.fields['OPPORTUNITY']).toBe(50000000);
      expect(result.fields['CURRENCY_ID']).toBe('VND');
      expect(result.fields['STATUS_ID']).toBe('NEW');
      expect(result.fields['ASSIGNED_BY_ID']).toBe(1);
      expect(result.fields['COMMENTS']).toBe('Quan tâm CRM Cloud');
    });

    it('should apply custom mapping rules for custom fields, phone, email, and numbers', () => {
      const row = {
        'Khách': 'Lê Văn C',
        'Mail': 'c.le@example.com',
        'SĐT': '903112233',
        'Chi nhánh': 'Hà Nội',
        'Điểm số': '95',
      };

      const mapping = [
        { sheetColumn: 'Khách', bitrixField: 'TITLE', type: 'string' },
        { sheetColumn: 'Mail', bitrixField: 'EMAIL', type: 'email' },
        { sheetColumn: 'SĐT', bitrixField: 'PHONE', type: 'phone' },
        { sheetColumn: 'Chi nhánh', bitrixField: 'UF_CRM_BRANCH', type: 'string' },
        { sheetColumn: 'Điểm số', bitrixField: 'UF_CRM_SCORE', type: 'number' },
      ];

      const result = service.transformSheetRowToLead(row, mapping);
      expect(result.fields['UF_CRM_BRANCH']).toBe('Hà Nội');
      expect(result.fields['UF_CRM_SCORE']).toBe(95);
      expect(result.fields['EMAIL']).toEqual([{ VALUE: 'c.le@example.com', VALUE_TYPE: 'WORK' }]);
      expect(result.fields['PHONE']).toEqual([{ VALUE: '0903112233', VALUE_TYPE: 'WORK' }]);
    });
  });

  describe('computeRowHash', () => {
    it('should compute deterministic SHA-256 hash ignoring tracking columns', () => {
      const row1 = {
        'Tên khách hàng': 'Nguyễn Văn An',
        'Email': 'an.nguyen@example.com',
        'Số điện thoại': '0912345678',
        'Trạng thái đồng bộ': 'Chờ xử lý',
        'Lead ID Bitrix24': '',
      };

      const row2 = {
        'Tên khách hàng': 'Nguyễn Văn An',
        'Email': 'an.nguyen@example.com',
        'Số điện thoại': '0912345678',
        'Trạng thái đồng bộ': 'Đã đồng bộ',
        'Lead ID Bitrix24': '101',
        'Thời gian đồng bộ cuối': '2026-09-19T10:00:00Z',
      };

      const hash1 = service.computeRowHash(row1);
      const hash2 = service.computeRowHash(row2);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash when content changes', () => {
      const row1 = {
        'Tên khách hàng': 'Nguyễn Văn An',
        'Email': 'an.nguyen@example.com',
      };
      const row2 = {
        'Tên khách hàng': 'Nguyễn Văn Bình',
        'Email': 'an.nguyen@example.com',
      };

      expect(service.computeRowHash(row1)).not.toBe(service.computeRowHash(row2));
    });
  });
});
