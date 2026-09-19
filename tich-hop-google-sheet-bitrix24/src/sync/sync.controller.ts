import { Body, Controller, Get, Post } from '@nestjs/common';
import { SyncTriggerType } from '../database/entities/sync-log.entity';
import { SyncEngineService, SyncOptions, SyncSummary } from './sync-engine.service';

export class TriggerSyncDto {
  full?: boolean;
  dryRun?: boolean;
  sheetName?: string;
  spreadsheetId?: string;
}

@Controller('api/sync')
export class SyncController {
  constructor(private readonly syncEngine: SyncEngineService) {}

  @Post('trigger')
  async triggerSync(@Body() dto: TriggerSyncDto): Promise<SyncSummary> {
    const options: SyncOptions = {
      forceFullSync: Boolean(dto?.full),
      dryRun: Boolean(dto?.dryRun),
      sheetName: dto?.sheetName,
      spreadsheetId: dto?.spreadsheetId,
      triggerType: SyncTriggerType.MANUAL,
    };
    return this.syncEngine.executeSync(options);
  }

  @Get('status')
  async getStatus() {
    return {
      isRunning: this.syncEngine.isRunning(),
    };
  }
}
