import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Response } from 'express';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: {
            getConversionRates: jest.fn().mockResolvedValue({ total_leads: 10 }),
            getCampaignPerformance: jest.fn().mockResolvedValue([{ campaign_id: 'c1' }]),
            exportCsv: jest.fn().mockResolvedValue('\uFEFFheader1,header2'),
            exportJsonReport: jest.fn().mockResolvedValue({ total_leads: 10, leads: [] }),
            getScheduledReportSummary: jest.fn().mockResolvedValue({ status: 'healthy' }),
            triggerAutomatedAlert: jest.fn().mockResolvedValue({ alert_triggered: true }),
          },
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should return conversion rates', async () => {
    const res = await controller.getConversionRates();
    expect(res).toEqual({ total_leads: 10 });
    expect(service.getConversionRates).toHaveBeenCalled();
  });

  it('should return campaign performance', async () => {
    const res = await controller.getCampaignPerformance();
    expect(res).toEqual([{ campaign_id: 'c1' }]);
    expect(service.getCampaignPerformance).toHaveBeenCalled();
  });

  it('should export csv report', async () => {
    const mockRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    await controller.exportReport('csv', '30d', mockRes);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('should export json report', async () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    await controller.exportReport('json', '30d', mockRes);
    expect(mockRes.json).toHaveBeenCalled();
  });
});
