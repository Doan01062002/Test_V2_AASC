import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TikTokController } from './tiktok.controller';
import { TikTokService } from './tiktok.service';
import { TikTokSignatureGuard } from './guards/tiktok-signature.guard';
import { TikTokLeadConsumer } from './consumers/tiktok-lead.consumer';
import { LeadEntity } from '../database/entities/lead.entity';
import { ConfigurationEntity } from '../database/entities/configuration.entity';
import { Bitrix24Module } from '../bitrix24/bitrix24.module';
import { RuleEngineModule } from '../rules/rule-engine.module';
import { TIKTOK_LEADS_QUEUE, TIKTOK_LEADS_DLQ } from '../queue/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeadEntity, ConfigurationEntity]),
    BullModule.registerQueue(
      {
        name: TIKTOK_LEADS_QUEUE,
      },
      {
        name: TIKTOK_LEADS_DLQ,
      },
    ),
    Bitrix24Module,
    RuleEngineModule,
  ],
  controllers: [TikTokController],
  providers: [TikTokService, TikTokLeadConsumer, TikTokSignatureGuard],
  exports: [TikTokService],
})
export class TikTokModule {}
