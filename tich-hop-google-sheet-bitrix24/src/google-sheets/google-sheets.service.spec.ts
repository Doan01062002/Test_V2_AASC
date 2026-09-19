import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  columnIndexToLetter,
  GoogleSheetsService,
  letterToColumnIndex,
  TRACKING_HEADERS,
} from './google-sheets.service';

describe('GoogleSheetsService', () => {
  let service: GoogleSheetsService;
  let mockSheetsClient: any;

  beforeEach(async () => {
    mockSheetsClient = {
      spreadsheets: {
        get: jest.fn(),
        values: {
          get: jest.fn(),
          update: jest.fn(),
          batchUpdate: jest.fn(),
          append: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleSheetsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'google.serviceAccountFile') return 'google-service-account.json';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GoogleSheetsService>(GoogleSheetsService);
    service.setClientForTest(mockSheetsClient);
  });

  describe('Column letter utilities', () => {
    it('should convert column index to letter properly', () => {
      expect(columnIndexToLetter(0)).toBe('A');
      expect(columnIndexToLetter(1)).toBe('B');
      expect(columnIndexToLetter(25)).toBe('Z');
      expect(columnIndexToLetter(26)).toBe('AA');
      expect(columnIndexToLetter(27)).toBe('AB');
    });

    it('should convert column letter to index properly', () => {
      expect(letterToColumnIndex('A')).toBe(0);
      expect(letterToColumnIndex('B')).toBe(1);
      expect(letterToColumnIndex('Z')).toBe(25);
      expect(letterToColumnIndex('AA')).toBe(26);
      expect(letterToColumnIndex('AB')).toBe(27);
    });
  });

  describe('getFirstSheetTitle', () => {
    it('should return the first sheet title', async () => {
      mockSheetsClient.spreadsheets.get.mockResolvedValue({
        data: {
          sheets: [{ properties: { title: 'LeadsData' } }],
        },
      });

      const title = await service.getFirstSheetTitle('test-spreadsheet-id');
      expect(title).toBe('LeadsData');
    });

    it('should fallback to Sheet1 if no sheets returned', async () => {
      mockSheetsClient.spreadsheets.get.mockResolvedValue({
        data: {},
      });

      const title = await service.getFirstSheetTitle('test-spreadsheet-id');
      expect(title).toBe('Sheet1');
    });
  });

  describe('ensureTrackingColumns', () => {
    it('should add all 4 tracking headers if not present', async () => {
      const initialHeaders = ['Tên khách hàng', 'Email', 'Số điện thoại'];
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({ data: {} });

      const indices = await service.ensureTrackingColumns(
        'test-id',
        'Sheet1',
        initialHeaders,
      );

      expect(indices.syncStatusCol).toBe(3);
      expect(indices.leadIdCol).toBe(4);
      expect(indices.lastSyncedAtCol).toBe(5);
      expect(indices.errorMessageCol).toBe(6);

      expect(mockSheetsClient.spreadsheets.values.update).toHaveBeenCalledWith(
        expect.objectContaining({
          spreadsheetId: 'test-id',
          range: "'Sheet1'!D1:G1",
          requestBody: {
            values: [
              [
                TRACKING_HEADERS.SYNC_STATUS,
                TRACKING_HEADERS.LEAD_ID,
                TRACKING_HEADERS.LAST_SYNCED_AT,
                TRACKING_HEADERS.ERROR_MESSAGE,
              ],
            ],
          },
        }),
      );
    });

    it('should not update headers if all 4 are already present', async () => {
      const headers = [
        'Tên khách hàng',
        TRACKING_HEADERS.SYNC_STATUS,
        TRACKING_HEADERS.LEAD_ID,
        TRACKING_HEADERS.LAST_SYNCED_AT,
        TRACKING_HEADERS.ERROR_MESSAGE,
      ];

      const indices = await service.ensureTrackingColumns('test-id', 'Sheet1', headers);

      expect(indices.syncStatusCol).toBe(1);
      expect(indices.leadIdCol).toBe(2);
      expect(indices.lastSyncedAtCol).toBe(3);
      expect(indices.errorMessageCol).toBe(4);
      expect(mockSheetsClient.spreadsheets.values.update).not.toHaveBeenCalled();
    });
  });

  describe('readSheetData', () => {
    it('should handle empty sheet data', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: { values: [] },
      });

      const result = await service.readSheetData('test-id', 'Sheet1');
      expect(result.rows).toHaveLength(0);
      expect(result.headers).toHaveLength(0);
    });

    it('should parse sheet rows with headers and tracking columns', async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            ['Tên khách hàng', 'Email', 'Số điện thoại', TRACKING_HEADERS.SYNC_STATUS, TRACKING_HEADERS.LEAD_ID, TRACKING_HEADERS.LAST_SYNCED_AT, TRACKING_HEADERS.ERROR_MESSAGE],
            ['Nguyễn Văn A', 'a@example.com', '0912345678', 'Chờ xử lý', '', '', ''],
            ['Trần Thị B', 'b@example.com', '0987654321', 'Đã đồng bộ', '123', '2026-09-19T10:00:00Z', ''],
          ],
        },
      });

      const result = await service.readSheetData('test-id', 'Sheet1');

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].rowNumber).toBe(2);
      expect(result.rows[0].data['Tên khách hàng']).toBe('Nguyễn Văn A');
      expect(result.rows[0].data['Email']).toBe('a@example.com');
      expect(result.rows[0].data[TRACKING_HEADERS.SYNC_STATUS]).toBe('Chờ xử lý');
      expect(result.rows[1].rowNumber).toBe(3);
      expect(result.rows[1].data[TRACKING_HEADERS.LEAD_ID]).toBe('123');
    });

    it('should fallback to first sheet if range parse fails', async () => {
      mockSheetsClient.spreadsheets.get.mockResolvedValue({
        data: { sheets: [{ properties: { title: 'Trang tính1' } }] },
      });
      mockSheetsClient.spreadsheets.values.get
        .mockRejectedValueOnce(new Error("Unable to parse range: 'Invalid'!A1:ZZ"))
        .mockResolvedValueOnce({
          data: {
            values: [
              ['Tên khách hàng', 'Email'],
              ['Nguyễn Văn A', 'a@example.com'],
            ],
          },
        })
        .mockResolvedValueOnce({
          data: {
            values: [
              ['Tên khách hàng', 'Email', 'Trạng thái đồng bộ', 'Lead ID Bitrix24', 'Thời gian đồng bộ cuối', 'Thông báo lỗi'],
            ],
          },
        });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({ data: {} });

      const result = await service.readSheetData('test-id', 'Invalid');
      expect(result.targetSheet).toBe('Trang tính1');
      expect(result.rows).toHaveLength(1);
    });
  });

  describe('batchUpdateTracking', () => {
    it('should batch update tracking columns when consecutive', async () => {
      mockSheetsClient.spreadsheets.values.batchUpdate.mockResolvedValue({ data: {} });

      const updates = [
        {
          rowNumber: 2,
          syncStatus: 'Đã đồng bộ',
          leadId: 101,
          lastSyncedAt: '2026-09-19T12:00:00Z',
          errorMessage: '',
        },
      ];

      const trackingIndices = {
        syncStatusCol: 3, // D
        leadIdCol: 4,      // E
        lastSyncedAtCol: 5, // F
        errorMessageCol: 6, // G
      };

      await service.batchUpdateTracking('test-id', 'Sheet1', updates, trackingIndices);

      expect(mockSheetsClient.spreadsheets.values.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: [
            {
              range: "'Sheet1'!D2:G2",
              values: [['Đã đồng bộ', 101, '2026-09-19T12:00:00Z', '']],
            },
          ],
        },
      });
    });

    it('should update individual cells when tracking columns are not consecutive', async () => {
      mockSheetsClient.spreadsheets.values.batchUpdate.mockResolvedValue({ data: {} });

      const updates = [
        {
          rowNumber: 2,
          syncStatus: 'Lỗi',
          leadId: 101,
          lastSyncedAt: '2026-09-19T12:00:00Z',
          errorMessage: 'Some error',
        },
      ];

      const trackingIndices = {
        syncStatusCol: 1, // B
        leadIdCol: 3,      // D
        lastSyncedAtCol: 5, // F
        errorMessageCol: 7, // H
      };

      await service.batchUpdateTracking('test-id', 'Sheet1', updates, trackingIndices);

      expect(mockSheetsClient.spreadsheets.values.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spreadsheetId: 'test-id',
          requestBody: expect.objectContaining({
            data: expect.arrayContaining([
              { range: "'Sheet1'!B2", values: [['Lỗi']] },
              { range: "'Sheet1'!D2", values: [[101]] },
              { range: "'Sheet1'!F2", values: [['2026-09-19T12:00:00Z']] },
              { range: "'Sheet1'!H2", values: [['Some error']] },
            ]),
          }),
        }),
      );
    });
  });

  describe('updateCell', () => {
    it('should update a single cell with given value', async () => {
      mockSheetsClient.spreadsheets.values.update.mockResolvedValue({ data: {} });
      await service.updateCell('test-id', 'Sheet1', 1, 2, 'Đang liên hệ');
      expect(mockSheetsClient.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        range: "'Sheet1'!B2",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['Đang liên hệ']] },
      });
    });
  });
});
