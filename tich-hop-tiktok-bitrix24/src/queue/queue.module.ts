import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  TIKTOK_LEADS_QUEUE,
  TIKTOK_LEADS_DLQ,
  DEFAULT_QUEUE_JOB_OPTIONS,
} from './queue.constants';

import { QueueController } from './queue.controller';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
        },
        defaultJobOptions: DEFAULT_QUEUE_JOB_OPTIONS,
      }),
    }),
    BullModule.registerQueue(
      {
        name: TIKTOK_LEADS_QUEUE,
      },
      {
        name: TIKTOK_LEADS_DLQ,
      },
    ),
  ],
  controllers: [QueueController],
  exports: [BullModule],
})
export class QueueModule {}
