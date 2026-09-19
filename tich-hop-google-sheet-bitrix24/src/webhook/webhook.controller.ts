import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { BitrixWebhookPayload, WebhookService } from './webhook.service';

@Controller('api/webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('bitrix24')
  @HttpCode(HttpStatus.OK)
  async handleBitrix24Webhook(@Body() payload: BitrixWebhookPayload) {
    return this.webhookService.handleBitrixLeadEvent(payload);
  }
}
