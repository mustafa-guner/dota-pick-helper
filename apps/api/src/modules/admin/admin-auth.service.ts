import * as crypto from 'crypto';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_LOGIN_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

interface TokenPayload {
  exp: number;
}

@Injectable()
export class AdminAuthService {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly configService: ConfigService) {}

  /** Throws 429 if the caller IP has exceeded the login attempt budget. Returns a signed
   * session token on success, or null on a wrong password. */
  login(password: string, ip: string): string | null {
    if (this.isRateLimited(ip)) {
      throw new HttpException(
        'Too many login attempts — try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const expected = Buffer.from(this.configService.getOrThrow<string>('adminPassword'), 'utf8');
    const provided = Buffer.from(password ?? '', 'utf8');
    const isValid =
      provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

    return isValid ? this.issueToken() : null;
  }

  verify(token: string | undefined): boolean {
    if (!token) return false;
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return false;

    const expectedSignature = this.sign(payloadB64);
    const signatureBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
      return false;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8'),
      ) as TokenPayload;
      return typeof payload.exp === 'number' && payload.exp > Date.now();
    } catch {
      return false;
    }
  }

  private issueToken(): string {
    const payload: TokenPayload = { exp: Date.now() + TOKEN_TTL_MS };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${payloadB64}.${this.sign(payloadB64)}`;
  }

  private sign(payloadB64: string): string {
    const secret = this.configService.getOrThrow<string>('adminTokenSecret');
    return crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  }

  private isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = this.attempts.get(ip);
    if (!entry || entry.resetAt < now) {
      this.attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return false;
    }
    entry.count += 1;
    return entry.count > MAX_LOGIN_ATTEMPTS;
  }
}
