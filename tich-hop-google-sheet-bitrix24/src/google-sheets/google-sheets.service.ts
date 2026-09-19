import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { google, sheets_v4 } from 'googleapis';
import * as path from 'path';
import {
  SheetReadResult,
  SheetRow,
  SheetValueUpdate,
  TrackingColumnIndices,
  TrackingUpdate,
} from './google-sheets.interface';

export const TRACKING_HEADERS = {
  SYNC_STATUS: 'Trạng thái đồng bộ',
  LEAD_ID: 'Lead ID Bitrix24',
  LAST_SYNCED_AT: 'Thời gian đồng bộ cuối',
  ERROR_MESSAGE: 'Thông báo lỗi',
};

export function columnIndexToLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function letterToColumnIndex(letter: string): number {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  return index - 1;
}

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private sheetsClient: sheets_v4.Sheets;

  constructor(private readonly configService: ConfigService) {}

  public getClient(): sheets_v4.Sheets {
    if (!this.sheetsClient) {
      this.initClient();
    }
    return this.sheetsClient;
  }

  public setClientForTest(client: sheets_v4.Sheets) {
    this.sheetsClient = client;
  }

  private initClient() {
    const serviceAccountFile = this.configService.get<string>('google.serviceAccountFile');
    const serviceAccountEmail = this.configService.get<string>('google.serviceAccountEmail');
    const privateKey = this.configService.get<string>('google.privateKey');

    let authClient: any;

    if (serviceAccountFile) {
      const resolvedPath = path.isAbsolute(serviceAccountFile)
        ? serviceAccountFile
        : path.resolve(process.cwd(), serviceAccountFile);

      if (fs.existsSync(resolvedPath)) {
        this.logger.log(`Using Google Service Account file: ${resolvedPath}`);
        authClient = new google.auth.GoogleAuth({
          keyFile: resolvedPath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      }
    }

    if (!authClient && serviceAccountEmail && privateKey) {
      this.logger.log(`Using Google Service Account email & private key from environment`);
      authClient = new google.auth.JWT({
        email: serviceAccountEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }

    if (!authClient) {
      this.logger.warn(
        'Google Sheets auth not configured. Fallback to default GoogleAuth or mock mode.',
      );
      authClient = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }

    this.sheetsClient = google.sheets({ version: 'v4', auth: authClient });
  }

  async getFirstSheetTitle(spreadsheetId: string): Promise<string> {
    const client = this.getClient();
    const res = await client.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title',
    });
    const title = res.data.sheets?.[0]?.properties?.title || 'Sheet1';
    return title;
  }

  async readSheetData(spreadsheetId: string, sheetName?: string): Promise<SheetReadResult> {
    const client = this.getClient();
    let targetSheet = sheetName;

    let response;
    try {
      if (!targetSheet) {
        targetSheet = await this.getFirstSheetTitle(spreadsheetId);
      }
      response = await client.spreadsheets.values.get({
        spreadsheetId,
        range: `'${targetSheet}'!A1:ZZ`,
      });
    } catch (err: any) {
      if (err.message && err.message.includes('Unable to parse range')) {
        targetSheet = await this.getFirstSheetTitle(spreadsheetId);
        response = await client.spreadsheets.values.get({
          spreadsheetId,
          range: `'${targetSheet}'!A1:ZZ`,
        });
      } else {
        throw err;
      }
    }

    const values = response.data.values || [];
    if (values.length === 0) {
      return {
        targetSheet,
        headers: [],
        rows: [],
        trackingIndices: {
          syncStatusCol: -1,
          leadIdCol: -1,
          lastSyncedAtCol: -1,
          errorMessageCol: -1,
        },
      };
    }

    let headers: string[] = values[0].map((h) => (h !== undefined && h !== null ? String(h).trim() : ''));
    
    // Ensure tracking columns exist
    const trackingIndices = await this.ensureTrackingColumns(spreadsheetId, targetSheet, headers);

    // Refresh headers if modified
    if (trackingIndices.syncStatusCol >= headers.length) {
      const refreshed = await client.spreadsheets.values.get({
        spreadsheetId,
        range: `'${targetSheet}'!1:1`,
      });
      headers = (refreshed?.data?.values?.[0] || []).map((h) => String(h).trim());
    }

    const rows: SheetRow[] = [];
    for (let i = 1; i < values.length; i++) {
      const rowVals = values[i] || [];
      const isCompletelyEmpty = rowVals.every((v) => v === undefined || v === null || String(v).trim() === '');
      if (isCompletelyEmpty) continue;

      const rowData: Record<string, string> = {};
      headers.forEach((header, idx) => {
        if (header) {
          rowData[header] = rowVals[idx] !== undefined && rowVals[idx] !== null ? String(rowVals[idx]).trim() : '';
        }
      });

      rows.push({
        rowNumber: i + 1, // 1-indexed
        data: rowData,
        rawValues: rowVals.map((v) => (v !== undefined && v !== null ? String(v) : '')),
      });
    }

    return {
      targetSheet,
      headers,
      rows,
      trackingIndices,
    };
  }

  async ensureTrackingColumns(
    spreadsheetId: string,
    sheetName: string,
    currentHeaders: string[],
  ): Promise<TrackingColumnIndices> {
    const client = this.getClient();
    const headers = [...currentHeaders];

    let syncStatusCol = headers.indexOf(TRACKING_HEADERS.SYNC_STATUS);
    let leadIdCol = headers.indexOf(TRACKING_HEADERS.LEAD_ID);
    let lastSyncedAtCol = headers.indexOf(TRACKING_HEADERS.LAST_SYNCED_AT);
    let errorMessageCol = headers.indexOf(TRACKING_HEADERS.ERROR_MESSAGE);

    const missingHeaders: { name: string; index: number }[] = [];

    if (syncStatusCol === -1) {
      syncStatusCol = headers.length;
      headers.push(TRACKING_HEADERS.SYNC_STATUS);
      missingHeaders.push({ name: TRACKING_HEADERS.SYNC_STATUS, index: syncStatusCol });
    }
    if (leadIdCol === -1) {
      leadIdCol = headers.length;
      headers.push(TRACKING_HEADERS.LEAD_ID);
      missingHeaders.push({ name: TRACKING_HEADERS.LEAD_ID, index: leadIdCol });
    }
    if (lastSyncedAtCol === -1) {
      lastSyncedAtCol = headers.length;
      headers.push(TRACKING_HEADERS.LAST_SYNCED_AT);
      missingHeaders.push({ name: TRACKING_HEADERS.LAST_SYNCED_AT, index: lastSyncedAtCol });
    }
    if (errorMessageCol === -1) {
      errorMessageCol = headers.length;
      headers.push(TRACKING_HEADERS.ERROR_MESSAGE);
      missingHeaders.push({ name: TRACKING_HEADERS.ERROR_MESSAGE, index: errorMessageCol });
    }

    if (missingHeaders.length > 0) {
      this.logger.log(
        `Adding missing tracking headers to sheet '${sheetName}': ${missingHeaders.map((m) => m.name).join(', ')}`,
      );

      const startColIndex = missingHeaders[0].index;
      const endColIndex = missingHeaders[missingHeaders.length - 1].index;
      const startLetter = columnIndexToLetter(startColIndex);
      const endLetter = columnIndexToLetter(endColIndex);
      const range = `'${sheetName}'!${startLetter}1:${endLetter}1`;
      const values = [missingHeaders.map((m) => m.name)];

      await client.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
    }

    return {
      syncStatusCol,
      leadIdCol,
      lastSyncedAtCol,
      errorMessageCol,
    };
  }

  async batchUpdateRows(spreadsheetId: string, updates: SheetValueUpdate[]): Promise<void> {
    if (updates.length === 0) return;
    const client = this.getClient();
    await client.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates.map((u) => ({
          range: u.range,
          values: u.values,
        })),
      },
    });
  }

  async batchUpdateTracking(
    spreadsheetId: string,
    sheetName: string,
    updates: TrackingUpdate[],
    trackingIndices: TrackingColumnIndices,
  ): Promise<void> {
    if (updates.length === 0) return;

    const valueUpdates: SheetValueUpdate[] = [];

    // Check if tracking columns are consecutive
    const cols = [
      trackingIndices.syncStatusCol,
      trackingIndices.leadIdCol,
      trackingIndices.lastSyncedAtCol,
      trackingIndices.errorMessageCol,
    ];
    const isConsecutive =
      cols[1] === cols[0] + 1 &&
      cols[2] === cols[1] + 1 &&
      cols[3] === cols[2] + 1;

    for (const update of updates) {
      const row = update.rowNumber;
      if (isConsecutive) {
        const startLetter = columnIndexToLetter(cols[0]);
        const endLetter = columnIndexToLetter(cols[3]);
        valueUpdates.push({
          range: `'${sheetName}'!${startLetter}${row}:${endLetter}${row}`,
          values: [
            [
              update.syncStatus,
              update.leadId !== undefined && update.leadId !== null ? update.leadId : '',
              update.lastSyncedAt || '',
              update.errorMessage || '',
            ],
          ],
        });
      } else {
        // Individual cells
        valueUpdates.push({
          range: `'${sheetName}'!${columnIndexToLetter(trackingIndices.syncStatusCol)}${row}`,
          values: [[update.syncStatus]],
        });
        if (update.leadId !== undefined && update.leadId !== null) {
          valueUpdates.push({
            range: `'${sheetName}'!${columnIndexToLetter(trackingIndices.leadIdCol)}${row}`,
            values: [[update.leadId]],
          });
        }
        if (update.lastSyncedAt !== undefined) {
          valueUpdates.push({
            range: `'${sheetName}'!${columnIndexToLetter(trackingIndices.lastSyncedAtCol)}${row}`,
            values: [[update.lastSyncedAt]],
          });
        }
        if (update.errorMessage !== undefined) {
          valueUpdates.push({
            range: `'${sheetName}'!${columnIndexToLetter(trackingIndices.errorMessageCol)}${row}`,
            values: [[update.errorMessage]],
          });
        }
      }
    }

    await this.batchUpdateRows(spreadsheetId, valueUpdates);
  }

  async updateCell(spreadsheetId: string, sheetName: string, colIndex: number, rowNumber: number, value: any): Promise<void> {
    const colLetter = columnIndexToLetter(colIndex);
    const range = `'${sheetName}'!${colLetter}${rowNumber}`;
    const client = this.getClient();
    await client.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[value]],
      },
    });
  }
}
