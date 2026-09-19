import { validate, Environment } from './env.validation';

describe('Environment Validation', () => {
  it('should validate with valid default config', () => {
    const config = {
      NODE_ENV: 'development',
      PORT: '3000',
      GOOGLE_SPREADSHEET_ID: 'test-id',
      BITRIX24_WEBHOOK_URL: 'https://test.bitrix24.vn/rest/1/abc/',
    };

    const validated = validate(config);
    expect(validated.NODE_ENV).toBe(Environment.Development);
    expect(validated.PORT).toBe(3000);
    expect(validated.GOOGLE_SPREADSHEET_ID).toBe('test-id');
  });

  it('should throw error when invalid NODE_ENV is provided', () => {
    const config = {
      NODE_ENV: 'invalid_env',
    };

    expect(() => validate(config)).toThrow();
  });

  it('should parse numbers correctly', () => {
    const config = {
      PORT: '8080',
      RATE_LIMIT_RPS: '5',
      MAX_RETRIES: '3',
    };

    const validated = validate(config);
    expect(validated.PORT).toBe(8080);
    expect(validated.RATE_LIMIT_RPS).toBe(5);
    expect(validated.MAX_RETRIES).toBe(3);
  });
});
