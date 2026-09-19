import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bitrix24Service } from '../bitrix24/bitrix24.service';
import { SyncHash } from '../database/entities/sync-hash.entity';
import { SyncJobStatus, SyncLog, SyncTriggerType } from '../database/entities/sync-log.entity';
import { TRACKING_HEADERS } from '../google-sheets/google-sheets.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { ConflictResolverService } from '../sync/conflict-resolver.service';
import { DataTransformerService } from '../sync/data-transformer.service';

export interface BitrixWebhookPayload {
  event: string;
  data: {
    FIELDS: {
      ID: string | number;
      [key: string]: any;
    };
  };
  auth?: {
    application_token?: string;
    domain?: string;
    member_id?: string;
  };
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly bitrix24Service: Bitrix24Service,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly dataTransformer: DataTransformerService,
    private readonly conflictResolver: ConflictResolverService,
    @InjectRepository(SyncHash)
    private readonly syncHashRepo: Repository<SyncHash>,
    @InjectRepository(SyncLog)
    private readonly syncLogRepo: Repository<SyncLog>,
  ) {}

  validateToken(payload: BitrixWebhookPayload) {
    const configuredToken = this.configService.get<string>('bitrix24.outboundToken');
    if (configuredToken) {
      const incomingToken = payload.auth?.application_token;
      if (incomingToken !== configuredToken) {
        throw new UnauthorizedException('Invalid Bitrix24 webhook authentication token.');
      }
    }
  }

  async handleBitrixLeadEvent(payload: BitrixWebhookPayload): Promise<{ status: string; message: string }> {
    this.validateToken(payload);

    const eventName = payload.event;
    const rawLeadId = payload.data?.FIELDS?.ID;
    if (!rawLeadId) {
      return { status: 'IGNORED', message: 'No lead ID in payload.' };
    }

    const leadId = Number(rawLeadId);
    this.logger.log(`Received Bitrix24 webhook event: ${eventName} for Lead #${leadId}`);

    // Fetch latest lead data from Bitrix24 CRM
    const crmLead = await this.bitrix24Service.getLead(leadId);
    if (!crmLead) {
      return { status: 'NOT_FOUND', message: `Lead #${leadId} not found in Bitrix24.` };
    }

    const spreadsheetId = this.configService.get<string>('google.spreadsheetId') || '';
    const sheetName = this.configService.get<string>('google.sheetName') || 'Sheet1';

    if (!spreadsheetId) {
      return { status: 'ERROR', message: 'Google Spreadsheet ID not configured.' };
    }

    const sheetResult = await this.googleSheetsService.readSheetData(spreadsheetId, sheetName);
    const rows = sheetResult.rows;
    const trackingIndices = sheetResult.trackingIndices;

    // Find the row corresponding to this Lead ID
    const targetRow = rows.find(
      (r) => r.data[TRACKING_HEADERS.LEAD_ID] && parseInt(r.data[TRACKING_HEADERS.LEAD_ID], 10) === leadId,
    );

    if (!targetRow) {
      this.logger.log(`Lead #${leadId} does not match any existing row on sheet '${sheetName}'.`);
      return { status: 'SKIPPED', message: `Lead #${leadId} not linked to any row.` };
    }

    // Loop prevention check:
    const crmLeadStatus = crmLead.STATUS_ID || '';
    const mappedSheetStatus = this.dataTransformer.mapBitrixStatusToSheet(crmLeadStatus);
    const currentSheetStatus = targetRow.data['Trạng thái'] || '';

    // If status is already identical, skip to avoid infinite loop
    if (mappedSheetStatus === currentSheetStatus) {
      this.logger.log(`Lead #${leadId} status '${crmLeadStatus}' is already synced. Skipping to prevent loop.`);
      return { status: 'UNCHANGED', message: 'Status already matches sheet.' };
    }

    // Update the Sheet row with new CRM status & tracking info
    const statusColIndex = sheetResult.headers.indexOf('Trạng thái');
    if (statusColIndex !== -1) {
      await this.googleSheetsService.updateCell(
        spreadsheetId,
        sheetName,
        statusColIndex,
        targetRow.rowNumber,
        mappedSheetStatus,
      );
    }

    // Update tracking columns
    await this.googleSheetsService.batchUpdateTracking(
      spreadsheetId,
      sheetName,
      [
        {
          rowNumber: targetRow.rowNumber,
          syncStatus: 'Đã đồng bộ',
          leadId,
          lastSyncedAt: new Date().toISOString(),
          errorMessage: '',
        },
      ],
      trackingIndices,
    );

    // Record sync log
    await this.syncLogRepo.save({
      jobId: `webhook_${Date.now()}`,
      triggerType: SyncTriggerType.WEBHOOK,
      status: SyncJobStatus.SUCCESS,
      totalRows: 1,
      createdCount: 0,
      updatedCount: 1,
      skippedCount: 0,
      errorCount: 0,
      durationMs: 0,
    });

    this.logger.log(`Updated Sheet row ${targetRow.rowNumber} for Lead #${leadId} -> Status: ${mappedSheetStatus}`);
    return { status: 'UPDATED', message: `Sheet row ${targetRow.rowNumber} updated with status ${mappedSheetStatus}` };
  }
}
