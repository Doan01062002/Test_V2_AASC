import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from './redis-cache.service';

describe('RedisCacheService', () => {
  let service: RedisCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: any) => defaultVal),
          },
        },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should store and retrieve data from cache', async () => {
    await service.set('test:key', { message: 'hello' }, 10);
    const result = await service.get('test:key');
    expect(result).toEqual({ message: 'hello' });
  });

  it('should return null for expired or missing keys', async () => {
    const missing = await service.get('test:nonexistent');
    expect(missing).toBeNull();
  });

  it('should delete a key', async () => {
    await service.set('test:del', 'to be deleted', 10);
    await service.del('test:del');
    const result = await service.get('test:del');
    expect(result).toBeNull();
  });

  it('should delete keys matching a pattern', async () => {
    await service.set('analytics:c1', 'data1', 10);
    await service.set('analytics:c2', 'data2', 10);
    await service.set('config:c1', 'data3', 10);

    await service.delPattern('analytics:*');

    expect(await service.get('analytics:c1')).toBeNull();
    expect(await service.get('analytics:c2')).toBeNull();
    expect(await service.get('config:c1')).toBe('data3');
  });
});
