import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { SyncJobStatus, SyncTriggerType } from '../database/entities/sync-log.entity';
import { SyncEngineService } from '../sync/sync-engine.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let mockAdminService: any;
  let mockSyncEngine: any;

  beforeEach(async () => {
    mockAdminService = {
      getStats: jest.fn().mockResolvedValue({ totalRuns: 5 }),
      getLogs: jest.fn().mockResolvedValue([]),
      getMapping: jest.fn().mockResolvedValue({ fields: [] }),
      updateMapping: jest.fn().mockResolvedValue({ success: true }),
    };

    mockSyncEngine = {
      executeSync: jest.fn().mockResolvedValue({
        jobId: 'manual_1',
        status: SyncJobStatus.SUCCESS,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: SyncEngineService, useValue: mockSyncEngine },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should call getStats', async () => {
    const res = await controller.getStats();
    expect(res).toEqual({ totalRuns: 5 });
  });

  it('should call getLogs', async () => {
    const res = await controller.getLogs();
    expect(res).toEqual([]);
  });

  it('should call getMapping and updateMapping', async () => {
    await controller.getMapping();
    expect(mockAdminService.getMapping).toHaveBeenCalled();

    await controller.updateMapping({ fields: [] });
    expect(mockAdminService.updateMapping).toHaveBeenCalled();
  });

  it('should trigger sync', async () => {
    const res = await controller.triggerSync({ full: true, dryRun: false });
    expect(res.jobId).toBe('manual_1');
    expect(mockSyncEngine.executeSync).toHaveBeenCalledWith(
      expect.objectContaining({
        forceFullSync: true,
        dryRun: false,
        triggerType: SyncTriggerType.MANUAL,
      }),
    );
  });

  it('should serve dashboard', () => {
    const mockRes = {
      sendFile: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    controller.serveDashboard(mockRes);
    expect(mockRes.sendFile).toHaveBeenCalled();
  });
});
