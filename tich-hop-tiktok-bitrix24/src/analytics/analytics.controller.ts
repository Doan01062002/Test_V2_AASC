import { Controller, Get, Post, Query, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';

import { ExportReportQueryDto } from './dto/export-report.dto';

@ApiTags('Analytics')
@Controller('api/v1')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('analytics/conversion-rates')
  @ApiOperation({
    summary: 'Get conversion rates from TikTok leads to Won Deals',
  })
  @ApiResponse({ status: 200, description: 'Return conversion rate metrics' })
  async getConversionRates() {
    return this.analyticsService.getConversionRates();
  }

  @Get('analytics/campaign-performance')
  @ApiOperation({
    summary: 'Get marketing performance metrics per campaign (CPL, ROI, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Return campaign performance statistics',
  })
  async getCampaignPerformance() {
    return this.analyticsService.getCampaignPerformance();
  }

  @Get('reports/export')
  @ApiOperation({
    summary: 'Export lead and conversion report in CSV (with UTF-8 BOM) or JSON format',
  })
  @ApiResponse({ status: 200, description: 'Download CSV file or get JSON report' })
  async exportReport(
    @Query() query: ExportReportQueryDto | string,
    @Res() res: Response | string,
    legacyDateRangeOrRes?: string | Response,
    legacyRes?: Response,
  ) {
    let format = 'csv';
    let dateRange = '30d';
    let responseObj: Response;

    if (typeof query === 'string') {
      format = query;
      dateRange = typeof res === 'string' ? res : '30d';
      responseObj = (legacyDateRangeOrRes as Response) || legacyRes || (res as Response);
    } else {
      format = String(query?.format || 'csv');
      dateRange = String(query?.date_range || '30d');
      responseObj = res as Response;
    }

    if (format.toLowerCase() === 'json') {
      const jsonReport = await this.analyticsService.exportJsonReport(dateRange);
      return responseObj.status(HttpStatus.OK).json(jsonReport);
    }

    const csvData = await this.analyticsService.exportCsv(dateRange);
    const filename = `tiktok-leads-report-${dateRange}.csv`;

    responseObj.setHeader('Content-Type', 'text/csv; charset=utf-8');
    responseObj.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return responseObj.status(HttpStatus.OK).send(csvData);
  }

  @Get('reports/scheduled-summary')
  @ApiOperation({
    summary: 'Get automated daily/scheduled performance summary',
    description: 'Returns real-time KPIs and top campaigns for automated reporting',
  })
  @ApiResponse({ status: 200, description: 'Scheduled report summary' })
  async getScheduledSummary() {
    return this.analyticsService.getScheduledReportSummary();
  }

  @Post('reports/trigger-alert')
  @ApiOperation({
    summary: 'Trigger automated notification/alert to Bitrix24',
    description: 'Evaluates system metrics and alerts sales managers on Bitrix24 CRM',
  })
  @ApiResponse({ status: 200, description: 'Alert triggered successfully' })
  async triggerAlert() {
    return this.analyticsService.triggerAutomatedAlert();
  }
}
