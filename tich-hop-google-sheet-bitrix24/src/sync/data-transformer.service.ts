import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface TransformedLeadPayload {
  fields: Record<string, any>;
  normalizedEmail?: string;
  normalizedPhone?: string;
  leadTitle: string;
}

@Injectable()
export class DataTransformerService {
  private readonly defaultStatusMap: Record<string, string> = {
    'mới': 'NEW',
    'new': 'NEW',
    'chờ xử lý': 'NEW',
    'đang liên hệ': 'IN_PROCESS',
    'in process': 'IN_PROCESS',
    'đạt tiêu chuẩn': 'QUALIFIED',
    'qualified': 'QUALIFIED',
    'chuyển giao': 'CONVERTED',
    'converted': 'CONVERTED',
    'không tiềm năng': 'JUNK',
    'junk': 'JUNK',
  };

  private readonly reverseStatusMap: Record<string, string> = {
    NEW: 'Mới',
    IN_PROCESS: 'Đang liên hệ',
    QUALIFIED: 'Đạt tiêu chuẩn',
    CONVERTED: 'Chuyển giao',
    JUNK: 'Không tiềm năng',
  };

  normalizePhone(phone?: string | number): string {
    if (phone === undefined || phone === null) return '';
    let cleaned = String(phone).trim();
    // Remove all non-digits except leading +
    cleaned = cleaned.replace(/[^\d+]/g, '');
    if (!cleaned) return '';

    // Vietnam phone number conversion (+84..., 84...)
    if (cleaned.startsWith('+84')) {
      let rest = cleaned.slice(3);
      if (rest.startsWith('0')) rest = rest.slice(1);
      return '0' + rest;
    }
    if (cleaned.startsWith('84') && cleaned.length >= 11) {
      let rest = cleaned.slice(2);
      if (rest.startsWith('0')) rest = rest.slice(1);
      return '0' + rest;
    }

    // Google Sheets often strips leading 0 when storing phone numbers as numeric values
    // e.g. 912345678 -> 0912345678 (Vietnamese mobile prefixes: 3, 5, 7, 8, 9)
    if (/^[35789]\d{8}$/.test(cleaned)) {
      return '0' + cleaned;
    }

    return cleaned;
  }

  normalizeEmail(email?: string): string {
    if (!email) return '';
    return email.trim().toLowerCase();
  }

  isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  parseCurrency(val?: string | number): number {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;

    // Remove VND, đ, currency symbols, spaces, commas, dots used as thousand separators
    let str = String(val).trim();
    str = str.replace(/[^\d.,]/g, '');

    // If has both comma and dot, e.g. 50,000,000.00
    if (str.includes(',') && str.includes('.')) {
      str = str.replace(/,/g, '');
    } else if (str.includes(',')) {
      // Vietnam or European notation 50,000,000 -> 50000000
      str = str.replace(/,/g, '');
    } else if ((str.match(/\./g) || []).length > 1) {
      // 50.000.000 -> 50000000
      str = str.replace(/\./g, '');
    }

    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  mapStatusToBitrix(status?: string, customEnumMap?: Record<string, string>): string {
    if (!status) return 'NEW';
    const clean = status.trim().toLowerCase();
    if (customEnumMap && customEnumMap[clean]) {
      return customEnumMap[clean];
    }
    return this.defaultStatusMap[clean] || 'NEW';
  }

  mapBitrixStatusToSheet(statusId?: string, customReverseMap?: Record<string, string>): string {
    if (!statusId) return 'Mới';
    if (customReverseMap && customReverseMap[statusId]) {
      return customReverseMap[statusId];
    }
    return this.reverseStatusMap[statusId] || statusId;
  }

  splitFullName(fullName: string): { firstName: string; lastName: string } {
    const trimmed = fullName.trim();
    if (!trimmed) return { firstName: '', lastName: '' };
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    const lastName = parts.slice(0, parts.length - 1).join(' ');
    const firstName = parts[parts.length - 1];
    return { firstName, lastName };
  }

  transformSheetRowToLead(
    rowData: Record<string, string>,
    mappingFields?: any[],
  ): TransformedLeadPayload {
    const fields: Record<string, any> = {};

    // Standard column candidates
    const rawName =
      rowData['Tên khách hàng'] ||
      rowData['Họ và tên'] ||
      rowData['Khách hàng'] ||
      rowData['Name'] ||
      '';

    const rawEmail = rowData['Email'] || rowData['Thư điện tử'] || '';
    const rawPhone = rowData['Số điện thoại'] || rowData['SĐT'] || rowData['Điện thoại'] || '';
    const rawCompany = rowData['Công ty'] || rowData['Tên công ty'] || '';
    const rawSource = rowData['Nguồn lead'] || rowData['Nguồn'] || rowData['UTM Source'] || '';
    const rawBudget = rowData['Ngân sách dự kiến'] || rowData['Ngân sách'] || rowData['Giá trị'] || '';
    const rawStatus = rowData['Trạng thái'] || '';
    const rawAssigned = rowData['Người phụ trách'] || '';
    const rawNotes = rowData['Ghi chú'] || rowData['Nhu cầu'] || '';

    const normEmail = this.normalizeEmail(rawEmail);
    const normPhone = this.normalizePhone(rawPhone);

    const title = rawName
      ? rawCompany
        ? `${rawName} - ${rawCompany}`
        : rawName
      : normPhone
        ? `Lead ${normPhone}`
        : normEmail
          ? `Lead ${normEmail}`
          : 'Lead Mới';

    fields['TITLE'] = title;

    if (rawName) {
      const { firstName, lastName } = this.splitFullName(rawName);
      if (firstName) fields['NAME'] = firstName;
      if (lastName) fields['LAST_NAME'] = lastName;
    }

    if (rawCompany) {
      fields['COMPANY_TITLE'] = rawCompany;
    }

    if (normEmail) {
      fields['EMAIL'] = [{ VALUE: normEmail, VALUE_TYPE: 'WORK' }];
    }

    if (normPhone) {
      fields['PHONE'] = [{ VALUE: normPhone, VALUE_TYPE: 'WORK' }];
    }

    if (rawSource) {
      fields['SOURCE_DESCRIPTION'] = rawSource;
    }

    const budget = this.parseCurrency(rawBudget);
    if (budget > 0) {
      fields['OPPORTUNITY'] = budget;
      fields['CURRENCY_ID'] = 'VND';
    }

    if (rawStatus) {
      fields['STATUS_ID'] = this.mapStatusToBitrix(rawStatus);
    }

    if (rawAssigned) {
      const assignedId = parseInt(rawAssigned, 10);
      if (!isNaN(assignedId) && assignedId > 0) {
        fields['ASSIGNED_BY_ID'] = assignedId;
      }
    }

    if (rawNotes) {
      fields['COMMENTS'] = rawNotes;
    }

    // Apply custom mappings if provided
    if (mappingFields && Array.isArray(mappingFields)) {
      for (const fieldRule of mappingFields) {
        const val = rowData[fieldRule.sheetColumn];
        if (val !== undefined && val !== '') {
          const bitrixField = fieldRule.bitrixField;
          const type = fieldRule.type || 'string';

          if (type === 'phone' || bitrixField === 'PHONE') {
            const p = this.normalizePhone(val);
            if (p) fields['PHONE'] = [{ VALUE: p, VALUE_TYPE: 'WORK' }];
          } else if (type === 'email' || bitrixField === 'EMAIL') {
            const e = this.normalizeEmail(val);
            if (e) fields['EMAIL'] = [{ VALUE: e, VALUE_TYPE: 'WORK' }];
          } else if (type === 'currency') {
            fields[bitrixField] = this.parseCurrency(val);
          } else if (type === 'number') {
            const num = parseFloat(String(val).replace(/,/g, '').trim());
            fields[bitrixField] = isNaN(num) ? 0 : num;
          } else if (type === 'enum' && fieldRule.enumMap) {
            fields[bitrixField] = this.mapStatusToBitrix(val, fieldRule.enumMap);
          } else {
            fields[bitrixField] = String(val).trim();
          }
        }
      }
    }

    return {
      fields,
      normalizedEmail: normEmail,
      normalizedPhone: normPhone,
      leadTitle: title,
    };
  }

  computeRowHash(rowData: Record<string, any>): string {
    const keysToExclude = [
      'Trạng thái đồng bộ',
      'Lead ID Bitrix24',
      'Thời gian đồng bộ cuối',
      'Thông báo lỗi',
    ];

    const sortedKeys = Object.keys(rowData)
      .filter((k) => !keysToExclude.includes(k.trim()))
      .sort();

    const canonicalParts = sortedKeys.map((k) => {
      const val = rowData[k];
      let normVal = val !== undefined && val !== null ? String(val).trim() : '';
      if (k.toLowerCase().includes('email')) {
        normVal = normVal.toLowerCase();
      } else if (k.toLowerCase().includes('thoại') || k.toLowerCase().includes('phone')) {
        normVal = this.normalizePhone(normVal);
      }
      return `${k}=${normVal}`;
    });

    return crypto.createHash('sha256').update(canonicalParts.join('|')).digest('hex');
  }
}
