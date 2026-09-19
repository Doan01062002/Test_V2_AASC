import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TikTokSignatureGuard } from './guards/tiktok-signature.guard';
import { TikTokService } from './tiktok.service';
import {
  TIKTOK_LEADS_QUEUE,
  PROCESS_TIKTOK_LEAD,
} from '../queue/queue.constants';

@ApiTags('Webhooks')
@Controller('webhooks/tiktok')
export class TikTokController {
  private readonly logger = new Logger(TikTokController.name);

  constructor(
    private readonly tiktokService: TikTokService,
    @InjectQueue(TIKTOK_LEADS_QUEUE)
    private readonly leadsQueue: Queue,
  ) {}

  @Post('leads')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TikTokSignatureGuard)
  @ApiOperation({
    summary: 'Receive TikTok Lead Generation webhook',
    description:
      'Receives lead events from TikTok Lead Generation Forms, stores raw data, and queues for async processing.',
  })
  @ApiHeader({
    name: 'TikTok-Signature',
    description: 'HMAC-SHA256 signature of request payload',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook received and queued successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing signature' })
  async handleLeadWebhook(@Body() payload: any) {
    this.logger.log(
      `Received TikTok webhook event: ${payload?.event || 'lead.generate'}`,
    );

    const lead = await this.tiktokService.createPendingLead(payload);

    await this.leadsQueue.add(
      PROCESS_TIKTOK_LEAD,
      {
        leadId: lead.id,
        payload,
      },
      {
        jobId: lead.id,
      },
    );

    return {
      success: true,
      message: 'Webhook received and queued for processing',
      event_id: payload.event_id || lead.externalId,
      lead_id: lead.id,
    };
  }
}
