import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ConvertLeadToDealDto {
  @ApiPropertyOptional({ description: 'Deal Pipeline/Category ID', example: '0' })
  @IsOptional()
  @IsString()
  pipeline_id?: string;

  @ApiPropertyOptional({ description: 'Deal Stage ID', example: 'NEW' })
  @IsOptional()
  @IsString()
  stage_id?: string;

  @ApiPropertyOptional({ description: 'Custom deal title', example: 'Deal - VIP Customer' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Deal monetary amount', example: 5000000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: 'Assigned Bitrix24 User ID', example: '1' })
  @IsOptional()
  @IsString()
  assigned_to?: string;
}
