import { Test, TestingModule } from '@nestjs/testing';
import { Bitrix24WebhookController } from './bitrix24-webhook.controller';
import { Bitrix24Service } from './bitrix24.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DealEntity } from '../database/entities/deal.entity';

describe('Bitrix24WebhookController', () => {
  let controller: Bitrix24WebhookController;
  let dealRepo: any;
  let bitrix24Service: Bitrix24Service;

  beforeEach(async () => {
    dealRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [Bitrix24WebhookController],
      providers: [
        {
          provide: Bitrix24Service,
          useValue: {
            getDeal: jest.fn().mockResolvedValue({
              ID: '123',
              STAGE_ID: 'WON',
              OPPORTUNITY: '15000000',
              PROBABILITY: '100',
            }),
          },
        },
        {
          provide: getRepositoryToken(DealEntity),
          useValue: dealRepo,
        },
      ],
    }).compile();

    controller = module.get<Bitrix24WebhookController>(Bitrix24WebhookController);
    bitrix24Service = module.get<Bitrix24Service>(Bitrix24Service);
  });

  it('should process deal webhook and update local deal', async () => {
    const mockDeal = {
      id: 'local-deal-1',
      bitrix24Id: 123,
      stage: 'NEW',
      amount: 0,
      probability: 30,
    };
    dealRepo.findOne.mockResolvedValue(mockDeal);

    const payload = {
      event: 'ONCRMDEALUPDATE',
      data: { FIELDS: { ID: '123' } },
    };

    const res = await controller.handleDealWebhook(payload);
    expect(res.success).toBe(true);
    expect(mockDeal.stage).toBe('WON');
    expect(mockDeal.amount).toBe(15000000);
    expect(mockDeal.probability).toBe(100);
    expect(dealRepo.save).toHaveBeenCalledWith(mockDeal);
  });
});
