export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  redis: {
    host: string;
    port: number;
  };
  tiktok: {
    appSecret: string;
    bypassSignature: boolean;
  };
  bitrix24: {
    webhookUrl: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    name: process.env.DATABASE_NAME || 'tiktok_bitrix24',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  tiktok: {
    appSecret: process.env.TIKTOK_APP_SECRET || 'tiktok_secret_demo',
    bypassSignature: process.env.BYPASS_WEBHOOK_SIGNATURE === 'true',
  },
  bitrix24: {
    webhookUrl:
      process.env.BITRIX24_WEBHOOK_URL ||
      'https://your-domain.bitrix24.vn/rest/1/your_webhook_token_here/',
  },
});
