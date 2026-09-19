import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { SyncJobStatus, SyncTriggerType } from '../database/entities/sync-log.entity';
import { SyncEngineService } from './sync-engine.service';
import { SyncSchedulerService } from './sync-scheduler.service';

describe('SyncSchedulerService', () => {
  let service: SyncSchedulerService;
  let mockSyncEngine: any;

  beforeEach(async () => {
    mockSyncEngine = {
      executeSync: jest.fn().mockResolvedValue({
        status: SyncJobStatus.SUCCESS,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncSchedulerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('*/15 * * * *'),
          },
        },
        { provide: SyncEngineService, useValue: mockSyncEngine },
      ],
    }).compile();

    service = module.get<SyncSchedulerService>(SyncSchedulerService);
  });

  it('should trigger sync on cron invocation', async () => {
    await service.handleCron();
    expect(mockSyncEngine.executeSync).toHaveBeenCalledWith({
      triggerType: SyncTriggerType.CRON,
    });
  });
});
