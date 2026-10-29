import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { getFrontendOrigin } from '../../config/auth-configuration';
import {
  CSRF_COOKIE_NAME,
  CSRF_FORBIDDEN_MESSAGE,
  CSRF_HEADER_NAME,
} from '../csrf.constants';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    this.assertAllowedOrigin(request);
    this.assertValidDoubleSubmitToken(request);
    return true;
  }

  private assertAllowedOrigin(request: Request): void {
    const allowedOrigin = getFrontendOrigin(this.configService);
    if (!allowedOrigin) {
      throw new ForbiddenException(CSRF_FORBIDDEN_MESSAGE);
    }

    const originHeader = request.headers.origin;
    if (typeof originHeader === 'string') {
      if (originHeader !== allowedOrigin) {
        throw new ForbiddenException(CSRF_FORBIDDEN_MESSAGE);
      }
      return;
    }

    const refererOrigin = parseRefererOrigin(request.headers.referer);
    if (!refererOrigin || refererOrigin !== allowedOrigin) {
      throw new ForbiddenException(CSRF_FORBIDDEN_MESSAGE);
    }
  }

  private assertValidDoubleSubmitToken(request: Request): void {
    const cookieToken = readCookieToken(request.cookies?.[CSRF_COOKIE_NAME]);
    const headerToken = readHeaderToken(request.headers[CSRF_HEADER_NAME]);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException(CSRF_FORBIDDEN_MESSAGE);
    }
  }
}

function readCookieToken(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function readHeaderToken(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    const trimmed = value[0].trim();
    return trimmed === '' ? undefined : trimmed;
  }

  return undefined;
}

function parseRefererOrigin(referer: string | undefined): string | null {
  if (typeof referer !== 'string' || referer.trim() === '') {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}
