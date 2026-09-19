export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  google: {
    serviceAccountFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE || 'google-service-account.json',
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    privateKey: process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : '',
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
    sheetName: process.env.GOOGLE_SHEET_NAME || 'Sheet1',
  },
  bitrix24: {
    webhookUrl: process.env.BITRIX24_WEBHOOK_URL || '',
    outboundToken: process.env.BITRIX24_OUTBOUND_TOKEN || '',
  },
  sync: {
    cronSchedule: process.env.SYNC_CRON_SCHEDULE || '*/15 * * * *',
    rateLimitRps: parseInt(process.env.RATE_LIMIT_RPS || '2', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    batchSize: parseInt(process.env.BATCH_SIZE || '50', 10),
  },
  database: {
    file: process.env.DATABASE_FILE || 'data/sync.sqlite',
  },
});
