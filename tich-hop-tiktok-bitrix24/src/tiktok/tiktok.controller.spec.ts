import { Test, TestingModule } from '@nestjs/testing';
import { TikTokController } from './tiktok.controller';
import { TikTokService } from './tiktok.service';
import { getQueueToken } from '@nestjs/bullmq';
import { TIKTOK_LEADS_QUEUE } from '../queue/queue.constants';
import { ConfigService } from '@nestjs/config';

describe('TikTokController', () => {
  let controller: TikTokController;
  let tiktokService: any;
  let queue: any;

  beforeEach(async () => {
    tiktokService = {
      createPendingLead: jest.fn().mockResolvedValue({
        id: 'lead-123',
        externalId: 'evt_123',
      }),
      classifyEvent: jest.fn().mockReturnValue('lead_submission'),
      sendConversionEvent: jest.fn().mockResolvedValue({
        success: true,
        event: 'Purchase',
        status: 'synced_to_tiktok',
      }),
    };

    queue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TikTokController],
      providers: [
        {
          provide: TikTokService,
          useValue: tiktokService,
        },
        {
          provide: getQueueToken(TIKTOK_LEADS_QUEUE),
          useValue: queue,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(true), // bypass signature for controller tests
          },
        },
      ],
    }).compile();

    controller = module.get<TikTokController>(TikTokController);
  });

  it('should handle webhook, create pending lead and queue job', async () => {
    const payload = { event: 'lead.generate', event_id: 'evt_123' };
    const res = await controller.handleLeadWebhook(payload);

    expect(res.success).toBe(true);
    expect(res.lead_id).toBe('lead-123');
    expect(tiktokService.createPendingLead).toHaveBeenCalledWith(payload);
    expect(queue.add).toHaveBeenCalled();
  });

  it('should handle conversion event dispatch to TikTok', async () => {
    const res = await controller.handleConversionEvent({
      eventName: 'Purchase',
      value: 5000000,
      currency: 'VND',
    });

    expect(res.success).toBe(true);
    expect(tiktokService.sendConversionEvent).toHaveBeenCalled();
  });
});
