import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bitrix24Service } from './bitrix24.service';
import { Bitrix24WebhookController } from './bitrix24-webhook.controller';
import { DealEntity } from '../database/entities/deal.entity';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([DealEntity]),
  ],
  controllers: [Bitrix24WebhookController],
  providers: [Bitrix24Service],
  exports: [Bitrix24Service],
})
export class Bitrix24Module {}
