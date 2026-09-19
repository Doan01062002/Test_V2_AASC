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
import { LeadEntity } from '../database/entities/lead.entity';
import { DealEntity } from '../database/entities/deal.entity';
import { Bitrix24Service } from '../bitrix24/bitrix24.service';

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
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of leads' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'source', required: false, type: String, example: 'tiktok' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Return paginated leads' })
  async getLeads(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('source') source?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));

    const qb = this.leadRepository.createQueryBuilder('lead')
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
    @Body()
    body?: {
      pipeline_id?: string;
      stage_id?: string;
      title?: string;
      amount?: number;
      assigned_to?: string;
    },
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

    try {
      await this.bitrix24Service.sendNotification(
        assignedTo,
        `[Lead Converted] Lead ${lead.name} đã được chuyển đổi thành Deal: "${title}"!`,
      );
    } catch (err) {
      // Ignored
    }

    return savedDeal;
  }
}
