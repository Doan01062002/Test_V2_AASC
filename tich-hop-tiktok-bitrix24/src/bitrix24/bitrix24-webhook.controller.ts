import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DealEntity } from '../database/entities/deal.entity';
import { Bitrix24Service } from './bitrix24.service';

@ApiTags('Webhooks')
@Controller('webhooks/bitrix24')
export class Bitrix24WebhookController {
  private readonly logger = new Logger(Bitrix24WebhookController.name);

  constructor(
    private readonly bitrix24Service: Bitrix24Service,
    @InjectRepository(DealEntity)
    private readonly dealRepository: Repository<DealEntity>,
  ) {}

  @Post('deals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Bitrix24 Deal status update webhook',
    description:
      'Receives webhook updates when a Deal stage or details change in Bitrix24 CRM.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bitrix24 webhook processed successfully',
  })
  async handleDealWebhook(@Body() payload: any) {
    this.logger.log(`Received Bitrix24 webhook: ${JSON.stringify(payload)}`);

    const dealId =
      payload?.data?.FIELDS?.ID ||
      payload?.['data[FIELDS][ID]'] ||
      payload?.document_id?.[2] ||
      payload?.ID ||
      payload?.id;

    if (dealId) {
      const bitrix24Id = parseInt(dealId, 10);
      try {
        const dealData = await this.bitrix24Service.getDeal(bitrix24Id);
        if (dealData) {
          let deal = await this.dealRepository.findOne({
            where: { bitrix24Id },
            relations: ['lead'],
          });

          if (deal) {
            deal.stage = dealData.STAGE_ID || deal.stage;
            deal.amount = dealData.OPPORTUNITY
              ? parseFloat(dealData.OPPORTUNITY)
              : deal.amount;
            deal.probability = dealData.PROBABILITY
              ? parseInt(dealData.PROBABILITY, 10)
              : deal.probability;
            await this.dealRepository.save(deal);
            this.logger.log(
              `Updated local Deal ${deal.id} for Bitrix24 Deal ${bitrix24Id} to stage ${deal.stage}`,
            );

            const isWon =
              deal.stage.toUpperCase().includes('WON') ||
              deal.stage.toUpperCase() === 'SUCCESS';
            if (isWon) {
              await this.bitrix24Service.addTimelineComment(
                'deal',
                bitrix24Id,
                `🎉 [Deal Won] Chốt đơn thành công với giá trị ${deal.amount} ${deal.currency}. Đã kích hoạt Conversion Event!`,
              );
            }
          }
        }
      } catch (err) {
        this.logger.warn(
          `Could not sync deal ${dealId} from Bitrix24: ${(err as Error).message}`,
        );
      }
    }

    return {
      success: true,
      message: 'Bitrix24 deal webhook received',
    };
  }
}
