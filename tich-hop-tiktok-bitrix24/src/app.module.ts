import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { TikTokModule } from './tiktok/tiktok.module';
import { Bitrix24Module } from './bitrix24/bitrix24.module';
import { RuleEngineModule } from './rules/rule-engine.module';
import { ManagementModule } from './management/management.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    DatabaseModule,
    QueueModule,
    TikTokModule,
    Bitrix24Module,
    RuleEngineModule,
    ManagementModule,
    AnalyticsModule,
    HealthModule,
  ],
})
export class AppModule {}
