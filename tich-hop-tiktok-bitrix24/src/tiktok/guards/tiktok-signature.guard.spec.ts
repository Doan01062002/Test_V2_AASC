import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TikTokSignatureGuard } from './tiktok-signature.guard';
import * as crypto from 'crypto';

describe('TikTokSignatureGuard', () => {
  let guard: TikTokSignatureGuard;
  let configService: ConfigService;
  const secret = 'my_test_secret';

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'tiktok.appSecret') return secret;
        if (key === 'tiktok.bypassSignature') return false;
        return defaultValue;
      }),
    } as unknown as ConfigService;

    guard = new TikTokSignatureGuard(configService);
  });

  function createMockContext(headers: Record<string, string>, body: any, rawBody?: Buffer): ExecutionContext {
    const request = {
      headers,
      body,
      rawBody: rawBody || Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)),
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('should pass if signature matches HMAC-SHA256 of payload', () => {
    const payload = JSON.stringify({ event: 'lead.generate', event_id: '123' });
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const context = createMockContext(
      { 'tiktok-signature': signature },
      JSON.parse(payload),
      Buffer.from(payload),
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should bypass verification if bypassSignature is enabled', () => {
    (configService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'tiktok.bypassSignature') return true;
      return secret;
    });

    const context = createMockContext({}, { any: 'data' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException if header is missing', () => {
    const context = createMockContext({}, { event: 'lead.generate' });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if signature is invalid', () => {
    const context = createMockContext(
      { 'tiktok-signature': 'invalid_signature' },
      { event: 'lead.generate' },
      Buffer.from(JSON.stringify({ event: 'lead.generate' })),
    );
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
