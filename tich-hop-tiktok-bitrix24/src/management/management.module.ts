import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsController } from './leads.controller';
import { DealsController } from './deals.controller';
import { ConfigController } from './config.controller';
import { DashboardController } from './dashboard.controller';
import { LeadEntity } from '../database/entities/lead.entity';
import { DealEntity } from '../database/entities/deal.entity';
import { ConfigurationEntity } from '../database/entities/configuration.entity';
import { BullModule } from '@nestjs/bullmq';
import { Bitrix24Module } from '../bitrix24/bitrix24.module';
import { TikTokModule } from '../tiktok/tiktok.module';
import { TIKTOK_LEADS_QUEUE } from '../queue/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeadEntity, DealEntity, ConfigurationEntity]),
    Bitrix24Module,
    TikTokModule,
    BullModule.registerQueue({
      name: TIKTOK_LEADS_QUEUE,
    }),
  ],
  controllers: [
    LeadsController,
    DealsController,
    ConfigController,
    DashboardController,
  ],
})
export class ManagementModule {}
