import configuration from './configuration';

describe('Configuration Factory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load default configuration', () => {
    delete process.env.PORT;
    const config = configuration();
    expect(config.port).toBe(3000);
    expect(config.nodeEnv).toBe('test');
    expect(config.sync.rateLimitRps).toBe(2);
  });

  it('should load custom env configuration', () => {
    process.env.PORT = '8080';
    process.env.GOOGLE_SPREADSHEET_ID = 'sheet_xyz';
    process.env.BITRIX24_WEBHOOK_URL = 'https://custom.bitrix24.vn/';
    process.env.GOOGLE_PRIVATE_KEY = 'line1\\nline2';

    const config = configuration();
    expect(config.port).toBe(8080);
    expect(config.google.spreadsheetId).toBe('sheet_xyz');
    expect(config.bitrix24.webhookUrl).toBe('https://custom.bitrix24.vn/');
    expect(config.google.privateKey).toBe('line1\nline2');
  });
});
