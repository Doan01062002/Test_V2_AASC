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
  useBatch?: boolean;
  batchThreshold?: number;
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
      options.spreadsheetId !== undefined
        ? options.spreadsheetId
        : (this.configService.get<string>('google.spreadsheetId') || '');
    const sheetName =
      options.sheetName !== undefined
        ? options.sheetName
        : (this.configService.get<string>('google.sheetName') || 'Sheet1');

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

      const batchThreshold = options.batchThreshold ?? 50;
      const shouldUseBatch = options.useBatch || rows.length > batchThreshold;

      if (shouldUseBatch) {
        this.logger.log(
          `[${jobId}] Dataset has ${rows.length} rows (threshold: ${batchThreshold}). Executing via Bitrix24 batch API.`,
        );
        const batchRes = await this.executeBatchMode(rows, mappingRules, jobId, options);
        createdCount = batchRes.createdCount;
        updatedCount = batchRes.updatedCount;
        skippedCount = batchRes.skippedCount;
        errorCount = batchRes.errorCount;
        errors.push(...batchRes.errors);
        trackingUpdates.push(...batchRes.trackingUpdates);
      } else {
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
            // Case 1: Existing Lead ID on Sheet -> Fetch CRM Lead and apply ConflictResolver (TC2)
            let crmLead: any = null;
            try {
              crmLead = await this.bitrix24Service.getLead(existingLeadId);
            } catch (fetchErr: any) {
              this.logger.warn(`Could not fetch lead #${existingLeadId} for conflict resolution: ${fetchErr.message}`);
            }

            if (crmLead) {
              const conflict = this.conflictResolver.resolveConflict(
                row.data,
                crmLead,
                currentHash,
                prevHashRecord?.contentHash,
              );

              if (conflict.action === 'SKIP_IDENTICAL') {
                skippedCount++;
                this.logger.log(`[${jobId}] Row ${row.rowNumber}: ConflictResolver marked SKIP_IDENTICAL.`);
                continue;
              }

              const fieldsToApply =
                conflict.fieldsToCrm && Object.keys(conflict.fieldsToCrm).length > 0
                  ? { ...transformed.fields, ...conflict.fieldsToCrm }
                  : transformed.fields;

              await this.bitrix24Service.updateLead(existingLeadId, fieldsToApply);
              leadIdToSave = existingLeadId;
              updatedCount++;
              this.logger.log(`[${jobId}] Row ${row.rowNumber}: Conflict resolved (${conflict.action}). Updated lead #${leadIdToSave}`);
            } else {
              await this.bitrix24Service.updateLead(existingLeadId, transformed.fields);
              leadIdToSave = existingLeadId;
              updatedCount++;
              this.logger.log(`[${jobId}] Row ${row.rowNumber}: Updated existing lead #${leadIdToSave}`);
            }
          } else {
            // Case 2: No Lead ID on Sheet -> Check duplicates via Email or Phone (TC3)
            const duplicateLead = await this.bitrix24Service.findLeadByEmailOrPhone(
              transformed.normalizedEmail,
              transformed.normalizedPhone,
            );

            if (duplicateLead) {
              // Found duplicate lead -> Apply ConflictResolver (TC3)
              const conflict = this.conflictResolver.resolveConflict(
                row.data,
                duplicateLead,
                currentHash,
                prevHashRecord?.contentHash,
              );

              leadIdToSave = Number(duplicateLead.ID);

              if (conflict.action === 'SKIP_IDENTICAL') {
                skippedCount++;
                this.logger.log(`[${jobId}] Row ${row.rowNumber}: ConflictResolver duplicate skipped.`);
                continue;
              }

              const fieldsToApply =
                conflict.fieldsToCrm && Object.keys(conflict.fieldsToCrm).length > 0
                  ? { ...transformed.fields, ...conflict.fieldsToCrm }
                  : transformed.fields;

              await this.bitrix24Service.updateLead(leadIdToSave, fieldsToApply);
              updatedCount++;
              this.logger.log(
                `[${jobId}] Row ${row.rowNumber}: Found duplicate lead #${leadIdToSave} by email/phone. Conflict resolved (${conflict.action}). Updated.`,
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

  private async executeBatchMode(
    rows: any[],
    mappingRules: any[],
    jobId: string,
    options: SyncOptions,
  ): Promise<{
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    errorCount: number;
    errors: SyncErrorItem[];
    trackingUpdates: TrackingUpdate[];
  }> {
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: SyncErrorItem[] = [];
    const trackingUpdates: TrackingUpdate[] = [];

    const CHUNK_SIZE = 50;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const pendingCreates: Array<{
        row: any;
        fields: any;
        currentHash: string;
        rowId: string;
        prevHashRecord: any;
        transformed: any;
      }> = [];
      const pendingUpdates: Array<{
        row: any;
        targetLeadId: number;
        fields: any;
        currentHash: string;
        rowId: string;
        prevHashRecord: any;
        transformed: any;
      }> = [];

      for (const row of chunk) {
        let transformed: any;
        const rawLeadIdStr = row.data['Lead ID Bitrix24'];
        const existingLeadId = rawLeadIdStr ? parseInt(rawLeadIdStr, 10) : null;
        const currentHash = this.dataTransformer.computeRowHash(row.data);
        const rowId = `row_${row.rowNumber}_${row.data['Email'] || row.data['Số điện thoại'] || row.rowNumber}`;

        try {
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

          if (existingLeadId && !isNaN(existingLeadId)) {
            let crmLead: any = null;
            try {
              crmLead = await this.bitrix24Service.getLead(existingLeadId);
            } catch (fetchErr: any) {
              this.logger.warn(`Could not fetch lead #${existingLeadId} for batch conflict resolution: ${fetchErr.message}`);
            }

            if (crmLead) {
              const conflict = this.conflictResolver.resolveConflict(
                row.data,
                crmLead,
                currentHash,
                prevHashRecord?.contentHash,
              );
              if (conflict.action === 'SKIP_IDENTICAL') {
                skippedCount++;
                continue;
              }
              const fieldsToApply =
                conflict.fieldsToCrm && Object.keys(conflict.fieldsToCrm).length > 0
                  ? { ...transformed.fields, ...conflict.fieldsToCrm }
                  : transformed.fields;
              pendingUpdates.push({ row, targetLeadId: existingLeadId, fields: fieldsToApply, currentHash, rowId, prevHashRecord, transformed });
            } else {
              pendingUpdates.push({ row, targetLeadId: existingLeadId, fields: transformed.fields, currentHash, rowId, prevHashRecord, transformed });
            }
          } else {
            const duplicateLead = await this.bitrix24Service.findLeadByEmailOrPhone(
              transformed.normalizedEmail,
              transformed.normalizedPhone,
            );
            if (duplicateLead) {
              const targetLeadId = Number(duplicateLead.ID);
              const conflict = this.conflictResolver.resolveConflict(
                row.data,
                duplicateLead,
                currentHash,
                prevHashRecord?.contentHash,
              );
              if (conflict.action === 'SKIP_IDENTICAL') {
                skippedCount++;
                continue;
              }
              const fieldsToApply =
                conflict.fieldsToCrm && Object.keys(conflict.fieldsToCrm).length > 0
                  ? { ...transformed.fields, ...conflict.fieldsToCrm }
                  : transformed.fields;
              pendingUpdates.push({ row, targetLeadId, fields: fieldsToApply, currentHash, rowId, prevHashRecord, transformed });
            } else {
              pendingCreates.push({ row, fields: transformed.fields, currentHash, rowId, prevHashRecord, transformed });
            }
          }
        } catch (err: any) {
          errorCount++;
          const errorMsg = err.message || 'Error preparing batch row';
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

      const commands: Record<string, string> = {};
      for (const item of pendingCreates) {
        commands[`create_${item.row.rowNumber}`] = this.bitrix24Service.buildBatchCommand('crm.lead.add', {
          fields: item.fields,
          params: { REGISTER_SONET_EVENT: 'Y' },
        });
      }
      for (const item of pendingUpdates) {
        commands[`update_${item.row.rowNumber}`] = this.bitrix24Service.buildBatchCommand('crm.lead.update', {
          id: item.targetLeadId,
          fields: item.fields,
          params: { REGISTER_SONET_EVENT: 'N' },
        });
      }

      if (Object.keys(commands).length > 0) {
        try {
          const batchResults = await this.bitrix24Service.batchExecute(commands);

          for (const item of pendingCreates) {
            const cmdKey = `create_${item.row.rowNumber}`;
            const resId = Number(batchResults[cmdKey]);
            if (resId && !isNaN(resId)) {
              createdCount++;
              this.logger.log(`[${jobId}] Batch row ${item.row.rowNumber}: Created lead #${resId}`);
              if (!options.dryRun) {
                if (item.prevHashRecord) {
                  item.prevHashRecord.contentHash = item.currentHash;
                  item.prevHashRecord.leadId = resId;
                  item.prevHashRecord.status = 'SYNCED';
                  await this.syncHashRepo.save(item.prevHashRecord);
                } else {
                  await this.syncHashRepo.save({
                    rowIdentifier: item.rowId,
                    leadId: resId,
                    contentHash: item.currentHash,
                    direction: 'sheet_to_crm',
                    status: 'SYNCED',
                  });
                }
                trackingUpdates.push({
                  rowNumber: item.row.rowNumber,
                  syncStatus: 'Đã đồng bộ',
                  leadId: resId,
                  lastSyncedAt: new Date().toISOString(),
                  errorMessage: '',
                });
              }
            } else {
              errorCount++;
              const errorMsg = `Batch create failed for row ${item.row.rowNumber}`;
              this.logger.error(`[${jobId}] Row ${item.row.rowNumber}: ${errorMsg}`);
              errors.push({
                rowNumber: item.row.rowNumber,
                leadTitle: item.transformed?.leadTitle || `Row ${item.row.rowNumber}`,
                error: errorMsg,
              });
              if (!options.dryRun) {
                trackingUpdates.push({
                  rowNumber: item.row.rowNumber,
                  syncStatus: 'Lỗi',
                  leadId: null,
                  lastSyncedAt: new Date().toISOString(),
                  errorMessage: errorMsg,
                });
              }
            }
          }

          for (const item of pendingUpdates) {
            const cmdKey = `update_${item.row.rowNumber}`;
            const isSuccess = batchResults[cmdKey] !== undefined;
            if (isSuccess) {
              updatedCount++;
              this.logger.log(`[${jobId}] Batch row ${item.row.rowNumber}: Updated lead #${item.targetLeadId}`);
              if (!options.dryRun) {
                if (item.prevHashRecord) {
                  item.prevHashRecord.contentHash = item.currentHash;
                  item.prevHashRecord.leadId = item.targetLeadId;
                  item.prevHashRecord.status = 'SYNCED';
                  await this.syncHashRepo.save(item.prevHashRecord);
                } else {
                  await this.syncHashRepo.save({
                    rowIdentifier: item.rowId,
                    leadId: item.targetLeadId,
                    contentHash: item.currentHash,
                    direction: 'sheet_to_crm',
                    status: 'SYNCED',
                  });
                }
                trackingUpdates.push({
                  rowNumber: item.row.rowNumber,
                  syncStatus: 'Đã đồng bộ',
                  leadId: item.targetLeadId,
                  lastSyncedAt: new Date().toISOString(),
                  errorMessage: '',
                });
              }
            } else {
              errorCount++;
              const errorMsg = `Batch update failed for row ${item.row.rowNumber}`;
              this.logger.error(`[${jobId}] Row ${item.row.rowNumber}: ${errorMsg}`);
              errors.push({
                rowNumber: item.row.rowNumber,
                leadTitle: item.transformed?.leadTitle || `Row ${item.row.rowNumber}`,
                error: errorMsg,
              });
              if (!options.dryRun) {
                trackingUpdates.push({
                  rowNumber: item.row.rowNumber,
                  syncStatus: 'Lỗi',
                  leadId: item.targetLeadId,
                  lastSyncedAt: new Date().toISOString(),
                  errorMessage: errorMsg,
                });
              }
            }
          }
        } catch (batchErr: any) {
          const errMsg = batchErr.message || 'Batch execution failed';
          this.logger.error(`[${jobId}] Batch execution error: ${errMsg}`);
          for (const item of [...pendingCreates, ...pendingUpdates]) {
            errorCount++;
            errors.push({
              rowNumber: item.row.rowNumber,
              leadTitle: item.transformed?.leadTitle || `Row ${item.row.rowNumber}`,
              error: errMsg,
            });
            if (!options.dryRun) {
              trackingUpdates.push({
                rowNumber: item.row.rowNumber,
                syncStatus: 'Lỗi',
                leadId: (item as any).targetLeadId || null,
                lastSyncedAt: new Date().toISOString(),
                errorMessage: errMsg,
              });
            }
          }
        }
      }
    }

    return { createdCount, updatedCount, skippedCount, errorCount, errors, trackingUpdates };
  }
}
