import { Body, Controller, Get, Post, Put, Res } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { SyncTriggerType } from '../database/entities/sync-log.entity';
import { SyncEngineService } from '../sync/sync-engine.service';
import { AdminService } from './admin.service';

@Controller()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly syncEngine: SyncEngineService,
  ) {}

  @Get('admin')
  serveDashboard(@Res() res: Response) {
    const htmlPath = path.resolve(process.cwd(), 'public', 'index.html');
    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    }
    return res.status(404).send('Admin dashboard HTML not found.');
  }

  @Get('api/admin/stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('api/admin/logs')
  async getLogs() {
    return this.adminService.getLogs();
  }

  @Get('api/admin/mapping')
  async getMapping() {
    return this.adminService.getMapping();
  }

  @Put('api/admin/mapping')
  async updateMapping(@Body() body: any) {
    return this.adminService.updateMapping(body);
  }

  @Post('api/admin/trigger-sync')
  async triggerSync(@Body() body: { full?: boolean; dryRun?: boolean }) {
    return this.syncEngine.executeSync({
      forceFullSync: Boolean(body?.full),
      dryRun: Boolean(body?.dryRun),
      triggerType: SyncTriggerType.MANUAL,
    });
  }
}
