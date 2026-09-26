import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum Environment {
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
  DATABASE_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  DATABASE_PORT: number = 5432;

  @IsString()
  @IsOptional()
  DATABASE_USER: string = 'postgres';

  @IsString()
  @IsOptional()
  DATABASE_PASSWORD: string = 'postgres';

  @IsString()
  @IsOptional()
  DATABASE_NAME: string = 'tiktok_bitrix24';

  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  TIKTOK_APP_SECRET: string = 'tiktok_secret_demo';

  @IsBoolean()
  @IsOptional()
  BYPASS_WEBHOOK_SIGNATURE: boolean = false;

  @IsString()
  @IsOptional()
  BITRIX24_WEBHOOK_URL: string =
    'https://your-domain.bitrix24.vn/rest/1/your_webhook_token_here/';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
