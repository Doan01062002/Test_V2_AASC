import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bitrix24Module } from '../bitrix24/bitrix24.module';
import { SyncHash } from '../database/entities/sync-hash.entity';
import { SyncLog } from '../database/entities/sync-log.entity';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { SyncModule } from '../sync/sync.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([SyncHash, SyncLog]),
    Bitrix24Module,
    GoogleSheetsModule,
    SyncModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
