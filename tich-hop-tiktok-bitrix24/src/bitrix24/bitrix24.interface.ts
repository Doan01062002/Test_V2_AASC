export interface Bitrix24LeadFields {
  TITLE?: string;
  NAME?: string;
  LAST_NAME?: string;
  EMAIL?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  PHONE?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  SOURCE_ID?: string;
  SOURCE_DESCRIPTION?: string;
  COMMENTS?: string;
  ASSIGNED_BY_ID?: string | number;
  [key: string]: any;
}

export interface Bitrix24DealFields {
  TITLE: string;
  STAGE_ID?: string;
  CATEGORY_ID?: string | number;
  OPPORTUNITY?: number;
  CURRENCY_ID?: string;
  LEAD_ID?: number;
  ASSIGNED_BY_ID?: string | number;
  PROBABILITY?: number;
  COMMENTS?: string;
  [key: string]: any;
}

export interface Bitrix24ApiResponse<T = any> {
  result: T;
  time?: {
    start: number;
    finish: number;
    duration: number;
    processing: number;
    date_start: string;
    date_finish: string;
  };
  total?: number;
  error?: string;
  error_description?: string;
}
