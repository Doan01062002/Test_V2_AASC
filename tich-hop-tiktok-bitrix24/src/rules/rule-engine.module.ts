import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RuleEngineService } from './rule-engine.service';
import { Bitrix24Module } from '../bitrix24/bitrix24.module';
import { DealEntity } from '../database/entities/deal.entity';
import { ConfigurationEntity } from '../database/entities/configuration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DealEntity, ConfigurationEntity]),
    Bitrix24Module,
  ],
  providers: [RuleEngineService],
  exports: [RuleEngineService],
})
export class RuleEngineModule {}
