import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { LeadEntity } from '../database/entities/lead.entity';
import { DealEntity } from '../database/entities/deal.entity';

import { Bitrix24Module } from '../bitrix24/bitrix24.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeadEntity, DealEntity]),
    Bitrix24Module,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
