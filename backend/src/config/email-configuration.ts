import { ConfigService } from '@nestjs/config';

/**
 * Email provider names this build knows how to boot with. Adding a real
 * provider means: an adapter implementing `EmailProvider`, a branch in
 * `NotificationsModule`, and a new entry here so a typo fails at startup
 * instead of silently never sending.
 */
export const SUPPORTED_EMAIL_PROVIDERS = ['none', 'sender'] as const;
export type EmailProviderName = (typeof SUPPORTED_EMAIL_PROVIDERS)[number];

export const DEFAULT_EMAIL_FROM_NAME = 'Aapulki';
export const DEFAULT_EMAIL_MAX_ATTEMPTS = 5;
export const DEFAULT_EMAIL_DISPATCH_INTERVAL_MS = 60_000;

/** How long a config hold (no provider / no sender) waits before re-checking. */
export const EMAIL_CONFIG_RETRY_DELAY_MS = 60_000;

function readTrimmed(config: ConfigService, key: string): string | null {
  const value = config.get<string>(key)?.trim();
  return value ? value : null;
}

export function getEmailProviderName(
  config: ConfigService,
): EmailProviderName | null {
  const value = readTrimmed(config, 'EMAIL_PROVIDER');
  if (!value) {
    return null;
  }

  return (SUPPORTED_EMAIL_PROVIDERS as readonly string[]).includes(
    value.toLowerCase(),
  )
    ? (value.toLowerCase() as EmailProviderName)
    : null;
}

/**
 * Sender.net API token for the transactional provider. Backend-only secret:
 * never exposed to the frontend or stored in database settings.
 */
export function getSenderApiToken(config: ConfigService): string | null {
  return readTrimmed(config, 'SENDER_API_TOKEN');
}

/**
 * Sender identity. Returns null until both parts exist, which dispatch treats
 * as a configuration hold (the row stays pending) rather than a failure.
 */
export function getEmailSender(
  config: ConfigService,
): { name: string; email: string } | null {
  const email = readTrimmed(config, 'EMAIL_FROM_ADDRESS');
  if (!email) {
    return null;
  }

  return {
    name: readTrimmed(config, 'EMAIL_FROM_NAME') ?? DEFAULT_EMAIL_FROM_NAME,
    email,
  };
}

/**
 * Recipient for "new order" notifications. Falls back to the first address in
 * the existing `ADMIN_EMAILS` list so one variable can keep driving both
 * admin sign-in promotion and admin notifications.
 */
export function getAdminNotificationEmail(
  config: ConfigService,
): string | null {
  const explicit = readTrimmed(config, 'ADMIN_NOTIFICATION_EMAIL');
  if (explicit) {
    return explicit;
  }

  const adminEmails = readTrimmed(config, 'ADMIN_EMAILS');
  if (!adminEmails) {
    return null;
  }

  const first = adminEmails
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)[0];

  return first ?? null;
}

/**
 * Origin used for the absolute links inside emails. `FRONTEND_ORIGIN` is the
 * backend's existing idea of where the storefront lives (it is already
 * required once Google sign-in is configured); `SITE_URL` is accepted as a
 * fallback because that is the canonical-origin variable the frontend uses.
 *
 * Returns null when neither is set: emails are still sent, they simply carry
 * no links.
 */
export function getEmailBaseUrl(config: ConfigService): string | null {
  const raw =
    readTrimmed(config, 'FRONTEND_ORIGIN') ?? readTrimmed(config, 'SITE_URL');
  if (!raw) {
    return null;
  }

  return raw.replace(/\/+$/, '');
}

export function getEmailMaxAttempts(config: ConfigService): number {
  const raw = readTrimmed(config, 'EMAIL_MAX_ATTEMPTS');
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 1
    ? parsed
    : DEFAULT_EMAIL_MAX_ATTEMPTS;
}

/** 0 disables the periodic sweep (used by tests); it never runs negative. */
export function getEmailDispatchIntervalMs(config: ConfigService): number {
  const raw = readTrimmed(config, 'EMAIL_DISPATCH_INTERVAL_MS');
  const parsed = raw ? Number(raw) : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 0) {
    return DEFAULT_EMAIL_DISPATCH_INTERVAL_MS;
  }

  return parsed;
}
