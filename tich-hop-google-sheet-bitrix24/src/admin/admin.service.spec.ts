import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MappingConfig } from '../database/entities/mapping-config.entity';
import { SyncLog } from '../database/entities/sync-log.entity';
import { SyncEngineService } from '../sync/sync-engine.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let mockSyncLogRepo: any;
  let mockMappingConfigRepo: any;
  let mockSyncEngine: any;

  beforeEach(async () => {
    mockSyncLogRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 1,
          jobId: 'job_1',
          createdCount: 2,
          updatedCount: 1,
          skippedCount: 3,
          errorCount: 0,
          createdAt: new Date(),
          status: 'SUCCESS',
        },
      ]),
    };

    mockMappingConfigRepo = {
      findOne: jest.fn().mockResolvedValue({
        configKey: 'default_mapping',
        configJson: JSON.stringify({ fields: [{ sheetColumn: 'Tên' }] }),
      }),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 1, ...d })),
    };

    mockSyncEngine = {
      isRunning: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(SyncLog), useValue: mockSyncLogRepo },
        { provide: getRepositoryToken(MappingConfig), useValue: mockMappingConfigRepo },
        { provide: SyncEngineService, useValue: mockSyncEngine },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should calculate stats correctly', async () => {
    const stats = await service.getStats();
    expect(stats.totalRuns).toBe(1);
    expect(stats.totalCreated).toBe(2);
    expect(stats.totalUpdated).toBe(1);
    expect(stats.totalSkipped).toBe(3);
    expect(stats.totalErrors).toBe(0);
    expect(stats.isRunning).toBe(false);
  });

  it('should retrieve logs', async () => {
    const logs = await service.getLogs(10);
    expect(logs).toHaveLength(1);
  });

  it('should retrieve mapping from database', async () => {
    const mapping = await service.getMapping();
    expect(mapping.fields).toBeDefined();
    expect(mapping.fields[0].sheetColumn).toBe('Tên');
  });

  it('should save updated mapping', async () => {
    const res = await service.updateMapping({ fields: [{ sheetColumn: 'Email' }] });
    expect(res.success).toBe(true);
    expect(mockMappingConfigRepo.save).toHaveBeenCalled();
  });
});
