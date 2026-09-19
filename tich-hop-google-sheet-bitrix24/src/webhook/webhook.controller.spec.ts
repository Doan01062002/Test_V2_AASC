import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

describe('WebhookController', () => {
  let controller: WebhookController;
  let mockWebhookService: any;

  beforeEach(async () => {
    mockWebhookService = {
      handleBitrixLeadEvent: jest.fn().mockResolvedValue({ status: 'UPDATED' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [{ provide: WebhookService, useValue: mockWebhookService }],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
  });

  it('should pass webhook payload to service', async () => {
    const payload = {
      event: 'ONCRMLEADUPDATE',
      data: { FIELDS: { ID: 123 } },
    };

    const res = await controller.handleBitrix24Webhook(payload);
    expect(res).toEqual({ status: 'UPDATED' });
    expect(mockWebhookService.handleBitrixLeadEvent).toHaveBeenCalledWith(payload);
  });
});
