import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { CookieOptions } from 'express';
import {
  getSessionCookieSameSite,
  getSessionTtlDays,
} from '../config/auth-configuration';

@Injectable()
export class CsrfService {
  constructor(private readonly configService: ConfigService) {}

  generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  getCsrfCookieOptions(): CookieOptions {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const maxAgeSeconds = getSessionTtlDays(this.configService) * 24 * 60 * 60;

    return {
      httpOnly: false,
      path: '/',
      maxAge: maxAgeSeconds * 1000,
      secure: isProduction,
      sameSite: getSessionCookieSameSite(this.configService),
    };
  }
}
