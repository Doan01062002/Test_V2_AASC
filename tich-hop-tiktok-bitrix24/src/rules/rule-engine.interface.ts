export interface RuleDefinition {
  id: string;
  name: string;
  condition: string;
  action: 'create_deal' | string;
  pipeline_id?: string | number;
  stage_id?: string;
  probability?: number;
  assigned_to?: string;
  notify?: boolean;
}

export interface RuleEvaluationContext {
  lead?: any;
  campaign?: any;
  lead_data?: any;
  form?: any;
  quality_score?: number;
  [key: string]: any;
}
