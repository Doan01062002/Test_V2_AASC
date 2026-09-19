import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { SyncTriggerType } from '../database/entities/sync-log.entity';
import { SyncEngineService } from './sync-engine.service';

@Injectable()
export class SyncSchedulerService {
  private readonly logger = new Logger(SyncSchedulerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly syncEngine: SyncEngineService,
  ) {}

  @Cron(process.env.SYNC_CRON_SCHEDULE || '*/15 * * * *')
  async handleCron() {
    this.logger.log('Cron scheduler triggered automated sync.');
    try {
      await this.syncEngine.executeSync({
        triggerType: SyncTriggerType.CRON,
      });
    } catch (err: any) {
      this.logger.error(`Cron sync error: ${err.message}`);
    }
  }
}
