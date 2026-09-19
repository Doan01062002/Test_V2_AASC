import { Test, TestingModule } from '@nestjs/testing';
import { SyncJobStatus, SyncTriggerType } from '../database/entities/sync-log.entity';
import { SyncEngineService } from './sync-engine.service';
import { SyncController } from './sync.controller';

describe('SyncController', () => {
  let controller: SyncController;
  let mockSyncEngine: any;

  beforeEach(async () => {
    mockSyncEngine = {
      executeSync: jest.fn().mockResolvedValue({
        jobId: 'job_test',
        triggerType: SyncTriggerType.MANUAL,
        status: SyncJobStatus.SUCCESS,
        totalRows: 5,
        createdCount: 3,
        updatedCount: 2,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
        durationMs: 120,
      }),
      isRunning: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [{ provide: SyncEngineService, useValue: mockSyncEngine }],
    }).compile();

    controller = module.get<SyncController>(SyncController);
  });

  it('should trigger sync and return summary', async () => {
    const summary = await controller.triggerSync({ full: true, dryRun: false });
    expect(summary.jobId).toBe('job_test');
    expect(mockSyncEngine.executeSync).toHaveBeenCalledWith(
      expect.objectContaining({
        forceFullSync: true,
        dryRun: false,
        triggerType: SyncTriggerType.MANUAL,
      }),
    );
  });

  it('should return running status', async () => {
    const status = await controller.getStatus();
    expect(status.isRunning).toBe(false);
  });
});
