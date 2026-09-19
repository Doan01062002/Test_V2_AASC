import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MappingConfig } from '../database/entities/mapping-config.entity';
import { SyncLog } from '../database/entities/sync-log.entity';
import { SyncModule } from '../sync/sync.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncLog, MappingConfig]),
    SyncModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
