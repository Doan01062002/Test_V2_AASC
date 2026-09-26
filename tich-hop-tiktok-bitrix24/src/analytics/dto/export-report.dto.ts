import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}

export enum ReportDateRange {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  ALL = 'all',
}

export class ExportReportQueryDto {
  @ApiPropertyOptional({
    description: 'Export format: csv or json',
    enum: ExportFormat,
    default: ExportFormat.CSV,
    example: 'csv',
  })
  @IsOptional()
  @IsEnum(ExportFormat)
  format: ExportFormat = ExportFormat.CSV;

  @ApiPropertyOptional({
    description: 'Date range filter for leads report',
    enum: ReportDateRange,
    default: ReportDateRange.THIRTY_DAYS,
    example: '30d',
  })
  @IsOptional()
  @IsEnum(ReportDateRange)
  date_range: ReportDateRange = ReportDateRange.THIRTY_DAYS;
}
