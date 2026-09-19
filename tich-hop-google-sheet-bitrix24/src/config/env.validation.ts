import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  GOOGLE_SERVICE_ACCOUNT_FILE: string;

  @IsString()
  @IsOptional()
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;

  @IsString()
  @IsOptional()
  GOOGLE_PRIVATE_KEY: string;

  @IsString()
  @IsOptional()
  GOOGLE_SPREADSHEET_ID: string;

  @IsString()
  @IsOptional()
  GOOGLE_SHEET_NAME: string;

  @IsString()
  @IsOptional()
  BITRIX24_WEBHOOK_URL: string;

  @IsString()
  @IsOptional()
  BITRIX24_OUTBOUND_TOKEN: string;

  @IsString()
  @IsOptional()
  SYNC_CRON_SCHEDULE: string;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_RPS: number;

  @IsNumber()
  @IsOptional()
  MAX_RETRIES: number;

  @IsNumber()
  @IsOptional()
  BATCH_SIZE: number;

  @IsString()
  @IsOptional()
  DATABASE_FILE: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
