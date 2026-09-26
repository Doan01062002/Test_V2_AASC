import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { LeadEntity } from './entities/lead.entity';
import { DealEntity } from './entities/deal.entity';
import { ConfigurationEntity } from './entities/configuration.entity';
import { seedInitialConfig } from './seeds/initial-config.seed';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host', 'localhost'),
        port: configService.get<number>('database.port', 5432),
        username: configService.get<string>('database.user', 'postgres'),
        password: configService.get<string>('database.password', 'postgres'),
        database: configService.get<string>(
          'database.name',
          'tiktok_bitrix24',
        ),
        entities: [LeadEntity, DealEntity, ConfigurationEntity],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: configService.get<string>('nodeEnv') === 'production',
        synchronize:
          configService.get<string>('nodeEnv') === 'test' ||
          configService.get<boolean>('database.synchronize', false),
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature([LeadEntity, DealEntity, ConfigurationEntity]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await seedInitialConfig(this.dataSource);
      this.logger.log('Initial configuration seeded successfully');
    } catch (error) {
      this.logger.warn(
        `Failed to seed initial config: ${(error as Error).message}`,
      );
    }
  }
}
