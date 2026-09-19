import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Bitrix24Service } from './bitrix24.service';

describe('Bitrix24Service', () => {
  let service: Bitrix24Service;
  let mockHttpClient: any;

  beforeEach(async () => {
    mockHttpClient = {
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Bitrix24Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'bitrix24.webhookUrl') return 'https://test.bitrix24.vn/rest/1/webhook_token/';
              if (key === 'sync.rateLimitRps') return 100; // fast for unit tests
              if (key === 'sync.maxRetries') return 2;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<Bitrix24Service>(Bitrix24Service);
    service.setHttpClientForTest(mockHttpClient);
  });

  describe('createLead', () => {
    it('should call crm.lead.add and return the new lead ID', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: { result: 105 },
      });

      const leadId = await service.createLead({ TITLE: 'Lead Test', NAME: 'Test' });
      expect(leadId).toBe(105);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://test.bitrix24.vn/rest/1/webhook_token/crm.lead.add',
        expect.objectContaining({
          fields: { TITLE: 'Lead Test', NAME: 'Test' },
        }),
      );
    });
  });

  describe('updateLead', () => {
    it('should call crm.lead.update and return true on success', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: { result: true },
      });

      const success = await service.updateLead(105, { STATUS_ID: 'IN_PROCESS' });
      expect(success).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://test.bitrix24.vn/rest/1/webhook_token/crm.lead.update',
        expect.objectContaining({
          id: 105,
          fields: { STATUS_ID: 'IN_PROCESS' },
        }),
      );
    });
  });

  describe('findLeadByEmailOrPhone', () => {
    it('should find lead by email', async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: {
          result: [{ ID: '201', TITLE: 'Existing Lead', EMAIL: [{ VALUE: 'user@example.com' }] }],
        },
      });

      const lead = await service.findLeadByEmailOrPhone('user@example.com');
      expect(lead).toBeDefined();
      expect(lead?.ID).toBe('201');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://test.bitrix24.vn/rest/1/webhook_token/crm.lead.list',
        expect.objectContaining({
          filter: { '=EMAIL': 'user@example.com' },
        }),
      );
    });

    it('should fallback to phone if not found by email', async () => {
      // First call (email) returns empty
      mockHttpClient.post.mockResolvedValueOnce({
        data: { result: [] },
      });
      // Second call (phone) returns lead
      mockHttpClient.post.mockResolvedValueOnce({
        data: {
          result: [{ ID: '202', TITLE: 'Phone Lead', PHONE: [{ VALUE: '0912345678' }] }],
        },
      });

      const lead = await service.findLeadByEmailOrPhone('user@example.com', '0912345678');
      expect(lead).toBeDefined();
      expect(lead?.ID).toBe('202');
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });

    it('should return null if not found by either', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: { result: [] },
      });

      const lead = await service.findLeadByEmailOrPhone('notfound@example.com', '0000000000');
      expect(lead).toBeNull();
    });
  });

  describe('Exponential backoff retry', () => {
    it('should retry when 429 Too Many Requests is encountered and succeed on next attempt', async () => {
      const rateLimitErr = {
        response: { status: 429, data: { error: 'QUERY_LIMIT_EXCEEDED' } },
      };
      mockHttpClient.post
        .mockRejectedValueOnce(rateLimitErr)
        .mockResolvedValueOnce({ data: { result: 999 } });

      const leadId = await service.createLead({ TITLE: 'Retry Test' });
      expect(leadId).toBe(999);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });

    it('should throw error when maximum retries are exceeded', async () => {
      const serverErr = {
        response: { status: 500, data: { error: 'INTERNAL_SERVER_ERROR', error_description: 'CRM down' } },
      };
      mockHttpClient.post.mockRejectedValue(serverErr);

      await expect(service.createLead({ TITLE: 'Fail Test' })).rejects.toThrow();
    });
  });

  describe('batchExecute', () => {
    it('should execute batch commands and return results', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          result: {
            result: {
              cmd1: 101,
              cmd2: true,
            },
          },
        },
      });

      const batchRes = await service.batchExecute({
        cmd1: 'crm.lead.add?fields[TITLE]=Lead1',
        cmd2: 'crm.lead.update?id=101&fields[STATUS_ID]=IN_PROCESS',
      });

      expect(batchRes).toEqual({
        cmd1: 101,
        cmd2: true,
      });
    });
  });
});
