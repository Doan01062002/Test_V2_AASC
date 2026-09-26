import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { RedisCacheModule } from './cache/redis-cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: config.get<number>('rateLimit.ttl', 60000),
          limit: config.get<number>('rateLimit.limit', 100),
        },
      ],
    }),
    RedisCacheModule,
    DatabaseModule,
    QueueModule,
    TikTokModule,
    Bitrix24Module,
    RuleEngineModule,
    ManagementModule,
    AnalyticsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

