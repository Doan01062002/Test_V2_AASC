import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeadEntity } from '../database/entities/lead.entity';
import { DealEntity } from '../database/entities/deal.entity';
import { Repository } from 'typeorm';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let leadRepo: Repository<LeadEntity>;
  let dealRepo: Repository<DealEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(LeadEntity),
          useValue: {
            count: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DealEntity),
          useValue: {
            count: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    leadRepo = module.get<Repository<LeadEntity>>(getRepositoryToken(LeadEntity));
    dealRepo = module.get<Repository<DealEntity>>(getRepositoryToken(DealEntity));
  });

  describe('getConversionRates', () => {
    it('should calculate conversion rates and quality distribution accurately', async () => {
      const mockLeads = [
        { id: '1', qualityScore: 85, status: 'converted' },
        { id: '2', qualityScore: 60, status: 'converted' },
        { id: '3', qualityScore: 30, status: 'processed' },
        { id: '4', qualityScore: 90, status: 'new' },
      ] as LeadEntity[];

      const mockDeals = [
        { id: 'd1', stage: 'WON', amount: 10000000 },
        { id: 'd2', stage: 'NEW', amount: 5000000 },
      ] as DealEntity[];

      (leadRepo.find as jest.Mock).mockResolvedValue(mockLeads);
      (dealRepo.find as jest.Mock).mockResolvedValue(mockDeals);

      const result = await service.getConversionRates();

      expect(result.total_leads).toBe(4);
      expect(result.total_deals).toBe(2);
      expect(result.deals_won).toBe(1);
      expect(result.conversion_rate_lead_to_deal).toBe(50); // 2/4 * 100
      expect(result.conversion_rate_deal_to_won).toBe(50); // 1/2 * 100
      expect(result.quality_distribution.Hot).toBe(2); // 85, 90
      expect(result.quality_distribution.Warm).toBe(1); // 60
      expect(result.quality_distribution.Cold).toBe(1); // 30
    });
  });

  describe('exportReportsCsv', () => {
    it('should produce UTF-8 BOM CSV containing lead details', async () => {
      const mockLeads = [
        {
          id: 'lead-1',
          externalId: 'evt_123',
          name: 'Nguyễn Văn A',
          email: 'a@example.com',
          phone: '+84901234567',
          campaignId: 'Summer Campaign',
          qualityScore: 80,
          status: 'converted',
          bitrix24Id: 101,
          deals: [{ id: 'deal-1', bitrix24Id: 202 }],
          createdAt: new Date('2026-09-19T00:00:00Z'),
        },
      ] as any[];

      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockLeads),
      };

      (leadRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQb);

      const csv = await service.exportCsv('30d');
      expect(csv.startsWith('\uFEFF')).toBe(true); // UTF-8 BOM
      expect(csv).toContain('Nguyễn Văn A');
      expect(csv).toContain('+84901234567');
      expect(csv).toContain('Summer Campaign');
    });
  });

  describe('getCampaignPerformance', () => {
    it('should calculate campaign metrics, CPL and ROI accurately', async () => {
      const mockLeads = [
        {
          id: 'lead-1',
          campaignId: 'c1',
          rawData: { campaign: { campaign_id: 'c1', campaign_name: 'Summer Sale' } },
          deals: [{ id: 'd1', amount: 10000000, stage: 'WON' }],
        },
      ] as any[];

      (leadRepo.find as jest.Mock).mockResolvedValue(mockLeads);

      const res = await service.getCampaignPerformance();
      expect(res.length).toBe(1);
      expect(res[0].campaign_id).toBe('c1');
      expect(res[0].total_leads).toBe(1);
      expect(res[0].total_deals).toBe(1);
      expect(res[0].deals_won).toBe(1);
      expect(res[0].total_revenue).toBe(10000000);
      expect(res[0].cost_per_lead).toBe(50000);
    });
  });
});
