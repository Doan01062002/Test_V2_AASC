import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadEntity } from '../database/entities/lead.entity';
import { DealEntity } from '../database/entities/deal.entity';

export interface QualityDistribution {
  Hot: number;
  Warm: number;
  Cold: number;
}

export interface ConversionRatesResult {
  total_leads: number;
  converted_leads: number;
  total_deals: number;
  deals_won: number;
  conversion_rate_lead_to_deal: number;
  conversion_rate_deal_to_won: number;
  overall_conversion_rate: number;
  quality_distribution: QualityDistribution;
}

export interface CampaignPerformanceItem {
  campaign_id: string;
  campaign_name: string;
  total_leads: number;
  total_deals: number;
  deals_won: number;
  total_revenue: number;
  estimated_spend: number;
  cost_per_lead: number;
  roi: number;
  conversion_rate: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(LeadEntity)
    private readonly leadRepository: Repository<LeadEntity>,
    @InjectRepository(DealEntity)
    private readonly dealRepository: Repository<DealEntity>,
  ) {}

  async getConversionRates(): Promise<ConversionRatesResult> {
    const leads = await this.leadRepository.find();
    const deals = await this.dealRepository.find();

    const totalLeads = leads.length;
    const totalDeals = deals.length;
    const convertedLeads = leads.filter(
      (l) => l.status === 'converted' || (l.deals && l.deals.length > 0),
    ).length;

    const dealsWon = deals.filter(
      (d) =>
        d.stage &&
        (d.stage.toUpperCase().includes('WON') ||
          d.stage.toUpperCase() === 'SUCCESS'),
    ).length;

    const leadToDealRate =
      totalLeads > 0
        ? parseFloat(((totalDeals / totalLeads) * 100).toFixed(2))
        : 0;
    const dealToWonRate =
      totalDeals > 0
        ? parseFloat(((dealsWon / totalDeals) * 100).toFixed(2))
        : 0;
    const overallRate =
      totalLeads > 0
        ? parseFloat(((dealsWon / totalLeads) * 100).toFixed(2))
        : 0;

    const qualityDistribution: QualityDistribution = {
      Hot: 0,
      Warm: 0,
      Cold: 0,
    };

    for (const lead of leads) {
      const score = lead.qualityScore || 0;
      if (score >= 70) {
        qualityDistribution.Hot++;
      } else if (score >= 50) {
        qualityDistribution.Warm++;
      } else {
        qualityDistribution.Cold++;
      }
    }

    return {
      total_leads: totalLeads,
      converted_leads: convertedLeads,
      total_deals: totalDeals,
      deals_won: dealsWon,
      conversion_rate_lead_to_deal: leadToDealRate,
      conversion_rate_deal_to_won: dealToWonRate,
      overall_conversion_rate: overallRate,
      quality_distribution: qualityDistribution,
    };
  }

  async getCampaignPerformance(): Promise<CampaignPerformanceItem[]> {
    const leads = await this.leadRepository.find({
      relations: ['deals'],
    });

    const campaignMap = new Map<
      string,
      {
        campaign_name: string;
        leads: LeadEntity[];
      }
    >();

    for (const lead of leads) {
      const campaignId =
        lead.campaignId ||
        lead.rawData?.campaign?.campaign_id ||
        'organic_tiktok';
      const campaignName =
        lead.rawData?.campaign?.campaign_name ||
        lead.campaignId ||
        'Chiến dịch TikTok Tự nhiên';

      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, {
          campaign_name: campaignName,
          leads: [],
        });
      }

      campaignMap.get(campaignId)!.leads.push(lead);
    }

    const performanceList: CampaignPerformanceItem[] = [];

    for (const [campaignId, group] of campaignMap.entries()) {
      const totalLeads = group.leads.length;
      let totalDeals = 0;
      let dealsWon = 0;
      let totalRevenue = 0;

      for (const lead of group.leads) {
        if (Array.isArray(lead.deals)) {
          totalDeals += lead.deals.length;
          for (const deal of lead.deals) {
            totalRevenue += Number(deal.amount) || 0;
            if (
              deal.stage &&
              (deal.stage.toUpperCase().includes('WON') ||
                deal.stage.toUpperCase() === 'SUCCESS')
            ) {
              dealsWon++;
            }
          }
        }
      }

      // Estimated spend baseline: 50,000 VND per lead
      const estimatedSpend = totalLeads * 50000;
      const costPerLead = totalLeads > 0 ? estimatedSpend / totalLeads : 0;
      const roi =
        estimatedSpend > 0
          ? parseFloat(
              (((totalRevenue - estimatedSpend) / estimatedSpend) * 100).toFixed(
                2,
              ),
            )
          : 0;
      const conversionRate =
        totalLeads > 0
          ? parseFloat(((totalDeals / totalLeads) * 100).toFixed(2))
          : 0;

      performanceList.push({
        campaign_id: campaignId,
        campaign_name: group.campaign_name,
        total_leads: totalLeads,
        total_deals: totalDeals,
        deals_won: dealsWon,
        total_revenue: totalRevenue,
        estimated_spend: estimatedSpend,
        cost_per_lead: costPerLead,
        roi,
        conversion_rate: conversionRate,
      });
    }

    return performanceList;
  }

  async exportCsv(dateRange: string = '30d'): Promise<string> {
    const qb = this.leadRepository.createQueryBuilder('lead')
      .leftJoinAndSelect('lead.deals', 'deals')
      .orderBy('lead.createdAt', 'DESC');

    if (dateRange && dateRange !== 'all') {
      const daysMatch = dateRange.match(/^(\d+)d$/i);
      if (daysMatch) {
        const days = parseInt(daysMatch[1], 10);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        qb.where('lead.createdAt >= :cutoffDate', { cutoffDate });
      }
    }

    const leads = await qb.getMany();

    // Headers
    const headers = [
      'Lead ID',
      'TikTok Event ID',
      'Họ và Tên',
      'Email',
      'Số điện thoại',
      'Chiến dịch',
      'Điểm chất lượng (Score)',
      'Phân loại Lead',
      'Trạng thái',
      'Bitrix24 Lead ID',
      'Bitrix24 Deal ID',
      'Doanh thu Deal (VND)',
      'Ngày tạo',
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows: string[] = [];
    rows.push(headers.map(escapeCsv).join(','));

    for (const lead of leads) {
      const score = lead.qualityScore || 0;
      const classification =
        score >= 70 ? 'Hot Lead' : score >= 50 ? 'Warm Lead' : 'Cold Lead';

      const firstDeal =
        Array.isArray(lead.deals) && lead.deals.length > 0
          ? lead.deals[0]
          : null;
      const bitrixDealId = firstDeal?.bitrix24Id || '';
      const dealAmount = firstDeal?.amount || 0;

      const campaignName =
        lead.rawData?.campaign?.campaign_name || lead.campaignId || '';

      const createdAtStr = lead.createdAt
        ? new Date(lead.createdAt).toLocaleString('vi-VN')
        : '';

      const row = [
        lead.id,
        lead.externalId,
        lead.name,
        lead.email || '',
        lead.phone || '',
        campaignName,
        score,
        classification,
        lead.status,
        lead.bitrix24Id || '',
        bitrixDealId,
        dealAmount,
        createdAtStr,
      ];

      rows.push(row.map(escapeCsv).join(','));
    }

    // Prepend UTF-8 BOM (\uFEFF) so Excel opens UTF-8 properly without font corruption
    return '\uFEFF' + rows.join('\r\n');
  }
}
