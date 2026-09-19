import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { Bitrix24Service } from '../bitrix24/bitrix24.service';
import { MappingConfig } from '../database/entities/mapping-config.entity';
import { SyncHash } from '../database/entities/sync-hash.entity';
import { SyncJobStatus, SyncLog, SyncTriggerType } from '../database/entities/sync-log.entity';
import { TrackingUpdate } from '../google-sheets/google-sheets.interface';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { ConflictResolverService } from './conflict-resolver.service';
import { DataTransformerService } from './data-transformer.service';

export interface SyncOptions {
  forceFullSync?: boolean;
  dryRun?: boolean;
  triggerType?: SyncTriggerType;
  spreadsheetId?: string;
  sheetName?: string;
}

export interface SyncErrorItem {
  rowNumber: number;
  leadTitle?: string;
  error: string;
}

export interface SyncSummary {
  jobId: string;
  triggerType: SyncTriggerType;
  status: SyncJobStatus;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: SyncErrorItem[];
  durationMs: number;
}

@Injectable()
export class SyncEngineService {
  private readonly logger = new Logger(SyncEngineService.name);
  private isSyncRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly bitrix24Service: Bitrix24Service,
    private readonly dataTransformer: DataTransformerService,
    private readonly conflictResolver: ConflictResolverService,
    @InjectRepository(SyncLog)
    private readonly syncLogRepo: Repository<SyncLog>,
    @InjectRepository(SyncHash)
    private readonly syncHashRepo: Repository<SyncHash>,
    @InjectRepository(MappingConfig)
    private readonly mappingConfigRepo: Repository<MappingConfig>,
  ) {}

  public isRunning(): boolean {
    return this.isSyncRunning;
  }

  async loadMappingRules(): Promise<any[]> {
    try {
      const dbConfig = await this.mappingConfigRepo.findOne({ where: { configKey: 'default_mapping' } });
      if (dbConfig && dbConfig.configJson) {
        const parsed = JSON.parse(dbConfig.configJson);
        return parsed.fields || [];
      }
    } catch (e: any) {
      this.logger.warn(`Could not load mapping from DB: ${e.message}`);
    }

    // Fallback to local mapping.json
    try {
      const filePath = path.resolve(process.cwd(), 'mapping.json');
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        return parsed.fields || [];
      }
    } catch (e: any) {
      this.logger.warn(`Could not load local mapping.json: ${e.message}`);
    }

    return [];
  }

  async executeSync(options: SyncOptions = {}): Promise<SyncSummary> {
    if (this.isSyncRunning) {
      throw new Error('Another sync operation is already in progress.');
    }

    this.isSyncRunning = true;
    const startTime = Date.now();
    const jobId = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const triggerType = options.triggerType || SyncTriggerType.MANUAL;
    const spreadsheetId =
      options.spreadsheetId || this.configService.get<string>('google.spreadsheetId') || '';
    const sheetName =
      options.sheetName || this.configService.get<string>('google.sheetName') || 'Sheet1';

    let totalRows = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: SyncErrorItem[] = [];
    const trackingUpdates: TrackingUpdate[] = [];

    this.logger.log(`[${jobId}] Starting sync job (${triggerType}). Spreadsheet: ${spreadsheetId}, Sheet: ${sheetName}`);

    try {
      if (!spreadsheetId) {
        throw new Error('Google Spreadsheet ID is not configured.');
      }

      const sheetResult = await this.googleSheetsService.readSheetData(spreadsheetId, sheetName);
      const targetSheet = sheetResult.targetSheet || sheetName;
      const rows = sheetResult.rows;
      const trackingIndices = sheetResult.trackingIndices;
      totalRows = rows.length;

      const mappingRules = await this.loadMappingRules();

      for (const row of rows) {
        let transformed: any;
        const rawLeadIdStr = row.data['Lead ID Bitrix24'];
        const existingLeadId = rawLeadIdStr ? parseInt(rawLeadIdStr, 10) : null;
        const currentHash = this.dataTransformer.computeRowHash(row.data);
        const rowId = `row_${row.rowNumber}_${row.data['Email'] || row.data['Số điện thoại'] || row.rowNumber}`;

        try {
          // Idempotency check: if row already synced and hash has not changed
          const prevHashRecord = await this.syncHashRepo.findOne({ where: { rowIdentifier: rowId } });

          if (
            !options.forceFullSync &&
            prevHashRecord &&
            prevHashRecord.contentHash === currentHash &&
            existingLeadId &&
            row.data['Trạng thái đồng bộ'] === 'Đã đồng bộ'
          ) {
            skippedCount++;
            continue;
          }

          transformed = this.dataTransformer.transformSheetRowToLead(row.data, mappingRules);

          let leadIdToSave: number;

          if (existingLeadId && !isNaN(existingLeadId)) {
            // Case 1: Existing Lead ID on Sheet -> Update in Bitrix24 (TC2)
            await this.bitrix24Service.updateLead(existingLeadId, transformed.fields);
            leadIdToSave = existingLeadId;
            updatedCount++;
            this.logger.log(`[${jobId}] Row ${row.rowNumber}: Updated existing lead #${leadIdToSave}`);
          } else {
            // Case 2: No Lead ID on Sheet -> Check duplicates via Email or Phone (TC3)
            const duplicateLead = await this.bitrix24Service.findLeadByEmailOrPhone(
              transformed.normalizedEmail,
              transformed.normalizedPhone,
            );

            if (duplicateLead) {
              // Found duplicate lead -> Update existing lead instead of creating duplicate
              leadIdToSave = Number(duplicateLead.ID);
              await this.bitrix24Service.updateLead(leadIdToSave, transformed.fields);
              updatedCount++;
              this.logger.log(
                `[${jobId}] Row ${row.rowNumber}: Found duplicate lead #${leadIdToSave} by email/phone. Updated.`,
              );
            } else {
              // Create new lead in Bitrix24 (TC1)
              leadIdToSave = await this.bitrix24Service.createLead(transformed.fields);
              createdCount++;
              this.logger.log(`[${jobId}] Row ${row.rowNumber}: Created new lead #${leadIdToSave}`);
            }
          }

          // Update SyncHash record
          if (!options.dryRun) {
            if (prevHashRecord) {
              prevHashRecord.contentHash = currentHash;
              prevHashRecord.leadId = leadIdToSave;
              prevHashRecord.status = 'SYNCED';
              await this.syncHashRepo.save(prevHashRecord);
            } else {
              await this.syncHashRepo.save({
                rowIdentifier: rowId,
                leadId: leadIdToSave,
                contentHash: currentHash,
                direction: 'sheet_to_crm',
                status: 'SYNCED',
              });
            }

            trackingUpdates.push({
              rowNumber: row.rowNumber,
              syncStatus: 'Đã đồng bộ',
              leadId: leadIdToSave,
              lastSyncedAt: new Date().toISOString(),
              errorMessage: '',
            });
          }
        } catch (err: any) {
          // Error handling per row (TC4)
          errorCount++;
          const errorMsg = err.message || 'Unknown sync error';
          this.logger.error(`[${jobId}] Row ${row.rowNumber} failed: ${errorMsg}`);
          errors.push({
            rowNumber: row.rowNumber,
            leadTitle: transformed?.leadTitle || `Row ${row.rowNumber}`,
            error: errorMsg,
          });

          if (!options.dryRun) {
            trackingUpdates.push({
              rowNumber: row.rowNumber,
              syncStatus: 'Lỗi',
              leadId: existingLeadId,
              lastSyncedAt: new Date().toISOString(),
              errorMessage: errorMsg,
            });
          }
        }
      }

      // Batch update Google Sheets with all tracking changes
      if (!options.dryRun && trackingUpdates.length > 0) {
        await this.googleSheetsService.batchUpdateTracking(
          spreadsheetId,
          targetSheet,
          trackingUpdates,
          trackingIndices,
        );
      }
    } catch (globalErr: any) {
      this.logger.error(`[${jobId}] Fatal sync error: ${globalErr.message}`, globalErr.stack);
      errors.push({
        rowNumber: 0,
        leadTitle: 'GLOBAL',
        error: globalErr.message,
      });
      errorCount++;
    } finally {
      this.isSyncRunning = false;
    }

    const durationMs = Date.now() - startTime;
    const finalStatus =
      errorCount === 0
        ? SyncJobStatus.SUCCESS
        : createdCount > 0 || updatedCount > 0
          ? SyncJobStatus.PARTIAL_SUCCESS
          : SyncJobStatus.FAILED;

    const summary: SyncSummary = {
      jobId,
      triggerType,
      status: finalStatus,
      totalRows,
      createdCount,
      updatedCount,
      skippedCount,
      errorCount,
      errors,
      durationMs,
    };

    // Save SyncLog to database
    try {
      await this.syncLogRepo.save({
        jobId,
        triggerType,
        status: finalStatus,
        totalRows,
        createdCount,
        updatedCount,
        skippedCount,
        errorCount,
        errorDetails: errors.length > 0 ? JSON.stringify(errors) : null,
        durationMs,
      });
    } catch (dbErr: any) {
      this.logger.error(`Failed to save sync log to database: ${dbErr.message}`);
    }

    this.logger.log(
      `[${jobId}] Sync finished in ${durationMs}ms. Status: ${finalStatus}. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
    );

    return summary;
  }
}
