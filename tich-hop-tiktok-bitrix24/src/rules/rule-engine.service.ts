import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bitrix24Service } from '../bitrix24/bitrix24.service';
import { DealEntity } from '../database/entities/deal.entity';
import { ConfigurationEntity } from '../database/entities/configuration.entity';
import { LeadEntity } from '../database/entities/lead.entity';
import { RuleDefinition, RuleEvaluationContext } from './rule-engine.interface';
import { DEFAULT_DEAL_RULES } from '../database/seeds/initial-config.seed';

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    private readonly bitrix24Service: Bitrix24Service,
    @InjectRepository(DealEntity)
    private readonly dealRepository: Repository<DealEntity>,
    @InjectRepository(ConfigurationEntity)
    private readonly configRepository: Repository<ConfigurationEntity>,
  ) {}

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

  evaluateCondition(condition: string, context: RuleEvaluationContext): boolean {
    if (!condition || typeof condition !== 'string') return false;

    // 1. CONTAINS
    const containsMatch = condition.match(/^(.+?)\s+CONTAINS\s+['"](.+?)['"]$/i);
    if (containsMatch) {
      const fieldPath = containsMatch[1].trim();
      const targetVal = containsMatch[2].toLowerCase();
      const actualVal = String(this.getValueByPath(context, fieldPath) || '').toLowerCase();
      return actualVal.includes(targetVal);
    }

    // 2. EQUALS or ==
    const equalsMatch = condition.match(/^(.+?)\s+(?:EQUALS|==)\s+['"]?([^'"]+?)['"]?$/i);
    if (equalsMatch) {
      const fieldPath = equalsMatch[1].trim();
      const targetVal = equalsMatch[2].trim().toLowerCase();
      const actualVal = String(this.getValueByPath(context, fieldPath) || '').trim().toLowerCase();
      return actualVal === targetVal;
    }

    // 3. NOT EQUALS != or <>
    const neMatch = condition.match(/^(.+?)\s+(?:!=|<>)\s+['"]?([^'"]+?)['"]?$/i);
    if (neMatch) {
      const fieldPath = neMatch[1].trim();
      const targetVal = neMatch[2].trim().toLowerCase();
      const actualVal = String(this.getValueByPath(context, fieldPath) || '').trim().toLowerCase();
      return actualVal !== targetVal;
    }

    // 4. GREATER THAN EQUAL >=
    const gteMatch = condition.match(/^(.+?)\s*>=\s*([0-9.]+)$/);
    if (gteMatch) {
      const fieldPath = gteMatch[1].trim();
      const targetVal = parseFloat(gteMatch[2]);
      const actualVal = parseFloat(this.getValueByPath(context, fieldPath));
      return !isNaN(actualVal) && actualVal >= targetVal;
    }

    // 5. LESS THAN EQUAL <=
    const lteMatch = condition.match(/^(.+?)\s*<=\s*([0-9.]+)$/);
    if (lteMatch) {
      const fieldPath = lteMatch[1].trim();
      const targetVal = parseFloat(lteMatch[2]);
      const actualVal = parseFloat(this.getValueByPath(context, fieldPath));
      return !isNaN(actualVal) && actualVal <= targetVal;
    }

    // 6. GREATER THAN >
    const gtMatch = condition.match(/^(.+?)\s*>\s*([0-9.]+)$/);
    if (gtMatch) {
      const fieldPath = gtMatch[1].trim();
      const targetVal = parseFloat(gtMatch[2]);
      const actualVal = parseFloat(this.getValueByPath(context, fieldPath));
      return !isNaN(actualVal) && actualVal > targetVal;
    }

    // 7. LESS THAN <
    const ltMatch = condition.match(/^(.+?)\s*<\s*([0-9.]+)$/);
    if (ltMatch) {
      const fieldPath = ltMatch[1].trim();
      const targetVal = parseFloat(ltMatch[2]);
      const actualVal = parseFloat(this.getValueByPath(context, fieldPath));
      return !isNaN(actualVal) && actualVal < targetVal;
    }

    // 8. IN array: field IN ['A', 'B']
    const inMatch = condition.match(/^(.+?)\s+IN\s+\[(.*?)\]$/i);
    if (inMatch) {
      const fieldPath = inMatch[1].trim();
      const arrayRaw = inMatch[2];
      const items = arrayRaw
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, '').toLowerCase());
      const actualVal = String(this.getValueByPath(context, fieldPath) || '').trim().toLowerCase();
      return items.includes(actualVal);
    }

    this.logger.warn(`Unrecognized condition format: ${condition}`);
    return false;
  }

  async getRules(): Promise<RuleDefinition[]> {
    const config = await this.configRepository.findOne({
      where: { key: 'deal_rules' },
    });
    if (config && Array.isArray(config.value)) {
      return config.value as RuleDefinition[];
    }
    return DEFAULT_DEAL_RULES as RuleDefinition[];
  }

  async processLeadRules(lead: LeadEntity): Promise<DealEntity[]> {
    const rules = await this.getRules();
    const createdDeals: DealEntity[] = [];

    const rawData = lead.rawData || {};
    const context: RuleEvaluationContext = {
      lead,
      lead_data: rawData.lead_data || {},
      campaign: rawData.campaign || {},
      form: rawData.form || {},
      quality_score: lead.qualityScore,
      qualityScore: lead.qualityScore,
    };

    for (const rule of rules) {
      const matches = this.evaluateCondition(rule.condition, context);
      if (matches && rule.action === 'create_deal') {
        this.logger.log(
          `Rule matched: "${rule.name}" (${rule.id}) for Lead ${lead.name} (${lead.id})`,
        );

        let bitrixDealId: number | null = null;
        try {
          bitrixDealId = await this.bitrix24Service.createDeal({
            TITLE: `Deal - ${lead.name}`,
            STAGE_ID: rule.stage_id || 'NEW',
            CATEGORY_ID: rule.pipeline_id || '0',
            LEAD_ID: lead.bitrix24Id || undefined,
            ASSIGNED_BY_ID: rule.assigned_to || '1',
            PROBABILITY: rule.probability || 30,
            OPPORTUNITY: 0,
            COMMENTS: `Converted automatically by Rule Engine [${rule.name}]`,
          });
        } catch (err) {
          this.logger.warn(
            `Failed to create Deal on Bitrix24: ${(err as Error).message}`,
          );
        }

        const deal = this.dealRepository.create({
          leadId: lead.id,
          lead,
          bitrix24Id: bitrixDealId || undefined,
          title: `Deal - ${lead.name}`,
          stage: rule.stage_id || 'NEW',
          probability: rule.probability || 30,
          assignedTo: rule.assigned_to || '1',
          currency: 'VND',
          amount: 0,
        });

        const savedDeal = await this.dealRepository.save(deal);
        createdDeals.push(savedDeal);

        // Update Bitrix24 Lead status to CONVERTED and log timeline
        if (lead.bitrix24Id) {
          try {
            await this.bitrix24Service.updateLead(lead.bitrix24Id, {
              STATUS_ID: 'CONVERTED',
            });
            await this.bitrix24Service.addTimelineComment(
              'lead',
              lead.bitrix24Id,
              `[Chuyển Đổi Thành Deal] Đã tự động tạo Deal #${bitrixDealId || 'Local'} (${rule.name})`,
            );
          } catch (updateErr) {
            this.logger.warn(`Failed to update Bitrix24 lead status: ${(updateErr as Error).message}`);
          }
        }

        if (bitrixDealId) {
          await this.bitrix24Service.addTimelineComment(
            'deal',
            bitrixDealId,
            `[Tạo tự động từ TikTok] Khách: ${lead.name} | SĐT: ${lead.phone || 'N/A'} | Quality Score: ${lead.qualityScore} | Luật: "${rule.name}"`,
          );
        }

        if (rule.notify && rule.assigned_to) {
          await this.bitrix24Service.sendNotification(
            rule.assigned_to,
            `[Deal Converted] Khách hàng ${lead.name} (${lead.phone || lead.email}) vừa được tạo Deal tự động từ TikTok!`,
            bitrixDealId ? { type: 'deal', id: bitrixDealId } : undefined,
          );
        }
      }
    }

    return createdDeals;
  }
}
