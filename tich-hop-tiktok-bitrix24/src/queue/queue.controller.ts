import { Controller, Get, Post, Delete, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  TIKTOK_LEADS_QUEUE,
  TIKTOK_LEADS_DLQ,
  PROCESS_TIKTOK_LEAD,
} from './queue.constants';

@ApiTags('Management')
@Controller('api/v1/queue')
export class QueueController {
  private readonly logger = new Logger(QueueController.name);

  constructor(
    @InjectQueue(TIKTOK_LEADS_QUEUE)
    private readonly leadsQueue: Queue,
    @InjectQueue(TIKTOK_LEADS_DLQ)
    private readonly dlqQueue: Queue,
  ) {}

  @Get('dlq')
  @ApiOperation({ summary: 'List failed jobs in Dead Letter Queue (DLQ)' })
  @ApiResponse({ status: 200, description: 'Return list of jobs in DLQ' })
  async getDlqJobs() {
    const jobs = await this.dlqQueue.getJobs([
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    ]);
    return {
      total: jobs.length,
      queue: TIKTOK_LEADS_DLQ,
      jobs: jobs.map((j) => ({
        id: j.id,
        name: j.name,
        data: j.data,
        failedReason: j.failedReason,
        attemptsMade: j.attemptsMade,
        timestamp: j.timestamp,
      })),
    };
  }

  @Post('dlq/retry')
  @ApiOperation({ summary: 'Retry all failed jobs from Dead Letter Queue' })
  @ApiResponse({
    status: 200,
    description: 'Failed jobs re-queued into main processing queue',
  })
  async retryDlqJobs() {
    const jobs = await this.dlqQueue.getJobs([
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    ]);
    let reQueued = 0;

    for (const j of jobs) {
      if (j.data?.leadId && j.data?.payload) {
        await this.leadsQueue.add(PROCESS_TIKTOK_LEAD, {
          leadId: j.data.leadId,
          payload: j.data.payload,
        });
        await j.remove();
        reQueued++;
      }
    }

    this.logger.log(`Retried ${reQueued} jobs from DLQ`);

    return {
      success: true,
      retried_count: reQueued,
      message: `Đã đưa lại ${reQueued} job từ DLQ vào hàng đợi xử lý chính`,
    };
  }

  @Delete('dlq')
  @ApiOperation({ summary: 'Purge all jobs from Dead Letter Queue' })
  @ApiResponse({ status: 200, description: 'DLQ purged successfully' })
  async clearDlq() {
    await this.dlqQueue.drain();
    await this.dlqQueue.clean(0, 1000, 'completed');
    await this.dlqQueue.clean(0, 1000, 'failed');
    return {
      success: true,
      message: 'Đã xóa sạch toàn bộ jobs trong DLQ',
    };
  }
}
