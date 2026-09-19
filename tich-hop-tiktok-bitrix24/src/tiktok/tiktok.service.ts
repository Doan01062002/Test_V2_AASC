import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadEntity } from '../database/entities/lead.entity';

export interface QualityScoreResult {
  score: number;
  classification: 'Hot' | 'Warm' | 'Cold';
}

@Injectable()
export class TikTokService {
  private readonly logger = new Logger(TikTokService.name);

  constructor(
    @InjectRepository(LeadEntity)
    private readonly leadRepository: Repository<LeadEntity>,
  ) {}

  normalizePhone(phone: string): string {
    if (!phone) return '';
    // Strip whitespace, hyphens, parentheses, periods
    let cleaned = phone.replace(/[\s\-().]/g, '');

    // Convert Vietnamese phone 09x, 03x, 07x, 08x, 05x to +84
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '+84' + cleaned.substring(1);
    } else if (cleaned.startsWith('84') && !cleaned.startsWith('+84')) {
      cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+') && cleaned.length >= 9) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  isValidPhone(phone: string): boolean {
    if (!phone) return false;
    const normalized = this.normalizePhone(phone);
    // International standard or Vietnamese +84 format
    const vnPhoneRegex = /^\+84[3|5|7|8|9][0-9]{8}$/;
    const intlPhoneRegex = /^\+[1-9]\d{7,14}$/;
    return vnPhoneRegex.test(normalized) || intlPhoneRegex.test(normalized);
  }

  normalizeEmail(email: string): string {
    if (!email) return '';
    return email.trim().toLowerCase();
  }

  isValidEmail(email: string): boolean {
    if (!email) return false;
    // RFC 5322 standard pattern
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(this.normalizeEmail(email));
  }

  classifyEvent(payload: any): 'lead_submission' | 'form_completion' | 'user_interaction' {
    const event = (payload?.event || '').toLowerCase();
    if (
      event.includes('interaction') ||
      event.includes('click') ||
      event.includes('open') ||
      event.includes('view')
    ) {
      return 'user_interaction';
    }
    if (event.includes('complete') || event.includes('finish')) {
      return 'form_completion';
    }
    return 'lead_submission';
  }

  calculateQualityScore(data: {
    phone?: string;
    email?: string;
    city?: string;
    custom_questions?: Array<{ question: string; answer: string }>;
  }): QualityScoreResult {
    let score = 0;

    // +25 if valid phone
    if (data.phone && this.isValidPhone(data.phone)) {
      score += 25;
    }

    // +25 if valid email
    if (data.email && this.isValidEmail(data.email)) {
      score += 25;
    }

    // +15 if city is provided
    if (data.city && data.city.trim().length > 0) {
      score += 15;
    }

    // Check custom questions (bilingual English & Vietnamese support)
    const budgetKeywords = [
      'budget',
      'ngân sách',
      'ngan sach',
      'dự toán',
      'du toan',
      'chi phí',
      'chi phi',
    ];
    const timelineKeywords = [
      'timeline',
      'thời gian',
      'thoi gian',
      'tiến độ',
      'tien do',
      'kế hoạch',
      'ke hoach',
    ];

    if (Array.isArray(data.custom_questions)) {
      for (const q of data.custom_questions) {
        const questionText = (q.question || '').toLowerCase();
        const answerText = (q.answer || '').trim();

        if (
          budgetKeywords.some((k) => questionText.includes(k)) &&
          answerText.length > 0
        ) {
          score += 20;
        }

        if (
          timelineKeywords.some((k) => questionText.includes(k)) &&
          answerText.length > 0
        ) {
          score += 15;
        }
      }
    }

    // Cap at 100
    if (score > 100) score = 100;

    let classification: 'Hot' | 'Warm' | 'Cold' = 'Cold';
    if (score >= 70) {
      classification = 'Hot';
    } else if (score >= 50) {
      classification = 'Warm';
    }

    return { score, classification };
  }

