import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { BitrixApiResponse, BitrixLead } from './bitrix24.interface';

@Injectable()
export class Bitrix24Service {
  private readonly logger = new Logger(Bitrix24Service.name);
  private httpClient: AxiosInstance;
  private baseUrl: string;
  private lastRequestTime = 0;
  private readonly minIntervalMs: number;
  private readonly maxRetries: number;

  constructor(private readonly configService: ConfigService) {
    const rawUrl = this.configService.get<string>('bitrix24.webhookUrl') || '';
    this.baseUrl = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;

    const rps = this.configService.get<number>('sync.rateLimitRps') || 2;
    this.minIntervalMs = Math.max(100, Math.floor(1000 / rps));
    this.maxRetries = this.configService.get<number>('sync.maxRetries') || 3;

    this.httpClient = axios.create({
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public setHttpClientForTest(client: AxiosInstance) {
    this.httpClient = client;
  }

  public setBaseUrlForTest(url: string) {
    this.baseUrl = url.endsWith('/') ? url : `${url}/`;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  async callMethod<T = any>(method: string, params: Record<string, any> = {}): Promise<BitrixApiResponse<T>> {
    if (!this.baseUrl || this.baseUrl === '/') {
      throw new Error('Bitrix24 Webhook URL is not configured.');
    }

    const url = `${this.baseUrl}${method}`;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        await this.throttle();
        const response = await this.httpClient.post<BitrixApiResponse<T>>(url, params);

        if (response.data?.error) {
          throw new Error(`Bitrix24 API error [${response.data.error}]: ${response.data.error_description}`);
        }

        return response.data;
      } catch (error: any) {
        attempt++;
        const status = error.response?.status;
        const isRateLimit = status === 429;
        const isServerError = status >= 500 && status < 600;
        const isNetworkError = !error.response && error.code;

        if (attempt <= this.maxRetries && (isRateLimit || isServerError || isNetworkError)) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          this.logger.warn(
            `Bitrix24 call ${method} failed with status ${status || error.code}. Retrying in ${delayMs}ms (attempt ${attempt}/${this.maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        const errMsg = error.response?.data?.error_description || error.message || 'Unknown Bitrix24 error';
        this.logger.error(`Bitrix24 call ${method} failed permanently: ${errMsg}`);
        throw new Error(`Bitrix24 ${method} error: ${errMsg}`);
      }
    }

    throw new Error(`Bitrix24 ${method} exceeded maximum retry attempts.`);
  }

  async findLeadByEmailOrPhone(email?: string, phone?: string): Promise<BitrixLead | null> {
    if (email) {
      try {
        const res = await this.callMethod<BitrixLead[]>('crm.lead.list', {
          filter: { EMAIL: email },
          select: ['ID', 'TITLE', 'STATUS_ID', 'ASSIGNED_BY_ID', 'DATE_MODIFY', 'EMAIL', 'PHONE'],
          order: { ID: 'DESC' },
        });
        if (res.result && res.result.length > 0) {
          const matched = res.result.find((l) => {
            if (!Array.isArray(l.EMAIL)) return true;
            return l.EMAIL.some((e: any) => e.VALUE?.toLowerCase() === email.toLowerCase());
          });
          if (matched) return matched;
        }
      } catch (e: any) {
        this.logger.warn(`Search lead by email (${email}) error: ${e.message}`);
      }
    }

    if (phone) {
      try {
        const res = await this.callMethod<BitrixLead[]>('crm.lead.list', {
          filter: { PHONE: phone },
          select: ['ID', 'TITLE', 'STATUS_ID', 'ASSIGNED_BY_ID', 'DATE_MODIFY', 'EMAIL', 'PHONE'],
          order: { ID: 'DESC' },
        });
        if (res.result && res.result.length > 0) {
          const cleanPhone = phone.replace(/\D/g, '');
          const matched = res.result.find((l) => {
            if (!Array.isArray(l.PHONE)) return true;
            return l.PHONE.some((p: any) => p.VALUE?.replace(/\D/g, '').endsWith(cleanPhone.slice(-9)));
          });
          if (matched) return matched;
        }
      } catch (e: any) {
        this.logger.warn(`Search lead by phone (${phone}) error: ${e.message}`);
      }
    }

    return null;
  }

  async createLead(fields: Record<string, any>): Promise<number> {
    const res = await this.callMethod<number>('crm.lead.add', {
      fields,
      params: { REGISTER_SONET_EVENT: 'Y' },
    });
    return Number(res.result);
  }

  async updateLead(id: number | string, fields: Record<string, any>): Promise<boolean> {
    const res = await this.callMethod<boolean>('crm.lead.update', {
      id,
      fields,
      params: { REGISTER_SONET_EVENT: 'N' },
    });
    return Boolean(res.result);
  }

  async getLead(id: number | string): Promise<BitrixLead | null> {
    try {
      const res = await this.callMethod<BitrixLead>('crm.lead.get', { id });
      return res.result || null;
    } catch (e: any) {
      this.logger.warn(`Get lead ${id} error: ${e.message}`);
      return null;
    }
  }

  buildBatchCommand(method: string, params: Record<string, any>): string {
    const serializeParam = (obj: any, prefix = ''): string[] => {
      const pairs: string[] = [];
      for (const [key, val] of Object.entries(obj)) {
        if (val === undefined || val === null) continue;
        const fullKey = prefix ? `${prefix}[${key}]` : key;
        if (typeof val === 'object' && !Array.isArray(val)) {
          pairs.push(...serializeParam(val, fullKey));
        } else if (Array.isArray(val)) {
          val.forEach((item, idx) => {
            if (typeof item === 'object') {
              pairs.push(...serializeParam(item, `${fullKey}[${idx}]`));
            } else {
              pairs.push(`${encodeURIComponent(`${fullKey}[${idx}]`)}=${encodeURIComponent(item)}`);
            }
          });
        } else {
          pairs.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(val))}`);
        }
      }
      return pairs;
    };

    const query = serializeParam(params).join('&');
    return query ? `${method}?${query}` : method;
  }

  async batchExecute(commands: Record<string, string>): Promise<Record<string, any>> {
    if (Object.keys(commands).length === 0) return {};
    const res = await this.callMethod<{ result: Record<string, any>; result_error: Record<string, any> }>('batch', {
      cmd: commands,
      halt: 0,
    });
    return res.result?.result || {};
  }
}
