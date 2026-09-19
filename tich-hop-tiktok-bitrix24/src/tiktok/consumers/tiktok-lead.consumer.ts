import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TIKTOK_LEADS_QUEUE, TIKTOK_LEADS_DLQ } from '../../queue/queue.constants';
import { TikTokService } from '../tiktok.service';
import { Bitrix24Service } from '../../bitrix24/bitrix24.service';
import { RuleEngineService } from '../../rules/rule-engine.service';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ConfigurationEntity } from '../../database/entities/configuration.entity';
import { DEFAULT_FIELD_MAPPING } from '../../database/seeds/initial-config.seed';

@Processor(TIKTOK_LEADS_QUEUE, {
  limiter: {
    max: 2,
    duration: 1000,
  },
})
export class TikTokLeadConsumer extends WorkerHost {
  private readonly logger = new Logger(TikTokLeadConsumer.name);

  constructor(
    private readonly tiktokService: TikTokService,
    private readonly bitrix24Service: Bitrix24Service,
    private readonly ruleEngineService: RuleEngineService,
    @InjectRepository(LeadEntity)
    private readonly leadRepository: Repository<LeadEntity>,
    @InjectRepository(ConfigurationEntity)
    private readonly configRepository: Repository<ConfigurationEntity>,
    @InjectQueue(TIKTOK_LEADS_DLQ)
    private readonly dlqQueue: Queue,
  ) {
    super();
  }

  private getValueByPath(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.trim().split('.');
    let current = obj;
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    return current;
  }

  async process(job: Job<{ leadId: string; payload: any }>): Promise<any> {
    const { leadId, payload } = job.data;
    this.logger.log(`Processing lead job ${job.id} for lead ${leadId}`);

    let lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      lead = await this.tiktokService.createPendingLead(payload);
    }

    const extracted = this.tiktokService.extractLeadInfo(payload);
    const normalizedPhone = this.tiktokService.normalizePhone(extracted.phone);
    const normalizedEmail = this.tiktokService.normalizeEmail(extracted.email);

    // Calculate Quality Score
    const qualityResult = this.tiktokService.calculateQualityScore({
      phone: normalizedPhone,
      email: normalizedEmail,
      city: extracted.city,
      custom_questions: extracted.customQuestions,
    });

    lead.name = extracted.name || lead.name;
    lead.phone = normalizedPhone;
    lead.email = normalizedEmail;
    lead.campaignId = extracted.campaignId || lead.campaignId;
    lead.adId = extracted.adId || lead.adId;
    lead.qualityScore = qualityResult.score;

    // Deduplication check in local DB
    const duplicate = await this.tiktokService.findDuplicate(
      normalizedEmail,
      normalizedPhone,
    );
    if (duplicate && duplicate.id !== lead.id) {
      this.logger.log(
        `Deduplication: Lead ${lead.id} duplicates existing local lead ${duplicate.id}`,
      );
      if (duplicate.bitrix24Id) {
        lead.bitrix24Id = duplicate.bitrix24Id;
      }
    }

    // Retrieve field mapping configuration
    const mappingConfig = await this.configRepository.findOne({
      where: { key: 'field_mapping' },
    });
    const fieldMapping =
      (mappingConfig?.value as Record<string, string>) || DEFAULT_FIELD_MAPPING;

    // Construct Bitrix24 fields
    const bitrixFields: Record<string, any> = {
      TITLE: `TikTok Lead - ${lead.name}`,
      NAME: lead.name,
      COMMENTS: `TikTok Lead [Quality: ${qualityResult.score} - ${qualityResult.classification}] | Source: ${lead.campaignId || 'tiktok'}`,
    };

    if (normalizedEmail) {
      bitrixFields.EMAIL = [{ VALUE: normalizedEmail, VALUE_TYPE: 'WORK' }];
    }
    if (normalizedPhone) {
      bitrixFields.PHONE = [{ VALUE: normalizedPhone, VALUE_TYPE: 'WORK' }];
    }

    // Map custom fields
    for (const [sourcePath, targetField] of Object.entries(fieldMapping)) {
      if (
        targetField.startsWith('NAME') ||
        targetField.startsWith('EMAIL') ||
        targetField.startsWith('PHONE')
      ) {
        continue; // Handled explicitly
      }
      const val = this.getValueByPath(payload, sourcePath);
      if (val !== undefined && val !== null) {
        bitrixFields[targetField] = val;
      }
    }

    // Bitrix24 Deduplication & Sync
    let bitrixId = lead.bitrix24Id;
    try {
      if (!bitrixId) {
        const existingBitrixLead =
          await this.bitrix24Service.findLeadByEmailOrPhone(
            normalizedEmail,
            normalizedPhone,
          );
        if (existingBitrixLead) {
          bitrixId = parseInt(existingBitrixLead.ID, 10);
          this.logger.log(
            `Found existing Bitrix24 lead ID ${bitrixId}. Merging info.`,
          );
        }
      }

      if (bitrixId) {
        await this.bitrix24Service.updateLead(bitrixId, bitrixFields);
        lead.bitrix24Id = bitrixId;
      } else {
        const createdId = await this.bitrix24Service.createLead(bitrixFields);
        lead.bitrix24Id = createdId;
        this.logger.log(`Created Bitrix24 lead with ID ${createdId}`);
      }

      // Add timeline comment and source tracking to Bitrix24 Lead
      if (lead.bitrix24Id) {
        await this.bitrix24Service.addTimelineComment(
          'lead',
          lead.bitrix24Id,
          `📌 [TikTok Lead Source Tracking]\n- Chiến dịch: ${extracted.campaignId || 'tiktok'}\n- Ad ID: ${extracted.adId || 'N/A'}\n- Form: ${extracted.formName || extracted.formId || 'N/A'}\n- Điểm chất lượng: ${qualityResult.score}/100 (${qualityResult.classification})\n- SĐT: ${normalizedPhone || 'N/A'} | Email: ${normalizedEmail || 'N/A'}`,
        );
      }

      // Rule Engine: Process conversion to Deal
      const createdDeals = await this.ruleEngineService.processLeadRules(lead);
      lead.status = createdDeals.length > 0 ? 'converted' : 'processed';

      await this.leadRepository.save(lead);

      this.logger.log(
        `Completed processing lead ${lead.id} (Bitrix24: ${lead.bitrix24Id}, Deals: ${createdDeals.length}, Quality: ${lead.qualityScore})`,
      );

      return {
        leadId: lead.id,
        bitrix24Id: lead.bitrix24Id,
        status: lead.status,
        qualityScore: lead.qualityScore,
        dealsCreated: createdDeals.length,
      };
    } catch (err) {
      this.logger.error(
        `Failed to process lead ${lead.id}: ${(err as Error).message}`,
      );

      const maxAttempts = job.opts?.attempts || 3;
      if (job.attemptsMade + 1 >= maxAttempts) {
        this.logger.warn(`Exhausted all retries for lead ${lead.id}. Transferring to DLQ.`);
        try {
          if (this.dlqQueue) {
            await this.dlqQueue.add('failed-tiktok-lead', {
              leadId: lead.id,
              payload,
              error: (err as Error).message,
              failedAt: new Date(),
            });
          }
        } catch (dlqErr) {
          this.logger.error(`Failed to push to DLQ: ${(dlqErr as Error).message}`);
        }
        lead.status = 'failed';
        await this.leadRepository.save(lead);
      }

      throw err;
    }
  }
}
