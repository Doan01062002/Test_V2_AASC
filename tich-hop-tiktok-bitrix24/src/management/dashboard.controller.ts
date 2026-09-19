import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { join } from 'path';
import * as fs from 'fs';

@ApiTags('Management')
@Controller('dashboard')
export class DashboardController {
  @Get()
  @ApiOperation({ summary: 'Open Web Dashboard UI' })
  getDashboard(@Res() res: Response) {
    const htmlPath = join(process.cwd(), 'public', 'index.html');
    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    }
    return res.send(`
      <html>
        <body>
          <h1>TikTok to Bitrix24 Integration Dashboard</h1>
          <p>Please ensure public/index.html exists.</p>
        </body>
      </html>
    `);
  }
}
