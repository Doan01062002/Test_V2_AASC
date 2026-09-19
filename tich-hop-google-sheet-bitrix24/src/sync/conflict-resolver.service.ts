import { Injectable, Logger } from '@nestjs/common';
import { BitrixLead } from '../bitrix24/bitrix24.interface';

export interface ConflictResolution {
  action: 'UPDATE_CRM' | 'UPDATE_SHEET' | 'SKIP_IDENTICAL' | 'MERGE_BOTH';
  fieldsToCrm?: Record<string, any>;
  fieldsToSheet?: Record<string, any>;
  reason: string;
}

@Injectable()
export class ConflictResolverService {
  private readonly logger = new Logger(ConflictResolverService.name);

  /**
   * Prevents infinite loops between Sheet -> CRM and CRM -> Sheet webhook
   */
  isLoopOrUnchanged(currentHash: string, lastSyncedHash?: string): boolean {
    if (!lastSyncedHash) return false;
    return currentHash === lastSyncedHash;
  }

  /**
   * Resolves conflicts between Sheet data and CRM Lead
   */
  resolveConflict(
    sheetData: Record<string, any>,
    crmLead: BitrixLead,
    sheetHash: string,
    lastSyncedHash?: string,
  ): ConflictResolution {
    if (this.isLoopOrUnchanged(sheetHash, lastSyncedHash)) {
      return {
        action: 'SKIP_IDENTICAL',
        reason: 'Content hash is identical to last synced hash. No sync needed.',
      };
    }

    // By specification:
    // 1. Status & Assigned User: CRM is master
    // 2. Contact details & notes & budget: Sheet is master
    const fieldsToCrm: Record<string, any> = {};
    const fieldsToSheet: Record<string, any> = {};

    // Check if CRM has status change
    const crmStatus = crmLead.STATUS_ID;
    const sheetStatus = sheetData['Trạng thái'];

    // If both have changes, merge both
    let crmNeedsUpdate = false;
    let sheetNeedsUpdate = false;

    // Contact info to CRM
    if (sheetData['Tên khách hàng'] && sheetData['Tên khách hàng'] !== crmLead.TITLE) {
      fieldsToCrm['TITLE'] = sheetData['Tên khách hàng'];
      crmNeedsUpdate = true;
    }

    if (crmStatus && sheetStatus && crmStatus !== sheetStatus) {
      // CRM wins for status
      fieldsToSheet['Trạng thái'] = crmStatus;
      sheetNeedsUpdate = true;
    }

    if (crmNeedsUpdate && sheetNeedsUpdate) {
      return {
        action: 'MERGE_BOTH',
        fieldsToCrm,
        fieldsToSheet,
        reason: 'CRM status prioritized for Sheet, Sheet contact details prioritized for CRM',
      };
    }

    if (sheetNeedsUpdate) {
      return {
        action: 'UPDATE_SHEET',
        fieldsToSheet,
        reason: 'CRM state updated, propagating to Sheet',
      };
    }

    return {
      action: 'UPDATE_CRM',
      fieldsToCrm,
      reason: 'Sheet changes propagating to CRM',
    };
  }
}
