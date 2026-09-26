import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private redisClient: Redis | null = null;
  private readonly inMemoryFallback = new Map<string, { value: string; expiresAt: number }>();
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);

    try {
      this.redisClient = new Redis({
        host,
        port,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });

      this.redisClient.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Connected to Redis Cache at ${host}:${port}`);
      });

      this.redisClient.on('error', (err) => {
        this.isConnected = false;
        this.logger.debug(`Redis Cache offline, using in-memory fallback: ${err.message}`);
      });

      this.redisClient.connect().catch(() => {
        this.isConnected = false;
      });
    } catch (e: any) {
      this.logger.warn(`Could not initialize Redis client: ${e.message}`);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (this.isConnected && this.redisClient) {
        const raw = await this.redisClient.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      }
    } catch {
      // fallback to memory
    }

    const item = this.inMemoryFallback.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.inMemoryFallback.delete(key);
      return null;
    }
    return JSON.parse(item.value) as T;
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    const str = JSON.stringify(value);
    try {
      if (this.isConnected && this.redisClient) {
        await this.redisClient.set(key, str, 'EX', ttlSeconds);
        return;
      }
    } catch {
      // fallback to memory
    }

    this.inMemoryFallback.set(key, {
      value: str,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    try {
      if (this.isConnected && this.redisClient) {
        await this.redisClient.del(key);
      }
    } catch {}
    this.inMemoryFallback.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      if (this.isConnected && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      }
    } catch {}

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const k of Array.from(this.inMemoryFallback.keys())) {
      if (regex.test(k)) {
        this.inMemoryFallback.delete(k);
      }
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {}
    }
  }
}
