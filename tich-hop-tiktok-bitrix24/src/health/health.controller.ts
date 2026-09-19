import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private redisClient: Redis;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.redisClient = new Redis({
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      lazyConnect: true,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(@Res() res: Response) {
    const health: Record<string, any> = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'down',
        redis: 'down',
      },
    };

    let isHealthy = true;

    // Check Postgres
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        health.services.database = 'up';
      }
    } catch (err) {
      health.services.database = 'down';
      health.databaseError = (err as Error).message;
      isHealthy = false;
    }

    // Check Redis
    try {
      if (this.redisClient.status === 'wait') {
        await this.redisClient.connect();
      }
      const pong = await this.redisClient.ping();
      if (pong === 'PONG') {
        health.services.redis = 'up';
      }
    } catch (err) {
      health.services.redis = 'down';
      health.redisError = (err as Error).message;
      isHealthy = false;
    }

    if (!isHealthy) {
      health.status = 'error';
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(health);
    }

    return res.status(HttpStatus.OK).json(health);
  }
}
