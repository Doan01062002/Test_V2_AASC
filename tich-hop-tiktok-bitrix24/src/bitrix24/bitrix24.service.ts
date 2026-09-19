import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  Bitrix24ApiResponse,
  Bitrix24DealFields,
  Bitrix24LeadFields,
} from './bitrix24.interface';

@Injectable()
export class Bitrix24Service {
  private readonly logger = new Logger(Bitrix24Service.name);
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    let url = this.configService.get<string>(
      'bitrix24.webhookUrl',
      'https://b24-lgjau5.bitrix24.vn/rest/1/jis7d07lt4b98fqe/',
    );
    if (!url.endsWith('/')) {
      url += '/';
    }
    this.baseUrl = url;
  }

  private async callApi<T = any>(
    method: string,
    params: Record<string, any> = {},
  ): Promise<Bitrix24ApiResponse<T>> {
    const endpoint = `${this.baseUrl}${method}.json`;
    this.logger.debug(`Calling Bitrix24 method: ${method}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post<Bitrix24ApiResponse<T>>(endpoint, params, {
          timeout: 10000,
        }),
      );

      if (response.data.error) {
        throw new Error(
          `Bitrix24 API Error: ${response.data.error} - ${response.data.error_description}`,
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error(
        `Bitrix24 API request failed (${method}): ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async createLead(fields: Bitrix24LeadFields): Promise<number> {
    const res = await this.callApi<number>('crm.lead.add', {
      fields: {
        SOURCE_ID: 'TIKTOK',
        ...fields,
      },
      params: { REGISTER_SONET_EVENT: 'Y' },
    });
    return res.result;
  }

  async updateLead(
    id: number,
    fields: Partial<Bitrix24LeadFields>,
  ): Promise<boolean> {
    const res = await this.callApi<boolean>('crm.lead.update', {
      id,
      fields,
      params: { REGISTER_SONET_EVENT: 'Y' },
    });
    return !!res.result;
  }

  async findLeadByEmailOrPhone(
    email?: string,
    phone?: string,
  ): Promise<any | null> {
    if (!email && !phone) return null;

    try {
      // First try searching with crm.duplicate.findbycomm if applicable, or crm.lead.list
      if (email) {
        const res = await this.callApi<any[]>('crm.lead.list', {
          filter: { '=EMAIL': email },
          select: ['ID', 'NAME', 'EMAIL', 'PHONE', 'STATUS_ID'],
        });
        if (Array.isArray(res.result) && res.result.length > 0) {
          return res.result[0];
        }
      }

      if (phone) {
        const res = await this.callApi<any[]>('crm.lead.list', {
          filter: { '=PHONE': phone },
          select: ['ID', 'NAME', 'EMAIL', 'PHONE', 'STATUS_ID'],
        });
        if (Array.isArray(res.result) && res.result.length > 0) {
          return res.result[0];
        }
      }
    } catch (err) {
      this.logger.warn(`findLeadByEmailOrPhone warning: ${(err as Error).message}`);
    }

    return null;
  }

  async createDeal(fields: Bitrix24DealFields): Promise<number> {
    const res = await this.callApi<number>('crm.deal.add', {
      fields: {
        CURRENCY_ID: 'VND',
        ...fields,
      },
      params: { REGISTER_SONET_EVENT: 'Y' },
    });
    return res.result;
  }

  async updateDeal(
    id: number,
    fields: Partial<Bitrix24DealFields>,
  ): Promise<boolean> {
    const res = await this.callApi<boolean>('crm.deal.update', {
      id,
      fields,
      params: { REGISTER_SONET_EVENT: 'Y' },
    });
    return !!res.result;
  }

  async addTimelineComment(
    entityType: 'lead' | 'deal',
    entityId: number,
    comment: string,
  ): Promise<number | null> {
    try {
      const res = await this.callApi<number>('crm.timeline.comment.add', {
        fields: {
          ENTITY_ID: entityId,
          ENTITY_TYPE: entityType,
          COMMENT: comment,
        },
      });
      return res.result;
    } catch (err) {
      this.logger.warn(
        `Failed to add timeline comment to ${entityType} #${entityId}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async sendNotification(
    userId: string | number,
    message: string,
    entityContext?: { type: 'lead' | 'deal'; id: number },
  ): Promise<boolean> {
    try {
      const res = await this.callApi('im.notify.system.add', {
        USER_ID: userId,
        MESSAGE: message,
      });
      return !!res.result;
    } catch (err) {
      this.logger.warn(
        `Failed to send Bitrix24 notification to user ${userId} via IM: ${(err as Error).message}`,
      );

      // Graceful fallback to CRM timeline comment if entityContext is provided
      if (entityContext && entityContext.id) {
        this.logger.log(
          `Posting notification as timeline comment to ${entityContext.type} #${entityContext.id}`,
        );
        const commentResult = await this.addTimelineComment(
          entityContext.type,
          entityContext.id,
          `🔔 [THÔNG BÁO CHO USER ${userId}]: ${message}`,
        );
        return commentResult !== null;
      }
      return false;
    }
  }

  async getLead(id: number): Promise<any> {
    const res = await this.callApi('crm.lead.get', { id });
    return res.result;
  }

  async getDeal(id: number): Promise<any> {
    const res = await this.callApi('crm.deal.get', { id });
    return res.result;
  }
}
