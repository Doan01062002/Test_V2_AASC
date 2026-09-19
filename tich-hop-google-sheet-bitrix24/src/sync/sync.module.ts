import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bitrix24Module } from '../bitrix24/bitrix24.module';
import { MappingConfig } from '../database/entities/mapping-config.entity';
import { SyncHash } from '../database/entities/sync-hash.entity';
import { SyncLog } from '../database/entities/sync-log.entity';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { ConflictResolverService } from './conflict-resolver.service';
import { DataTransformerService } from './data-transformer.service';
import { SyncEngineService } from './sync-engine.service';
import { SyncSchedulerService } from './sync-scheduler.service';
import { SyncController } from './sync.controller';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([SyncLog, SyncHash, MappingConfig]),
    GoogleSheetsModule,
    Bitrix24Module,
  ],
  controllers: [SyncController],
  providers: [
    DataTransformerService,
    ConflictResolverService,
    SyncEngineService,
    SyncSchedulerService,
  ],
  exports: [SyncEngineService, DataTransformerService, ConflictResolverService],
})
export class SyncModule {}
