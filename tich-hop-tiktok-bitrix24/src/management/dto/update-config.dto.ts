import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsObject } from 'class-validator';

export class UpdateFieldMappingsDto {
  @ApiProperty({
    description: 'Key-value map between TikTok lead fields and Bitrix24 CRM fields',
    example: { full_name: 'NAME', email: 'EMAIL', phone_number: 'PHONE' },
  })
  @IsObject()
  @IsNotEmpty()
  mappings: Record<string, string>;
}

export class UpdateDealRulesDto {
  @ApiProperty({
    description: 'Array of automation rule objects for auto deal creation',
    example: [
      {
        id: 'rule-high-value',
        name: 'High Value VIP Campaign',
        enabled: true,
        conditions: [{ field: 'campaign_id', operator: 'EQUALS', value: 'camp_vip_001' }],
        actions: { create_deal: true, stage_id: 'EXECUTING', pipeline_id: '0' },
      },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  rules: any[];
}
