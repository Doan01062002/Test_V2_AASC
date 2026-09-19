import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { Bitrix24Module } from './bitrix24/bitrix24.module';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { SyncModule } from './sync/sync.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    DatabaseModule,
    GoogleSheetsModule,
    Bitrix24Module,
    SyncModule,
    WebhookModule,
    AdminModule,
  ],
})
export class AppModule {}
