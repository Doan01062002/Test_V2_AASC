import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { LeadEntity } from '../database/entities/lead.entity';
import { DealEntity } from '../database/entities/deal.entity';
import { Bitrix24Service } from '../bitrix24/bitrix24.service';
import { TikTokService } from '../tiktok/tiktok.service';
import { TIKTOK_LEADS_QUEUE, PROCESS_TIKTOK_LEAD } from '../queue/queue.constants';

import { GetLeadsQueryDto } from './dto/get-leads.dto';
import { ConvertLeadToDealDto } from './dto/convert-deal.dto';

@ApiTags('Management')
@Controller('api/v1/leads')
export class LeadsController {
  private readonly logger = new Logger(LeadsController.name);

  constructor(
    @InjectRepository(LeadEntity)
    private readonly leadRepository: Repository<LeadEntity>,
    @InjectRepository(DealEntity)
    private readonly dealRepository: Repository<DealEntity>,
    private readonly bitrix24Service: Bitrix24Service,
    private readonly tiktokService: TikTokService,
    @InjectQueue(TIKTOK_LEADS_QUEUE)
    private readonly leadsQueue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of leads' })
  @ApiResponse({ status: 200, description: 'Return paginated leads' })
  async getLeads(
    @Query() query?: GetLeadsQueryDto | number,
    legacyLimit?: number,
    legacySource?: string,
    legacyStatus?: string,
  ) {
    let page = 1;
    let limit = 10;
    let source: string | undefined;
    let status: string | undefined;

    if (typeof query === 'number' || typeof (query as any) === 'string') {
      page = Number(query) || 1;
      limit = Number(legacyLimit) || 10;
      source = legacySource;
      status = legacyStatus;
    } else if (query) {
      page = Number(query.page) || 1;
      limit = Number(query.limit) || 10;
      source = query.source;
      status = query.status;
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));

    const qb = this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.deals', 'deals');

    if (source) {
      qb.andWhere('lead.source = :source', { source });
    }
    if (status) {
      qb.andWhere('lead.status = :status', { status });
    }

    qb.orderBy('lead.createdAt', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  @Post(':id/convert-to-deal')
  @ApiOperation({ summary: 'Manually convert a lead to deal' })
  @ApiResponse({ status: 200, description: 'Lead successfully converted to deal' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async convertToDeal(
    @Param('id') id: string,
    @Body() body?: ConvertLeadToDealDto,
  ) {
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: ['deals'],
    });

    if (!lead) {
      throw new NotFoundException(`Lead with id ${id} not found`);
    }

    const title = body?.title || `Deal - ${lead.name}`;
    const stageId = body?.stage_id || 'NEW';
    const pipelineId = body?.pipeline_id || '0';
    const amount = body?.amount || 0;
    const assignedTo = body?.assigned_to || '1';

    let bitrixDealId: number | null = null;
    try {
      bitrixDealId = await this.bitrix24Service.createDeal({
        TITLE: title,
        STAGE_ID: stageId,
        CATEGORY_ID: pipelineId,
        LEAD_ID: lead.bitrix24Id || undefined,
        OPPORTUNITY: amount,
        ASSIGNED_BY_ID: assignedTo,
        CURRENCY_ID: 'VND',
        COMMENTS: `Manually converted from Lead ID: ${lead.id}`,
      });
    } catch (err) {
      this.logger.warn(`Could not create Deal on Bitrix24: ${(err as Error).message}`);
    }

    const deal = this.dealRepository.create({
      leadId: lead.id,
      lead,
      bitrix24Id: bitrixDealId || undefined,
      title,
      stage: stageId,
      amount,
      currency: 'VND',
      assignedTo,
      probability: 50,
    });

    const savedDeal = await this.dealRepository.save(deal);

    lead.status = 'converted';
    await this.leadRepository.save(lead);

    // Update Bitrix24 Lead status to CONVERTED and log timeline comments
    if (lead.bitrix24Id) {
      try {
        await this.bitrix24Service.updateLead(lead.bitrix24Id, {
          STATUS_ID: 'CONVERTED',
        });
        await this.bitrix24Service.addTimelineComment(
          'lead',
          lead.bitrix24Id,
          `[Chuyển Đổi Thành Deal] Đã chuyển đổi thủ công thành Deal #${bitrixDealId || 'Local'}: "${title}"`,
        );
      } catch (err) {
        this.logger.warn(`Failed to update lead status on Bitrix24: ${(err as Error).message}`);
      }
    }

    if (bitrixDealId) {
      await this.bitrix24Service.addTimelineComment(
        'deal',
        bitrixDealId,
        `[Deal Tạo Thủ Công] Chuyển đổi từ Lead ID: ${lead.id} (${lead.name})`,
      );
    }

    // Trigger conversion event back to TikTok
    try {
      await this.tiktokService.sendConversionEvent({
        eventName: 'CompleteRegistration',
        leadId: lead.id,
        dealId: savedDeal.id,
        email: lead.email,
        phone: lead.phone,
        value: amount,
        currency: 'VND',
      });
    } catch (err) {
      this.logger.warn(`Could not send conversion event to TikTok: ${(err as Error).message}`);
    }

    try {
      await this.bitrix24Service.sendNotification(
        assignedTo,
        `[Lead Converted] Lead ${lead.name} đã được chuyển đổi thành Deal: "${title}"!`,
        bitrixDealId ? { type: 'deal', id: bitrixDealId } : undefined,
      );
    } catch (err) {
      // Ignored
    }

    return savedDeal;
  }

  @Post('batch')
  @ApiOperation({
    summary: 'Batch processing for historical lead migration',
    description: 'Accepts an array of historical TikTok leads and queues them for processing',
  })
  @ApiResponse({ status: 200, description: 'Batch leads queued successfully' })
  async batchImportLeads(@Body() body: { leads: any[] }) {
    const leadsList = Array.isArray(body?.leads) ? body.leads : [];
    const batchId = `batch_${Date.now()}`;
    let queued = 0;

    for (const item of leadsList) {
      const lead = await this.tiktokService.createPendingLead(item);
      const dynamicJobId = `${lead.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await this.leadsQueue.add(
        PROCESS_TIKTOK_LEAD,
        {
          leadId: lead.id,
          payload: item,
          batchId,
        },
        {
          jobId: dynamicJobId,
        },
      );
      queued++;
    }

    this.logger.log(`Queued ${queued} historical leads in batch ${batchId}`);

    return {
      success: true,
      batch_id: batchId,
      total_received: leadsList.length,
      queued,
      message: `Đã đưa ${queued} lead lịch sử vào hàng đợi xử lý ngầm (BullMQ).`,
    };
  }
}
