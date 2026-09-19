import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DealEntity } from '../database/entities/deal.entity';

@ApiTags('Management')
@Controller('api/v1/deals')
export class DealsController {
  constructor(
    @InjectRepository(DealEntity)
    private readonly dealRepository: Repository<DealEntity>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get list of deals with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: "'open' for active deals, or specific stage name",
  })
  @ApiQuery({ name: 'assigned_to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Return paginated deals' })
  async getDeals(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('assigned_to') assignedTo?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));

    const qb = this.dealRepository.createQueryBuilder('deal')
      .leftJoinAndSelect('deal.lead', 'lead');

    if (status) {
      if (status.toLowerCase() === 'open') {
        qb.andWhere('deal.stage NOT IN (:...closedStages)', {
          closedStages: ['WON', 'LOST', 'LOSE', 'APOLOGY'],
        });
      } else {
        qb.andWhere('deal.stage = :status', { status });
      }
    }

    if (assignedTo) {
      qb.andWhere('deal.assignedTo = :assignedTo', { assignedTo });
    }

    qb.orderBy('deal.createdAt', 'DESC')
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
}
