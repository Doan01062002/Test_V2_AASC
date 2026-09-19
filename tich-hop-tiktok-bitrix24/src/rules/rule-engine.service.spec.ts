import { Test, TestingModule } from '@nestjs/testing';
import { RuleEngineService } from './rule-engine.service';
import { Bitrix24Service } from '../bitrix24/bitrix24.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DealEntity } from '../database/entities/deal.entity';
import { ConfigurationEntity } from '../database/entities/configuration.entity';
import { Repository } from 'typeorm';

describe('RuleEngineService', () => {
  let service: RuleEngineService;
  let bitrix24Service: Bitrix24Service;
  let dealRepo: Repository<DealEntity>;
  let configRepo: Repository<ConfigurationEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleEngineService,
        {
          provide: Bitrix24Service,
          useValue: {
            createDeal: jest.fn().mockResolvedValue(999),
            updateLead: jest.fn().mockResolvedValue(true),
            addTimelineComment: jest.fn().mockResolvedValue(1),
            sendNotification: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: getRepositoryToken(DealEntity),
          useValue: {
            create: jest.fn((dto) => dto),
            save: jest.fn().mockImplementation((entity) =>
              Promise.resolve({ id: 'deal-uuid', ...entity }),
            ),
          },
        },
        {
          provide: getRepositoryToken(ConfigurationEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RuleEngineService>(RuleEngineService);
    bitrix24Service = module.get<Bitrix24Service>(Bitrix24Service);
    dealRepo = module.get<Repository<DealEntity>>(getRepositoryToken(DealEntity));
    configRepo = module.get<Repository<ConfigurationEntity>>(
      getRepositoryToken(ConfigurationEntity),
    );
  });

  describe('evaluateCondition', () => {
    const context = {
      campaign: {
        campaign_name: 'Spring Sale 2024',
      },
      lead_data: {
        city: 'Hà Nội',
      },
      quality_score: 85,
    };

    it('should evaluate CONTAINS correctly', () => {
      expect(
        service.evaluateCondition("campaign.campaign_name CONTAINS 'sale'", context),
      ).toBe(true);
      expect(
        service.evaluateCondition("campaign.campaign_name CONTAINS 'winter'", context),
      ).toBe(false);
    });

    it('should evaluate EQUALS correctly', () => {
      expect(
        service.evaluateCondition("lead_data.city EQUALS 'Hà Nội'", context),
      ).toBe(true);
      expect(
        service.evaluateCondition("lead_data.city EQUALS 'Đà Nẵng'", context),
      ).toBe(false);
    });

    it('should evaluate >, <, >=, <=, and != correctly', () => {
      expect(service.evaluateCondition('quality_score > 70', context)).toBe(true);
      expect(service.evaluateCondition('quality_score > 90', context)).toBe(false);
      expect(service.evaluateCondition('quality_score < 90', context)).toBe(true);
      expect(service.evaluateCondition('quality_score < 70', context)).toBe(false);
      expect(service.evaluateCondition('quality_score >= 85', context)).toBe(true);
      expect(service.evaluateCondition('quality_score <= 85', context)).toBe(true);
      expect(service.evaluateCondition("lead_data.city != 'Đà Nẵng'", context)).toBe(true);
      expect(service.evaluateCondition("lead_data.city != 'Hà Nội'", context)).toBe(false);
    });

    it('should evaluate IN correctly', () => {
      expect(
        service.evaluateCondition(
          "lead_data.city IN ['Hà Nội', 'TP. Hồ Chí Minh']",
          context,
        ),
      ).toBe(true);
      expect(
        service.evaluateCondition(
          "lead_data.city IN ['Đà Nẵng', 'Hải Phòng']",
          context,
        ),
      ).toBe(false);
    });
  });

  describe('processLeadRules', () => {
    it('should evaluate rules, create deal on Bitrix24 and in database, and notify user', async () => {
      const mockRules = [
        {
          id: 'rule_sale',
          name: 'Sale Rule',
          condition: "campaign.campaign_name CONTAINS 'sale'",
          action: 'create_deal',
          pipeline_id: '1',
          stage_id: 'NEW',
          probability: 30,
          assigned_to: '1',
          notify: true,
        },
      ];

      (configRepo.findOne as jest.Mock).mockResolvedValue({
        value: mockRules,
      });

      const lead = {
        id: 'lead-uuid',
        name: 'Nguyen Van A',
        bitrix24Id: 101,
        qualityScore: 85,
        rawData: {
          campaign: { campaign_name: 'Summer Sale' },
          lead_data: { city: 'Hà Nội' },
        },
      } as any;

      const createdDeals = await service.processLeadRules(lead);
      expect(createdDeals.length).toBe(1);
      expect(bitrix24Service.createDeal).toHaveBeenCalledWith(
        expect.objectContaining({
          TITLE: 'Deal - Nguyen Van A',
          STAGE_ID: 'NEW',
          CATEGORY_ID: '1',
          LEAD_ID: 101,
        }),
      );
      expect(bitrix24Service.sendNotification).toHaveBeenCalledWith(
        '1',
        expect.stringContaining('Nguyen Van A'),
        expect.objectContaining({ type: 'deal', id: 999 }),
      );
    });
  });
});
