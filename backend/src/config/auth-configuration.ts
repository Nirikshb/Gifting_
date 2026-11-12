import { ConfigService } from '@nestjs/config';

export const GOOGLE_SIGN_IN_NOT_CONFIGURED_MESSAGE =
  'Google sign-in is not configured';

export const DEFAULT_SESSION_TTL_DAYS = 7;

export function getGoogleClientId(
  configService: ConfigService,
): string | null {
  const value = configService.get<string>('GOOGLE_CLIENT_ID')?.trim();
  return value ? value : null;
}

export function isGoogleSignInConfigured(
  configService: ConfigService,
): boolean {
  return getGoogleClientId(configService) !== null;
}

export function getSessionTtlDays(configService: ConfigService): number {
  const raw = configService.get<string>('SESSION_TTL_DAYS')?.trim();
  if (!raw) {
    return DEFAULT_SESSION_TTL_DAYS;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_SESSION_TTL_DAYS;
  }

  return parsed;
}

export function getFrontendOrigin(
  configService: ConfigService,
): string | null {
  const value = configService.get<string>('FRONTEND_ORIGIN')?.trim();
  return value ? value : null;
}

/**
 * Comma-separated list of emails that should be promoted to admin when they
 * sign in. This only ever promotes; removing an email does not demote an
 * existing admin (use SQL for that, see docs/tasks.md).
 */
export function isConfiguredAdminEmail(
  configService: ConfigService,
  email: string,
): boolean {
  const configured = configService.get<string>('ADMIN_EMAILS')?.trim();
  if (!configured) {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  return configured
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

export function getSessionCookieSameSite(
  configService: ConfigService,
): 'lax' | 'strict' | 'none' {
  const configured = configService
    .get<string>('SESSION_COOKIE_SAME_SITE')
    ?.trim()
    .toLowerCase();

  if (configured === 'strict' || configured === 'none' || configured === 'lax') {
    return configured;
  }

  return 'lax';
}
