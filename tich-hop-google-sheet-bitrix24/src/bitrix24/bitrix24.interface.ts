export interface BitrixMultifield {
  ID?: string;
  VALUE: string;
  VALUE_TYPE: string; // e.g. 'WORK', 'HOME', 'MOBILE'
}

export interface BitrixLead {
  ID: string | number;
  TITLE?: string;
  NAME?: string;
  LAST_NAME?: string;
  SECOND_NAME?: string;
  COMPANY_TITLE?: string;
  SOURCE_ID?: string;
  SOURCE_DESCRIPTION?: string;
  STATUS_ID?: string;
  STATUS_DESCRIPTION?: string;
  OPPORTUNITY?: string | number;
  CURRENCY_ID?: string;
  ASSIGNED_BY_ID?: string | number;
  COMMENTS?: string;
  DATE_CREATE?: string;
  DATE_MODIFY?: string;
  EMAIL?: BitrixMultifield[];
  PHONE?: BitrixMultifield[];
  [key: string]: any;
}

export interface BitrixApiResponse<T = any> {
  result: T;
  time?: {
    start: number;
    finish: number;
    duration: number;
    processing: number;
    date_start: string;
    date_finish: string;
  };
  error?: string;
  error_description?: string;
  total?: number;
  next?: number;
}