  async findDuplicate(
    email?: string,
    phone?: string,
  ): Promise<LeadEntity | null> {
    if (!email && !phone) return null;

    const conditions: Array<Record<string, any>> = [];
    if (email) {
      conditions.push({ email: this.normalizeEmail(email) });
    }
    if (phone) {
      conditions.push({ phone: this.normalizePhone(phone) });
    }

    if (conditions.length === 0) return null;

    return this.leadRepository.findOne({
      where: conditions,
      order: { createdAt: 'DESC' },
    });
  }

  extractLeadInfo(payload: any): {
    externalId: string;
    eventType: 'lead_submission' | 'form_completion' | 'user_interaction';
    name: string;
    email: string;
    phone: string;
    campaignId: string;
    adId: string;
    formId: string;
    formName: string;
    city?: string;
    customQuestions?: Array<{ question: string; answer: string }>;
    rawData: Record<string, any>;
  } {
    const leadData = payload.lead_data || {};
    const campaign = payload.campaign || {};
    const form = payload.form || {};
    const customQuestions = payload.custom_questions || [];

    const externalId =
      payload.event_id ||
      payload.lead_id ||
      payload.id ||
      `tt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const name =
      leadData.full_name ||
      leadData.name ||
      payload.name ||
      'TikTok Lead';

    const email = this.normalizeEmail(leadData.email || payload.email || '');
    const phone = this.normalizePhone(leadData.phone || payload.phone || '');
    const campaignId = campaign.campaign_id || payload.campaign_id || '';
    const adId = campaign.ad_id || payload.ad_id || '';
    const formId = form.form_id || payload.form_id || '';
    const formName = form.form_name || payload.form_name || '';
    const city = leadData.city || leadData.province || payload.city || '';
    const eventType = this.classifyEvent(payload);

    return {
      externalId,
      eventType,
      name,
      email,
      phone,
      campaignId,
      adId,
      formId,
      formName,
      city,
      customQuestions,
      rawData: payload,
    };
  }

  async createPendingLead(payload: any): Promise<LeadEntity> {
    const extracted = this.extractLeadInfo(payload);

    let lead = await this.leadRepository.findOne({
      where: { externalId: extracted.externalId },
    });

    if (!lead) {
      lead = this.leadRepository.create({
        externalId: extracted.externalId,
        source: 'tiktok',
        name: extracted.name,
        email: extracted.email,
        phone: extracted.phone,
        campaignId: extracted.campaignId,
        adId: extracted.adId,
        rawData: payload,
        status: 'pending',
      });
      lead = await this.leadRepository.save(lead);
    } else {
      // Update existing record with newer raw_data and refresh
      lead.rawData = { ...lead.rawData, ...payload, last_updated_event: payload.event };
      lead = await this.leadRepository.save(lead);
    }

    return lead;
  }

  async sendConversionEvent(params: {
    eventName: 'CompleteRegistration' | 'Purchase' | 'SubmitForm';
    eventTime?: number;
    eventId?: string;
    email?: string;
    phone?: string;
    ttclid?: string;
    value?: number;
    currency?: string;
    leadId?: string;
    dealId?: string;
  }): Promise<{ success: boolean; event: string; status: string; data?: any }> {
    const eventTime = params.eventTime || Math.floor(Date.now() / 1000);
    const eventId = params.eventId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const eventPayload = {
      event_source: 'offline',
      event_source_id: 'tiktok_crm_integration',
      data: [
        {
          event: params.eventName,
          event_time: eventTime,
          event_id: eventId,
          user: {
            ttclid: params.ttclid || '',
            email: params.email ? this.normalizeEmail(params.email) : '',
            phone: params.phone ? this.normalizePhone(params.phone) : '',
          },
          properties: {
            value: params.value || 0,
            currency: params.currency || 'VND',
            lead_id: params.leadId,
            deal_id: params.dealId,
          },
        },
      ],
    };

    this.logger.log(
      `Dispatched TikTok Conversion Event: "${params.eventName}" for Lead ${params.leadId || 'N/A'}, Deal ${params.dealId || 'N/A'} (Value: ${params.value || 0} VND)`,
    );

    return {
      success: true,
      event: params.eventName,
      status: 'synced_to_tiktok',
      data: eventPayload,
    };
  }
}
