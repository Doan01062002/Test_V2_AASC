import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class TikTokSignatureGuard implements CanActivate {
  private readonly logger = new Logger(TikTokSignatureGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const bypass = this.configService.get<boolean>(
      'tiktok.bypassSignature',
      false,
    );
    if (bypass) {
      this.logger.debug('Bypassing TikTok webhook signature verification');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const signature =
      request.headers['tiktok-signature'] ||
      request.headers['x-tiktok-signature'] ||
      request.headers['x-signature'];

    if (!signature) {
      this.logger.warn('TikTok webhook received without signature header');
      throw new UnauthorizedException('Missing TikTok-Signature header');
    }

    const appSecret = this.configService.get<string>(
      'tiktok.appSecret',
      'tiktok_secret_demo',
    );

    let payloadString = '';
    if (request.rawBody && Buffer.isBuffer(request.rawBody)) {
      payloadString = request.rawBody.toString('utf8');
    } else if (typeof request.body === 'string') {
      payloadString = request.body;
    } else if (request.body) {
      payloadString = JSON.stringify(request.body);
    }

    const computedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payloadString)
      .digest('hex');

    const sigBuffer = Buffer.from(signature as string);
    const compBuffer = Buffer.from(computedSignature);

    const isValid =
      sigBuffer.length === compBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, compBuffer);

    if (!isValid) {
      this.logger.warn('TikTok webhook signature mismatch');
      throw new UnauthorizedException('Invalid TikTok webhook signature');
    }

    return true;
  }
}
