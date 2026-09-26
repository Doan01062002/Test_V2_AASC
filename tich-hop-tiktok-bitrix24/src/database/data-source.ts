import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { LeadEntity } from './entities/lead.entity';
import { DealEntity } from './entities/deal.entity';
import { ConfigurationEntity } from './entities/configuration.entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'tiktok_bitrix24',
  entities: [LeadEntity, DealEntity, ConfigurationEntity],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});
