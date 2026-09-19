import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { MappingConfig } from '../database/entities/mapping-config.entity';
import { SyncLog } from '../database/entities/sync-log.entity';
import { SyncEngineService } from '../sync/sync-engine.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(SyncLog)
    private readonly syncLogRepo: Repository<SyncLog>,
    @InjectRepository(MappingConfig)
    private readonly mappingConfigRepo: Repository<MappingConfig>,
    private readonly syncEngine: SyncEngineService,
  ) {}

  async getStats() {
    const logs = await this.syncLogRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let totalSkipped = 0;

    for (const log of logs) {
      totalCreated += log.createdCount || 0;
      totalUpdated += log.updatedCount || 0;
      totalErrors += log.errorCount || 0;
      totalSkipped += log.skippedCount || 0;
    }

    const lastLog = logs[0] || null;

    return {
      totalRuns: logs.length,
      totalCreated,
      totalUpdated,
      totalSkipped,
      totalErrors,
      lastSyncAt: lastLog?.createdAt || null,
      lastSyncStatus: lastLog?.status || 'NONE',
      isRunning: this.syncEngine.isRunning(),
    };
  }

  async getLogs(limit = 50): Promise<SyncLog[]> {
    return this.syncLogRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getMapping(): Promise<any> {
    const dbConfig = await this.mappingConfigRepo.findOne({ where: { configKey: 'default_mapping' } });
    if (dbConfig && dbConfig.configJson) {
      try {
        return JSON.parse(dbConfig.configJson);
      } catch (e) {}
    }

    const filePath = path.resolve(process.cwd(), 'mapping.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }

    return { fields: [] };
  }

  async updateMapping(mappingData: any): Promise<any> {
    const jsonStr = typeof mappingData === 'string' ? mappingData : JSON.stringify(mappingData, null, 2);
    let dbConfig = await this.mappingConfigRepo.findOne({ where: { configKey: 'default_mapping' } });

    if (!dbConfig) {
      dbConfig = this.mappingConfigRepo.create({
        configKey: 'default_mapping',
        configJson: jsonStr,
      });
    } else {
      dbConfig.configJson = jsonStr;
    }

    await this.mappingConfigRepo.save(dbConfig);

    // Also update local file if writable and not in test environment
    if (process.env.NODE_ENV !== 'test') {
      try {
        const filePath = path.resolve(process.cwd(), 'mapping.json');
        fs.writeFileSync(filePath, jsonStr, 'utf-8');
      } catch (e: any) {
        this.logger.warn(`Could not overwrite mapping.json: ${e.message}`);
      }
    }

    return { success: true, message: 'Mapping updated successfully' };
  }
}
