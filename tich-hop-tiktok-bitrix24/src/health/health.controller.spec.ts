import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: any;

  beforeEach(async () => {
    dataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('localhost'),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return health status', async () => {
    // Mock redis client
    (controller as any).redisClient = {
      status: 'ready',
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    await controller.check(mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        services: {
          database: 'up',
          redis: 'up',
        },
      }),
    );
  });

  it('should return 503 when database fails', async () => {
    dataSource.query.mockRejectedValue(new Error('DB Connection Failed'));
    (controller as any).redisClient = {
      status: 'ready',
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    await controller.check(mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(503);
  });
});
