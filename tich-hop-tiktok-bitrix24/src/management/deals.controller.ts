import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DealEntity } from '../database/entities/deal.entity';

import { GetDealsQueryDto } from './dto/get-deals.dto';

@ApiTags('Management')
@Controller('api/v1/deals')
export class DealsController {
  constructor(
    @InjectRepository(DealEntity)
    private readonly dealRepository: Repository<DealEntity>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get list of deals with filtering' })
  @ApiResponse({ status: 200, description: 'Return paginated deals' })
  async getDeals(
    @Query() query?: GetDealsQueryDto | number,
    legacyLimit?: number,
    legacyStatus?: string,
    legacyAssignedTo?: string,
  ) {
    let page = 1;
    let limit = 10;
    let status: string | undefined;
    let assignedTo: string | undefined;

    if (typeof query === 'number' || typeof (query as any) === 'string') {
      page = Number(query) || 1;
      limit = Number(legacyLimit) || 10;
      status = legacyStatus;
      assignedTo = legacyAssignedTo;
    } else if (query) {
      page = Number(query.page) || 1;
      limit = Number(query.limit) || 10;
      status = query.status;
      assignedTo = query.assigned_to;
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));

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
