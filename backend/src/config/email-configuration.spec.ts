import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EMAIL_DISPATCH_INTERVAL_MS,
  DEFAULT_EMAIL_FROM_NAME,
  DEFAULT_EMAIL_MAX_ATTEMPTS,
  getAdminNotificationEmail,
  getEmailBaseUrl,
  getEmailDispatchIntervalMs,
  getEmailMaxAttempts,
  getEmailProviderName,
  getEmailSender,
  getSenderApiToken,
} from './email-configuration';

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('getEmailSender', () => {
  it('returns both parts when configured', () => {
    expect(
      getEmailSender(
        makeConfig({
          EMAIL_FROM_ADDRESS: 'studio@example.com',
          EMAIL_FROM_NAME: 'Aapulki Studio',
        }),
      ),
    ).toEqual({ name: 'Aapulki Studio', email: 'studio@example.com' });
  });

  it('falls back to the brand name', () => {
    expect(
      getEmailSender(makeConfig({ EMAIL_FROM_ADDRESS: 'studio@example.com' })),
    ).toEqual({ name: DEFAULT_EMAIL_FROM_NAME, email: 'studio@example.com' });
  });

  it('is null until an address exists (a configuration hold, not a failure)', () => {
    expect(getEmailSender(makeConfig({}))).toBeNull();
    expect(
      getEmailSender(makeConfig({ EMAIL_FROM_ADDRESS: '   ' })),
    ).toBeNull();
  });
});

describe('getAdminNotificationEmail', () => {
  it('prefers the dedicated variable', () => {
    expect(
      getAdminNotificationEmail(
        makeConfig({
          ADMIN_NOTIFICATION_EMAIL: 'orders@example.com',
          ADMIN_EMAILS: 'other@example.com',
        }),
      ),
    ).toBe('orders@example.com');
  });

  it('falls back to the first entry of the existing ADMIN_EMAILS list', () => {
    expect(
      getAdminNotificationEmail(
        makeConfig({ ADMIN_EMAILS: 'first@example.com, second@example.com' }),
      ),
    ).toBe('first@example.com');
  });

  it('is null when nothing is configured', () => {
    expect(getAdminNotificationEmail(makeConfig({}))).toBeNull();
  });
});

describe('getEmailBaseUrl', () => {
  it('uses FRONTEND_ORIGIN and strips a trailing slash', () => {
    expect(
      getEmailBaseUrl(
        makeConfig({ FRONTEND_ORIGIN: 'http://localhost:4000/' }),
      ),
    ).toBe('http://localhost:4000');
  });

  it('falls back to SITE_URL', () => {
    expect(
      getEmailBaseUrl(makeConfig({ SITE_URL: 'https://aapulki.example' })),
    ).toBe('https://aapulki.example');
  });

  it('is null when neither exists (emails are sent without links)', () => {
    expect(getEmailBaseUrl(makeConfig({}))).toBeNull();
  });
});

describe('retry settings', () => {
  it('uses documented defaults', () => {
    expect(getEmailMaxAttempts(makeConfig({}))).toBe(
      DEFAULT_EMAIL_MAX_ATTEMPTS,
    );
    expect(getEmailDispatchIntervalMs(makeConfig({}))).toBe(
      DEFAULT_EMAIL_DISPATCH_INTERVAL_MS,
    );
  });

  it('accepts configured values', () => {
    expect(getEmailMaxAttempts(makeConfig({ EMAIL_MAX_ATTEMPTS: '2' }))).toBe(
      2,
    );
    expect(
      getEmailDispatchIntervalMs(
        makeConfig({ EMAIL_DISPATCH_INTERVAL_MS: '0' }),
      ),
    ).toBe(0);
  });

  it('ignores nonsense rather than crashing the app', () => {
    expect(
      getEmailMaxAttempts(makeConfig({ EMAIL_MAX_ATTEMPTS: 'lots' })),
    ).toBe(DEFAULT_EMAIL_MAX_ATTEMPTS);
    expect(
      getEmailDispatchIntervalMs(
        makeConfig({ EMAIL_DISPATCH_INTERVAL_MS: '-5' }),
      ),
    ).toBe(DEFAULT_EMAIL_DISPATCH_INTERVAL_MS);
  });
});

describe('getEmailProviderName', () => {
  it('defaults to null (placeholder behaviour) when unset', () => {
    expect(getEmailProviderName(makeConfig({}))).toBeNull();
  });

  it('accepts the unconfigured default', () => {
    expect(getEmailProviderName(makeConfig({ EMAIL_PROVIDER: 'none' }))).toBe(
      'none',
    );
  });

  it('accepts the sender provider', () => {
    expect(getEmailProviderName(makeConfig({ EMAIL_PROVIDER: 'sender' }))).toBe(
      'sender',
    );
  });

  it('ignores unknown providers instead of guessing', () => {
    expect(
      getEmailProviderName(makeConfig({ EMAIL_PROVIDER: 'sendgird' })),
    ).toBeNull();
  });
});

describe('getSenderApiToken', () => {
  it('returns the trimmed token when configured', () => {
    expect(
      getSenderApiToken(makeConfig({ SENDER_API_TOKEN: '  tok-123  ' })),
    ).toBe('tok-123');
  });

  it('returns null when no token is configured', () => {
    expect(getSenderApiToken(makeConfig({}))).toBeNull();
  });
});
