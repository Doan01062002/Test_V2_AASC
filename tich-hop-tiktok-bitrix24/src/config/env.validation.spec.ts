import { validate, EnvironmentVariables } from './env.validation';

describe('Environment Validation', () => {
  it('should validate default environment variables successfully', () => {
    const config = {};
    const result = validate(config);
    expect(result).toBeDefined();
    expect(result.PORT).toBe(3000);
    expect(result.DATABASE_HOST).toBe('localhost');
    expect(result.DATABASE_PORT).toBe(5432);
    expect(result.REDIS_HOST).toBe('localhost');
    expect(result.REDIS_PORT).toBe(6379);
    expect(result.BYPASS_WEBHOOK_SIGNATURE).toBe(false);
  });

  it('should convert and validate custom values', () => {
    const config = {
      PORT: '8080',
      DATABASE_PORT: '5433',
      BYPASS_WEBHOOK_SIGNATURE: 'true',
      TIKTOK_APP_SECRET: 'custom_secret_123',
    };
    const result = validate(config);
    expect(result.PORT).toBe(8080);
    expect(result.DATABASE_PORT).toBe(5433);
    expect(result.BYPASS_WEBHOOK_SIGNATURE).toBe(true);
    expect(result.TIKTOK_APP_SECRET).toBe('custom_secret_123');
  });

  it('should fail validation when NODE_ENV is invalid', () => {
    const config = {
      NODE_ENV: 'invalid_env',
    };
    expect(() => validate(config)).toThrow();
  });
});
