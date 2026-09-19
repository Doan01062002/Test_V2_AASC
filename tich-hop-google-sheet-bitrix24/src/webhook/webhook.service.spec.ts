import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Bitrix24Service } from '../bitrix24/bitrix24.service';
import { SyncHash } from '../database/entities/sync-hash.entity';
import { SyncLog } from '../database/entities/sync-log.entity';
import { GoogleSheetsService, TRACKING_HEADERS } from '../google-sheets/google-sheets.service';
import { ConflictResolverService } from '../sync/conflict-resolver.service';
import { DataTransformerService } from '../sync/data-transformer.service';
import { WebhookService } from './webhook.service';

describe('WebhookService (Bitrix24 Outbound -> Sheet)', () => {
  let service: WebhookService;
  let mockBitrix24: any;
  let mockGoogleSheets: any;
  let mockSyncHashRepo: any;
  let mockSyncLogRepo: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockBitrix24 = {
      getLead: jest.fn(),
    };

    mockGoogleSheets = {
      readSheetData: jest.fn(),
      updateCell: jest.fn().mockResolvedValue(undefined),
      batchUpdateTracking: jest.fn().mockResolvedValue(undefined),
    };

    mockSyncHashRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockSyncLogRepo = {
      save: jest.fn().mockResolvedValue({ id: 1 }),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'bitrix24.outboundToken') return 'valid_secret_token';
        if (key === 'google.spreadsheetId') return 'test-spreadsheet-id';
        if (key === 'google.sheetName') return 'Sheet1';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        DataTransformerService,
        ConflictResolverService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: Bitrix24Service, useValue: mockBitrix24 },
        { provide: GoogleSheetsService, useValue: mockGoogleSheets },
        { provide: getRepositoryToken(SyncHash), useValue: mockSyncHashRepo },
        { provide: getRepositoryToken(SyncLog), useValue: mockSyncLogRepo },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  it('should throw UnauthorizedException if auth token does not match', () => {
    const payload = {
      event: 'ONCRMLEADUPDATE',
      data: { FIELDS: { ID: 101 } },
      auth: { application_token: 'wrong_token' },
    };

    expect(() => service.validateToken(payload)).toThrow(UnauthorizedException);
  });

  it('should update sheet row when lead status is modified in Bitrix24', async () => {
    const payload = {
      event: 'ONCRMLEADUPDATE',
      data: { FIELDS: { ID: 501 } },
      auth: { application_token: 'valid_secret_token' },
    };

    // Bitrix returns updated status 'IN_PROCESS'
    mockBitrix24.getLead.mockResolvedValue({
      ID: 501,
      TITLE: 'Nguyễn Văn An',
      STATUS_ID: 'IN_PROCESS',
    });

    mockGoogleSheets.readSheetData.mockResolvedValue({
      headers: ['Tên khách hàng', 'Trạng thái', TRACKING_HEADERS.SYNC_STATUS, TRACKING_HEADERS.LEAD_ID],
      rows: [
        {
          rowNumber: 2,
          data: {
            'Tên khách hàng': 'Nguyễn Văn An',
            'Trạng thái': 'Mới',
            [TRACKING_HEADERS.LEAD_ID]: '501',
            [TRACKING_HEADERS.SYNC_STATUS]: 'Đã đồng bộ',
          },
          rawValues: ['Nguyễn Văn An', 'Mới', 'Đã đồng bộ', '501'],
        },
      ],
      trackingIndices: {
        syncStatusCol: 2,
        leadIdCol: 3,
        lastSyncedAtCol: 4,
        errorMessageCol: 5,
      },
    });

    const result = await service.handleBitrixLeadEvent(payload);

    expect(result.status).toBe('UPDATED');
    expect(mockGoogleSheets.updateCell).toHaveBeenCalledWith(
      'test-spreadsheet-id',
      'Sheet1',
      1, // Col index for 'Trạng thái'
      2, // Row number
      'Đang liên hệ', // Mapped from 'IN_PROCESS'
    );
    expect(mockGoogleSheets.batchUpdateTracking).toHaveBeenCalled();
  });

  it('should avoid loop if status is already the same', async () => {
    const payload = {
      event: 'ONCRMLEADUPDATE',
      data: { FIELDS: { ID: 501 } },
      auth: { application_token: 'valid_secret_token' },
    };

    // Bitrix returns status 'NEW' which maps to 'Mới'
    mockBitrix24.getLead.mockResolvedValue({
      ID: 501,
      TITLE: 'Nguyễn Văn An',
      STATUS_ID: 'NEW',
    });

    mockGoogleSheets.readSheetData.mockResolvedValue({
      headers: ['Tên khách hàng', 'Trạng thái', TRACKING_HEADERS.LEAD_ID],
      rows: [
        {
          rowNumber: 2,
          data: {
            'Tên khách hàng': 'Nguyễn Văn An',
            'Trạng thái': 'Mới',
            [TRACKING_HEADERS.LEAD_ID]: '501',
          },
          rawValues: ['Nguyễn Văn An', 'Mới', '501'],
        },
      ],
      trackingIndices: {
        syncStatusCol: 2,
        leadIdCol: 3,
        lastSyncedAtCol: 4,
        errorMessageCol: 5,
      },
    });

    const result = await service.handleBitrixLeadEvent(payload);

    expect(result.status).toBe('UNCHANGED');
    expect(mockGoogleSheets.updateCell).not.toHaveBeenCalled();
  });
});
