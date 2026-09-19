import { DataSource } from 'typeorm';
import { LeadEntity } from '../entities/lead.entity';
import { DealEntity } from '../entities/deal.entity';
import { ConfigurationEntity } from '../entities/configuration.entity';
import { seedInitialConfig } from './initial-config.seed';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'tiktok_bitrix24',
  entities: [LeadEntity, DealEntity, ConfigurationEntity],
  synchronize: true,
});

async function runSeed() {
  console.log('Connecting to database...');
  await dataSource.initialize();
  console.log('Database connected. Seeding initial configurations...');
  await seedInitialConfig(dataSource);
  console.log('Seeding completed successfully.');
  await dataSource.destroy();
}

runSeed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
