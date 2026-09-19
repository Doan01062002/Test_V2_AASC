import { Test, TestingModule } from '@nestjs/testing';
import { TikTokLeadConsumer } from './tiktok-lead.consumer';
import { TikTokService } from '../tiktok.service';
import { Bitrix24Service } from '../../bitrix24/bitrix24.service';
import { RuleEngineService } from '../../rules/rule-engine.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ConfigurationEntity } from '../../database/entities/configuration.entity';

describe('TikTokLeadConsumer', () => {
  let consumer: TikTokLeadConsumer;
  let tiktokService: any;
  let bitrix24Service: any;
  let ruleEngineService: any;
  let leadRepo: any;
  let configRepo: any;

  beforeEach(async () => {
    tiktokService = {
      createPendingLead: jest.fn(),
      extractLeadInfo: jest.fn().mockReturnValue({
        externalId: 'evt_1',
        name: 'Nguyen Van A',
        phone: '0901234567',
        email: 'a@example.com',
        campaignId: 'Summer',
        adId: 'Ad1',
        city: 'Ha Noi',
        customQuestions: [],
        rawData: {},
      }),
      normalizePhone: jest.fn().mockReturnValue('+84901234567'),
      normalizeEmail: jest.fn().mockReturnValue('a@example.com'),
      calculateQualityScore: jest.fn().mockReturnValue({ score: 85, classification: 'Hot' }),
      findDuplicate: jest.fn().mockResolvedValue(null),
    };

    bitrix24Service = {
      findLeadByEmailOrPhone: jest.fn().mockResolvedValue(null),
      createLead: jest.fn().mockResolvedValue(101),
      updateLead: jest.fn().mockResolvedValue(true),
    };

    ruleEngineService = {
      processLeadRules: jest.fn().mockResolvedValue([{ id: 'deal-1' }]),
    };

    leadRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'lead-1',
        name: 'Nguyen Van A',
        status: 'pending',
      }),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    configRepo = {
      findOne: jest.fn().mockResolvedValue({
        key: 'field_mapping',
        value: { 'lead_data.city': 'UF_CRM_CITY' },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TikTokLeadConsumer,
        { provide: TikTokService, useValue: tiktokService },
        { provide: Bitrix24Service, useValue: bitrix24Service },
        { provide: RuleEngineService, useValue: ruleEngineService },
        { provide: getRepositoryToken(LeadEntity), useValue: leadRepo },
        { provide: getRepositoryToken(ConfigurationEntity), useValue: configRepo },
      ],
    }).compile();

    consumer = module.get<TikTokLeadConsumer>(TikTokLeadConsumer);
  });

  it('should process job, normalize data, create lead on Bitrix24, and convert deal', async () => {
    const job = {
      id: 'job-1',
      data: {
        leadId: 'lead-1',
        payload: {
          lead_data: { city: 'Ha Noi' },
        },
      },
    } as any;

    const res = await consumer.process(job);

    expect(res.leadId).toBe('lead-1');
    expect(res.bitrix24Id).toBe(101);
    expect(res.dealsCreated).toBe(1);
    expect(res.status).toBe('converted');
    expect(bitrix24Service.createLead).toHaveBeenCalled();
    expect(ruleEngineService.processLeadRules).toHaveBeenCalled();
  });
});
