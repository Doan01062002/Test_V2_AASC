import { Test, TestingModule } from '@nestjs/testing';
import { TikTokLeadConsumer } from './tiktok-lead.consumer';
import { TikTokService } from '../tiktok.service';
import { Bitrix24Service } from '../../bitrix24/bitrix24.service';
import { RuleEngineService } from '../../rules/rule-engine.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ConfigurationEntity } from '../../database/entities/configuration.entity';

import { getQueueToken } from '@nestjs/bullmq';
import { TIKTOK_LEADS_DLQ } from '../../queue/queue.constants';

describe('TikTokLeadConsumer', () => {
  let consumer: TikTokLeadConsumer;
  let tiktokService: any;
  let bitrix24Service: any;
  let ruleEngineService: any;
  let leadRepo: any;
  let configRepo: any;
  let dlqQueue: any;

  beforeEach(async () => {
    dlqQueue = {
      add: jest.fn().mockResolvedValue({ id: 'dlq-1' }),
    };

    tiktokService = {
      createPendingLead: jest.fn(),
      extractLeadInfo: jest.fn().mockReturnValue({
        externalId: 'evt_1',
        name: 'Nguyen Van A',
        phone: '0901234567',
        email: 'a@example.com',
        campaignId: 'Summer',
        adId: 'Ad1',
        formId: 'Form1',
        formName: 'Form Contact',
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
      addTimelineComment: jest.fn().mockResolvedValue(1),
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
        { provide: getQueueToken(TIKTOK_LEADS_DLQ), useValue: dlqQueue },
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

  it('should push to DLQ and mark lead failed when retries are exhausted', async () => {
    bitrix24Service.createLead.mockRejectedValue(new Error('Bitrix24 Connection Failed'));

    const job = {
      id: 'job-fail-dlq',
      opts: { attempts: 3 },
      attemptsMade: 2, // 2 + 1 >= 3 (last attempt)
      data: {
        leadId: 'lead-1',
        payload: { lead_data: { city: 'Da Nang' } },
      },
    } as any;

    await expect(consumer.process(job)).rejects.toThrow('Bitrix24 Connection Failed');
    expect(dlqQueue.add).toHaveBeenCalledWith(
      'failed-tiktok-lead',
      expect.objectContaining({
        leadId: 'lead-1',
        error: 'Bitrix24 Connection Failed',
      }),
    );
  });
});
