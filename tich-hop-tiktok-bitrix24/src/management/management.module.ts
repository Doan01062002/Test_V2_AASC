import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsController } from './leads.controller';
import { DealsController } from './deals.controller';
import { ConfigController } from './config.controller';
import { DashboardController } from './dashboard.controller';
import { LeadEntity } from '../database/entities/lead.entity';
import { DealEntity } from '../database/entities/deal.entity';
import { ConfigurationEntity } from '../database/entities/configuration.entity';
import { Bitrix24Module } from '../bitrix24/bitrix24.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeadEntity, DealEntity, ConfigurationEntity]),
    Bitrix24Module,
  ],
  controllers: [
    LeadsController,
    DealsController,
    ConfigController,
    DashboardController,
  ],
})
export class ManagementModule {}
