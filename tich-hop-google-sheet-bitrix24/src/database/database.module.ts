import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { MappingConfig } from './entities/mapping-config.entity';
import { SyncHash } from './entities/sync-hash.entity';
import { SyncLog } from './entities/sync-log.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbFile = configService.get<string>('database.file', 'data/sync.sqlite');
        const dbDir = path.dirname(path.resolve(dbFile));
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }

        return {
          type: 'sqlite',
          database: dbFile,
          entities: [SyncLog, SyncHash, MappingConfig],
          synchronize: true,
          logging: false,
        };
      },
    }),
    TypeOrmModule.forFeature([SyncLog, SyncHash, MappingConfig]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
