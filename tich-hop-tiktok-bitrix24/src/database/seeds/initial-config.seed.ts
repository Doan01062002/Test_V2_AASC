import { DataSource } from 'typeorm';
import { ConfigurationEntity } from '../entities/configuration.entity';

export const DEFAULT_FIELD_MAPPING = {
  'lead_data.full_name': 'NAME',
  'lead_data.email': 'EMAIL[0][VALUE]',
  'lead_data.phone': 'PHONE[0][VALUE]',
  'lead_data.city': 'UF_CRM_CITY',
  'campaign.campaign_name': 'UF_CRM_UTM_CAMPAIGN',
  'campaign.ad_name': 'UF_CRM_AD_NAME',
  'lead_data.ttclid': 'UF_CRM_TTCLID',
};

export const DEFAULT_DEAL_RULES = [
  {
    id: 'rule_sale_campaign',
    name: 'Chuyển đổi Deal cho chiến dịch Sale',
    condition: "campaign.campaign_name CONTAINS 'sale'",
    action: 'create_deal',
    pipeline_id: '1',
    stage_id: 'NEW',
    probability: 30,
    assigned_to: '1',
    notify: true,
  },
  {
    id: 'rule_high_budget',
    name: 'Ưu tiên khách hàng tại Hà Nội',
    condition: "lead_data.city EQUALS 'Hà Nội'",
    action: 'create_deal',
    pipeline_id: '1',
    stage_id: 'PREPARATION',
    probability: 50,
    assigned_to: '1',
    notify: true,
  },
];

export async function seedInitialConfig(dataSource: DataSource): Promise<void> {
  const configRepo = dataSource.getRepository(ConfigurationEntity);

  const existingMapping = await configRepo.findOne({
    where: { key: 'field_mapping' },
  });
  if (!existingMapping) {
    await configRepo.save(
      configRepo.create({
        key: 'field_mapping',
        value: DEFAULT_FIELD_MAPPING,
      }),
    );
  }

  const existingRules = await configRepo.findOne({
    where: { key: 'deal_rules' },
  });
  if (!existingRules) {
    await configRepo.save(
      configRepo.create({
        key: 'deal_rules',
        value: DEFAULT_DEAL_RULES,
      }),
    );
  }
}
