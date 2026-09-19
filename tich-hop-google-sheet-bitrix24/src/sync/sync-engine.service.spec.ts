import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Bitrix24Service } from '../bitrix24/bitrix24.service';
import { MappingConfig } from '../database/entities/mapping-config.entity';
import { SyncHash } from '../database/entities/sync-hash.entity';
import { SyncJobStatus, SyncLog, SyncTriggerType } from '../database/entities/sync-log.entity';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { ConflictResolverService } from './conflict-resolver.service';
import { DataTransformerService } from './data-transformer.service';
import { SyncEngineService } from './sync-engine.service';

describe('SyncEngineService (Core Test Cases TC1 - TC5)', () => {
  let service: SyncEngineService;
  let mockGoogleSheets: any;
  let mockBitrix24: any;
  let mockSyncLogRepo: any;
  let mockSyncHashRepo: any;
  let mockMappingConfigRepo: any;

  beforeEach(async () => {
    mockGoogleSheets = {
      readSheetData: jest.fn(),
      batchUpdateTracking: jest.fn().mockResolvedValue(undefined),
    };

    mockBitrix24 = {
      createLead: jest.fn(),
      updateLead: jest.fn(),
      findLeadByEmailOrPhone: jest.fn(),
    };

    mockSyncLogRepo = {
      save: jest.fn().mockImplementation((log) => Promise.resolve({ id: 1, ...log })),
      find: jest.fn().mockResolvedValue([]),
    };

    mockSyncHashRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((hash) => Promise.resolve({ id: 1, ...hash })),
    };

    mockMappingConfigRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncEngineService,
        DataTransformerService,
        ConflictResolverService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'google.spreadsheetId') return 'test-spreadsheet-id';
              if (key === 'google.sheetName') return 'Sheet1';
              return null;
            }),
          },
        },
        { provide: GoogleSheetsService, useValue: mockGoogleSheets },
        { provide: Bitrix24Service, useValue: mockBitrix24 },
        { provide: getRepositoryToken(SyncLog), useValue: mockSyncLogRepo },
        { provide: getRepositoryToken(SyncHash), useValue: mockSyncHashRepo },
        { provide: getRepositoryToken(MappingConfig), useValue: mockMappingConfigRepo },
      ],
    }).compile();

    service = module.get<SyncEngineService>(SyncEngineService);
  });

  describe('TC1 - Tạo Lead Mới', () => {
    it('should create new lead in Bitrix24 when row has no Lead ID and write back to sheet', async () => {
      mockGoogleSheets.readSheetData.mockResolvedValue({
        headers: ['Tên khách hàng', 'Email', 'Số điện thoại', 'Trạng thái đồng bộ', 'Lead ID Bitrix24', 'Thời gian đồng bộ cuối', 'Thông báo lỗi'],
        rows: [
          {
            rowNumber: 2,
            data: {
              'Tên khách hàng': 'Nguyễn Văn An',
              'Email': 'an.nguyen@example.com',
              'Số điện thoại': '0912345678',
              'Trạng thái đồng bộ': '',
              'Lead ID Bitrix24': '',
            },
            rawValues: ['Nguyễn Văn An', 'an.nguyen@example.com', '0912345678', '', '', '', ''],
          },
        ],
        trackingIndices: {
          syncStatusCol: 3,
          leadIdCol: 4,
          lastSyncedAtCol: 5,
          errorMessageCol: 6,
        },
      });

      mockBitrix24.findLeadByEmailOrPhone.mockResolvedValue(null);
      mockBitrix24.createLead.mockResolvedValue(501);

      const summary = await service.executeSync();

      expect(summary.status).toBe(SyncJobStatus.SUCCESS);
      expect(summary.createdCount).toBe(1);
      expect(summary.updatedCount).toBe(0);
      expect(summary.errorCount).toBe(0);

      expect(mockBitrix24.createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          TITLE: 'Nguyễn Văn An',
          EMAIL: [{ VALUE: 'an.nguyen@example.com', VALUE_TYPE: 'WORK' }],
        }),
      );

      expect(mockGoogleSheets.batchUpdateTracking).toHaveBeenCalledWith(
        'test-spreadsheet-id',
        'Sheet1',
        [
          expect.objectContaining({
            rowNumber: 2,
            syncStatus: 'Đã đồng bộ',
            leadId: 501,
            errorMessage: '',
          }),
        ],
        expect.any(Object),
      );
    });
  });

  describe('TC2 - Cập Nhật Lead', () => {
    it('should update existing lead in Bitrix24 when Lead ID is already present', async () => {
      mockGoogleSheets.readSheetData.mockResolvedValue({
        headers: ['Tên khách hàng', 'Email', 'Số điện thoại', 'Trạng thái', 'Trạng thái đồng bộ', 'Lead ID Bitrix24', 'Thời gian đồng bộ cuối', 'Thông báo lỗi'],
        rows: [
          {
            rowNumber: 3,
            data: {
              'Tên khách hàng': 'Trần Thị Bích',
              'Email': 'bich.tran@example.com',
              'Số điện thoại': '0987654321',
              'Trạng thái': 'Đang liên hệ',
              'Trạng thái đồng bộ': 'Chờ xử lý',
              'Lead ID Bitrix24': '502',
            },
            rawValues: ['Trần Thị Bích', 'bich.tran@example.com', '0987654321', 'Đang liên hệ', 'Chờ xử lý', '502', '', ''],
          },
        ],
        trackingIndices: {
          syncStatusCol: 4,
          leadIdCol: 5,
          lastSyncedAtCol: 6,
          errorMessageCol: 7,
        },
      });

      mockBitrix24.updateLead.mockResolvedValue(true);

      const summary = await service.executeSync();

      expect(summary.createdCount).toBe(0);
      expect(summary.updatedCount).toBe(1);
      expect(mockBitrix24.createLead).not.toHaveBeenCalled();
      expect(mockBitrix24.updateLead).toHaveBeenCalledWith(
        502,
        expect.objectContaining({
          STATUS_ID: 'IN_PROCESS',
        }),
      );
    });
  });

  describe('TC3 - Xử Lý Trùng Lặp', () => {
    it('should detect duplicate lead by email/phone and update existing CRM lead instead of creating new', async () => {
      mockGoogleSheets.readSheetData.mockResolvedValue({
        headers: ['Tên khách hàng', 'Email', 'Số điện thoại', 'Trạng thái đồng bộ', 'Lead ID Bitrix24'],
        rows: [
          {
            rowNumber: 4,
            data: {
              'Tên khách hàng': 'Lê Hoàng Long',
              'Email': 'long.le@example.com',
              'Số điện thoại': '0903112233',
              'Trạng thái đồng bộ': '',
              'Lead ID Bitrix24': '',
            },
            rawValues: ['Lê Hoàng Long', 'long.le@example.com', '0903112233', '', ''],
          },
        ],
        trackingIndices: {
          syncStatusCol: 3,
          leadIdCol: 4,
          lastSyncedAtCol: 5,
          errorMessageCol: 6,
        },
      });

      // Bitrix24 finds an existing lead with this email
      mockBitrix24.findLeadByEmailOrPhone.mockResolvedValue({
        ID: '777',
        TITLE: 'Old Long Lead',
      });
      mockBitrix24.updateLead.mockResolvedValue(true);

      const summary = await service.executeSync();

      expect(summary.createdCount).toBe(0);
      expect(summary.updatedCount).toBe(1);
      expect(mockBitrix24.createLead).not.toHaveBeenCalled();
      expect(mockBitrix24.updateLead).toHaveBeenCalledWith(
        777,
        expect.objectContaining({
          TITLE: 'Lê Hoàng Long',
        }),
      );
      expect(mockGoogleSheets.batchUpdateTracking).toHaveBeenCalledWith(
        'test-spreadsheet-id',
        'Sheet1',
        [
          expect.objectContaining({
            rowNumber: 4,
            leadId: 777,
            syncStatus: 'Đã đồng bộ',
          }),
        ],
        expect.any(Object),
      );
    });
  });

  describe('TC4 - Error Handling & Backoff', () => {
    it('should catch row error, write error to tracking column, and proceed with other rows without crashing', async () => {
      mockGoogleSheets.readSheetData.mockResolvedValue({
        headers: ['Tên khách hàng', 'Email', 'Số điện thoại', 'Trạng thái đồng bộ', 'Lead ID Bitrix24'],
        rows: [
          {
            rowNumber: 2,
            data: {
              'Tên khách hàng': 'Failing Lead',
              'Email': 'fail@example.com',
              'Lead ID Bitrix24': '',
            },
            rawValues: ['Failing Lead', 'fail@example.com', ''],
          },
          {
            rowNumber: 3,
            data: {
              'Tên khách hàng': 'Success Lead',
              'Email': 'success@example.com',
              'Lead ID Bitrix24': '',
            },
            rawValues: ['Success Lead', 'success@example.com', ''],
          },
        ],
        trackingIndices: {
          syncStatusCol: 3,
          leadIdCol: 4,
          lastSyncedAtCol: 5,
          errorMessageCol: 6,
        },
      });

      mockBitrix24.findLeadByEmailOrPhone.mockResolvedValue(null);
      // Row 2 fails
      mockBitrix24.createLead
        .mockRejectedValueOnce(new Error('Bitrix24 Network Timeout'))
        .mockResolvedValueOnce(888); // Row 3 succeeds

      const summary = await service.executeSync();

      expect(summary.status).toBe(SyncJobStatus.PARTIAL_SUCCESS);
      expect(summary.createdCount).toBe(1);
      expect(summary.errorCount).toBe(1);
      expect(summary.errors[0].error).toContain('Bitrix24 Network Timeout');

      expect(mockGoogleSheets.batchUpdateTracking).toHaveBeenCalledWith(
        'test-spreadsheet-id',
        'Sheet1',
        [
          expect.objectContaining({
            rowNumber: 2,
            syncStatus: 'Lỗi',
            errorMessage: 'Bitrix24 Network Timeout',
          }),
          expect.objectContaining({
            rowNumber: 3,
            syncStatus: 'Đã đồng bộ',
            leadId: 888,
          }),
        ],
        expect.any(Object),
      );
    });
  });

  describe('TC5 - Idempotency Validation', () => {
    it('should skip rows when content hash has not changed and row is already synced', async () => {
      const rowData = {
        'Tên khách hàng': 'Nguyễn Văn An',
        'Email': 'an.nguyen@example.com',
        'Số điện thoại': '0912345678',
        'Trạng thái đồng bộ': 'Đã đồng bộ',
        'Lead ID Bitrix24': '501',
      };

      mockGoogleSheets.readSheetData.mockResolvedValue({
        headers: ['Tên khách hàng', 'Email', 'Số điện thoại', 'Trạng thái đồng bộ', 'Lead ID Bitrix24'],
        rows: [
          {
            rowNumber: 2,
            data: rowData,
            rawValues: ['Nguyễn Văn An', 'an.nguyen@example.com', '0912345678', 'Đã đồng bộ', '501'],
          },
        ],
        trackingIndices: {
          syncStatusCol: 3,
          leadIdCol: 4,
          lastSyncedAtCol: 5,
          errorMessageCol: 6,
        },
      });

      const transformer = new DataTransformerService();
      const currentHash = transformer.computeRowHash(rowData);

      // Return matching hash record from database
      mockSyncHashRepo.findOne.mockResolvedValue({
        id: 1,
        contentHash: currentHash,
        leadId: 501,
        status: 'SYNCED',
      });

      const summary = await service.executeSync();

      expect(summary.skippedCount).toBe(1);
      expect(summary.createdCount).toBe(0);
      expect(summary.updatedCount).toBe(0);
      expect(mockBitrix24.createLead).not.toHaveBeenCalled();
      expect(mockBitrix24.updateLead).not.toHaveBeenCalled();
    });
  });

  describe('Operational & Edge Cases', () => {
    it('should report isRunning accurately', () => {
      expect(service.isRunning()).toBe(false);
    });

    it('should load mapping rules from database when configured', async () => {
      mockMappingConfigRepo.findOne.mockResolvedValue({
        configJson: JSON.stringify({
          fields: [{ sheetColumn: 'Tên', bitrixField: 'TITLE' }],
        }),
      });

      const rules = await service.loadMappingRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].bitrixField).toBe('TITLE');
    });

    it('should update existing prevHashRecord on successful sync', async () => {
      mockGoogleSheets.readSheetData.mockResolvedValue({
        headers: ['Tên khách hàng', 'Email', 'Trạng thái đồng bộ'],
        rows: [
          {
            rowNumber: 2,
            data: { 'Tên khách hàng': 'Nguyễn Văn An', 'Email': 'an@example.com' },
            rawValues: ['Nguyễn Văn An', 'an@example.com'],
          },
        ],
        trackingIndices: { syncStatusCol: 2, leadIdCol: 3, lastSyncedAtCol: 4, errorMessageCol: 5 },
      });

      mockBitrix24.findLeadByEmailOrPhone.mockResolvedValue(null);
      mockBitrix24.createLead.mockResolvedValue(601);

      const existingRecord = { id: 10, contentHash: 'old_hash', leadId: 500, status: 'SYNCED' };
      mockSyncHashRepo.findOne.mockResolvedValue(existingRecord);

      const summary = await service.executeSync({ forceFullSync: true });
      expect(summary.createdCount).toBe(1);
      expect(mockSyncHashRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 10,
          leadId: 601,
        }),
      );
    });

    it('should handle dry-run mode without modifying sheet or DB', async () => {
      mockGoogleSheets.readSheetData.mockResolvedValue({
        headers: ['Tên khách hàng', 'Email'],
        rows: [
          {
            rowNumber: 2,
            data: { 'Tên khách hàng': 'Dry Run Test', 'Email': 'dry@example.com' },
            rawValues: ['Dry Run Test', 'dry@example.com'],
          },
        ],
        trackingIndices: { syncStatusCol: 2, leadIdCol: 3, lastSyncedAtCol: 4, errorMessageCol: 5 },
      });

      mockBitrix24.findLeadByEmailOrPhone.mockResolvedValue(null);
      mockBitrix24.createLead.mockResolvedValue(701);

      const summary = await service.executeSync({ dryRun: true });
      expect(summary.createdCount).toBe(1);
      expect(mockGoogleSheets.batchUpdateTracking).not.toHaveBeenCalled();
      expect(mockSyncHashRepo.save).not.toHaveBeenCalled();
    });

    it('should record error when spreadsheet ID is empty', async () => {
      const summary = await service.executeSync({ spreadsheetId: '' });
      expect(summary.status).toBe(SyncJobStatus.FAILED);
      expect(summary.errorCount).toBe(1);
      expect(summary.errors[0].error).toContain('Google Spreadsheet ID is not configured');
    });
  });
});
