import { Test, TestingModule } from '@nestjs/testing';
import { QueueController } from './queue.controller';
import { getQueueToken } from '@nestjs/bullmq';
import { TIKTOK_LEADS_QUEUE, TIKTOK_LEADS_DLQ } from './queue.constants';

describe('QueueController', () => {
  let controller: QueueController;
  let leadsQueue: any;
  let dlqQueue: any;

  beforeEach(async () => {
    leadsQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-main-1' }),
    };

    dlqQueue = {
      getJobs: jest.fn().mockResolvedValue([
        {
          id: 'dlq-1',
          name: 'failed-lead',
          data: { leadId: 'lead-1', payload: { name: 'Lead 1' } },
          failedReason: 'Network error',
          attemptsMade: 3,
          timestamp: Date.now(),
          remove: jest.fn().mockResolvedValue(true),
        },
      ]),
      drain: jest.fn().mockResolvedValue(true),
      clean: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueController],
      providers: [
        { provide: getQueueToken(TIKTOK_LEADS_QUEUE), useValue: leadsQueue },
        { provide: getQueueToken(TIKTOK_LEADS_DLQ), useValue: dlqQueue },
      ],
    }).compile();

    controller = module.get<QueueController>(QueueController);
  });

  it('should list jobs in DLQ', async () => {
    const res = await controller.getDlqJobs();
    expect(res.total).toBe(1);
    expect(res.queue).toBe(TIKTOK_LEADS_DLQ);
    expect(res.jobs[0].id).toBe('dlq-1');
  });

  it('should retry jobs from DLQ', async () => {
    const res = await controller.retryDlqJobs();
    expect(res.success).toBe(true);
    expect(res.retried_count).toBe(1);
    expect(leadsQueue.add).toHaveBeenCalled();
  });

  it('should purge DLQ jobs', async () => {
    const res = await controller.clearDlq();
    expect(res.success).toBe(true);
    expect(dlqQueue.drain).toHaveBeenCalled();
  });
});
