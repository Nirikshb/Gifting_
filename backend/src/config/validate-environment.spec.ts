import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './validate-environment';

function baseConfig(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    DB_HOST: 'localhost',
    DB_USERNAME: 'postgres',
    DB_PASSWORD: 'secret',
    DB_DATABASE: 'gifting_dev',
    DB_PORT: '5432',
    ...overrides,
  };
}

describe('validateEnvironment email rules', () => {
  it('accepts a config with no email settings at all', () => {
    expect(validateEnvironment(baseConfig())).toBeDefined();
  });

  it('accepts the supported provider value', () => {
    expect(
      validateEnvironment(baseConfig({ EMAIL_PROVIDER: 'none' })),
    ).toBeDefined();
  });

  it('accepts the sender provider when its API token is set', () => {
    expect(
      validateEnvironment(
        baseConfig({ EMAIL_PROVIDER: 'sender', SENDER_API_TOKEN: 'tok' }),
      ),
    ).toBeDefined();
  });

  it('refuses to boot the sender provider without an API token', () => {
    expect(() =>
      validateEnvironment(baseConfig({ EMAIL_PROVIDER: 'sender' })),
    ).toThrow(/SENDER_API_TOKEN is required/);
  });

  it('refuses to boot with an unknown provider instead of silently not sending', () => {
    expect(() =>
      validateEnvironment(baseConfig({ EMAIL_PROVIDER: 'sendgird' })),
    ).toThrow(/EMAIL_PROVIDER has unsupported value "sendgird"/);
  });

  it('requires a positive attempt limit when one is given', () => {
    expect(() =>
      validateEnvironment(baseConfig({ EMAIL_MAX_ATTEMPTS: '0' })),
    ).toThrow(/EMAIL_MAX_ATTEMPTS must be a positive integer/);
    expect(() =>
      validateEnvironment(baseConfig({ EMAIL_MAX_ATTEMPTS: 'many' })),
    ).toThrow(/EMAIL_MAX_ATTEMPTS must be a positive integer/);
    expect(
      validateEnvironment(baseConfig({ EMAIL_MAX_ATTEMPTS: '3' })),
    ).toBeDefined();
  });

  it('requires a non-negative dispatch interval when one is given', () => {
    expect(() =>
      validateEnvironment(baseConfig({ EMAIL_DISPATCH_INTERVAL_MS: '-1' })),
    ).toThrow(/EMAIL_DISPATCH_INTERVAL_MS must be a non-negative integer/);
    expect(
      validateEnvironment(baseConfig({ EMAIL_DISPATCH_INTERVAL_MS: '0' })),
    ).toBeDefined();
  });

  it('leaves the recipient and sender addresses to runtime holds', () => {
    // Deliberately not validated at boot: a bad address must surface as a
    // held notification with a clear error, not as an app that will not start.
    expect(
      validateEnvironment(
        baseConfig({
          EMAIL_FROM_ADDRESS: 'not-an-address',
          ADMIN_NOTIFICATION_EMAIL: 'also-not-an-address',
        }),
      ),
    ).toBeDefined();
  });
});

describe('validateEnvironment existing rules', () => {
  it('still requires the database settings', () => {
    expect(() => validateEnvironment({ DB_PORT: '5432' })).toThrow(
      /DB_HOST is required/,
    );
  });

  it('still requires session settings when Google sign-in is configured', () => {
    expect(() =>
      validateEnvironment(baseConfig({ GOOGLE_CLIENT_ID: 'abc' })),
    ).toThrow(/SESSION_SECRET is required/);
  });
});
