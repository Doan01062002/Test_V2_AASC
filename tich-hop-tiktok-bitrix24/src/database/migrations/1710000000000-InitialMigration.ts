import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1710000000000 implements MigrationInterface {
  name = 'InitialMigration1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure pgcrypto extension for gen_random_uuid()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Create leads table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "leads" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "external_id" VARCHAR(255) NOT NULL UNIQUE,
        "source" VARCHAR(50) NOT NULL DEFAULT 'tiktok',
        "name" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255),
        "phone" VARCHAR(50),
        "campaign_id" VARCHAR(255),
        "ad_id" VARCHAR(255),
        "raw_data" JSONB,
        "bitrix24_id" INTEGER,
        "quality_score" INTEGER NOT NULL DEFAULT 0,
        "status" VARCHAR(50) NOT NULL DEFAULT 'new',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // Create deals table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "deals" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "lead_id" UUID REFERENCES "leads"("id") ON DELETE SET NULL,
        "bitrix24_id" INTEGER,
        "title" VARCHAR(255) NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
        "stage" VARCHAR(50) NOT NULL DEFAULT 'NEW',
        "probability" INTEGER NOT NULL DEFAULT 0,
        "assigned_to" VARCHAR(50),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // Create configurations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "configurations" (
        "id" SERIAL PRIMARY KEY,
        "key" VARCHAR(255) NOT NULL UNIQUE,
        "value" JSONB NOT NULL,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_leads_external_id" ON "leads" ("external_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_leads_email" ON "leads" ("email");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_leads_phone" ON "leads" ("phone");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_leads_campaign_id" ON "leads" ("campaign_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_leads_status" ON "leads" ("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_deals_lead_id" ON "deals" ("lead_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_deals_bitrix24_id" ON "deals" ("bitrix24_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_deals_stage" ON "deals" ("stage");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_deals_stage";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_deals_bitrix24_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_deals_lead_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_leads_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_leads_campaign_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_leads_phone";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_leads_email";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_leads_external_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "configurations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "deals";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leads";`);
  }
}
