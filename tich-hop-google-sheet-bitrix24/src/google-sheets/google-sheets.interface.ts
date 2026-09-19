export interface SheetRow {
  rowNumber: number;
  data: Record<string, string>;
  rawValues: string[];
}

export interface TrackingColumnIndices {
  syncStatusCol: number;
  leadIdCol: number;
  lastSyncedAtCol: number;
  errorMessageCol: number;
}

export interface TrackingUpdate {
  rowNumber: number;
  syncStatus: string;
  leadId?: number | null;
  lastSyncedAt?: string;
  errorMessage?: string;
}

export interface SheetValueUpdate {
  range: string;
  values: any[][];
}

export interface SheetReadResult {
  targetSheet: string;
  headers: string[];
  rows: SheetRow[];
  trackingIndices: TrackingColumnIndices;
}
