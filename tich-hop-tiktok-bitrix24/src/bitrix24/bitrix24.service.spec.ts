import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { Bitrix24Service } from './bitrix24.service';

describe('Bitrix24Service', () => {
  let service: Bitrix24Service;
  let httpService: HttpService;
  const mockWebhookUrl = 'https://b24-mock.bitrix24.vn/rest/1/token123/';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Bitrix24Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: any) => {
              if (key === 'bitrix24.webhookUrl') return mockWebhookUrl;
              return defaultVal;
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<Bitrix24Service>(Bitrix24Service);
    httpService = module.get<HttpService>(HttpService);
  });

  function createAxiosResponse<T>(data: T): AxiosResponse<T> {
    return {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} as any },
    };
  }

  describe('createLead', () => {
    it('should call crm.lead.add and return bitrix24 lead id', async () => {
      (httpService.post as jest.Mock).mockReturnValue(
        of(createAxiosResponse({ result: 101 })),
      );

      const result = await service.createLead({
        TITLE: 'TikTok Lead - Nguyen Van A',
        NAME: 'Nguyen Van A',
        EMAIL: [{ VALUE: 'a@example.com', VALUE_TYPE: 'WORK' }],
      });

      expect(result).toBe(101);
      expect(httpService.post).toHaveBeenCalledWith(
        `${mockWebhookUrl}crm.lead.add.json`,
        expect.objectContaining({
          fields: expect.objectContaining({
            NAME: 'Nguyen Van A',
          }),
        }),
        expect.anything(),
      );
    });
  });

  describe('updateLead', () => {
    it('should call crm.lead.update and return true on success', async () => {
      (httpService.post as jest.Mock).mockReturnValue(
        of(createAxiosResponse({ result: true })),
      );

      const result = await service.updateLead(101, {
        COMMENTS: 'Updated lead info',
      });

      expect(result).toBe(true);
      expect(httpService.post).toHaveBeenCalledWith(
        `${mockWebhookUrl}crm.lead.update.json`,
        expect.objectContaining({
          id: 101,
          fields: { COMMENTS: 'Updated lead info' },
        }),
        expect.anything(),
      );
    });
  });

  describe('findLeadByEmailOrPhone', () => {
    it('should find lead by email', async () => {
      (httpService.post as jest.Mock).mockReturnValue(
        of(createAxiosResponse({ result: [{ ID: '101', NAME: 'Test' }] })),
      );

      const result = await service.findLeadByEmailOrPhone('test@example.com');
      expect(result).toBeDefined();
      expect(result.ID).toBe('101');
    });

    it('should return null when no lead matches', async () => {
      (httpService.post as jest.Mock).mockReturnValue(
        of(createAxiosResponse({ result: [] })),
      );

      const result = await service.findLeadByEmailOrPhone('notfound@example.com');
      expect(result).toBeNull();
    });
  });

  describe('createDeal', () => {
    it('should call crm.deal.add and return deal ID', async () => {
      (httpService.post as jest.Mock).mockReturnValue(
        of(createAxiosResponse({ result: 202 })),
      );

      const result = await service.createDeal({
        TITLE: 'Deal for Nguyen Van A',
        STAGE_ID: 'NEW',
        OPPORTUNITY: 5000000,
        CURRENCY_ID: 'VND',
        LEAD_ID: 101,
        PROBABILITY: 30,
      });

      expect(result).toBe(202);
      expect(httpService.post).toHaveBeenCalledWith(
        `${mockWebhookUrl}crm.deal.add.json`,
        expect.objectContaining({
          fields: expect.objectContaining({
            TITLE: 'Deal for Nguyen Van A',
            STAGE_ID: 'NEW',
          }),
        }),
        expect.anything(),
      );
    });
  });

  describe('sendNotification', () => {
    it('should call im.notify.system.add to alert salesperson', async () => {
      (httpService.post as jest.Mock).mockReturnValue(
        of(createAxiosResponse({ result: 1 })),
      );

      const result = await service.sendNotification('1', 'New Deal converted from TikTok Lead!');
      expect(result).toBe(true);
      expect(httpService.post).toHaveBeenCalledWith(
        `${mockWebhookUrl}im.notify.system.add.json`,
        expect.objectContaining({
          USER_ID: '1',
          MESSAGE: 'New Deal converted from TikTok Lead!',
        }),
        expect.anything(),
      );
    });
  });
});
