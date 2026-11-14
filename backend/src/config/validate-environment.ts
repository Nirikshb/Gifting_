import { SUPPORTED_EMAIL_PROVIDERS } from './email-configuration';

function readNonEmptyString(
  config: Record<string, unknown>,
  key: string,
): string | null {
  const value = config[key];
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function requireNonEmptyString(
  config: Record<string, unknown>,
  key: string,
): void {
  if (!readNonEmptyString(config, key)) {
    throw new Error(`Environment variable ${key} is required but was not set.`);
  }
}

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  requireNonEmptyString(config, 'DB_HOST');
  requireNonEmptyString(config, 'DB_USERNAME');
  requireNonEmptyString(config, 'DB_PASSWORD');
  requireNonEmptyString(config, 'DB_DATABASE');

  const dbPort = readNonEmptyString(config, 'DB_PORT');
  if (!dbPort || Number.isNaN(Number(dbPort))) {
    throw new Error(
      'Environment variable DB_PORT is required and must be a number.',
    );
  }

  const googleClientId = readNonEmptyString(config, 'GOOGLE_CLIENT_ID');
  if (googleClientId) {
    requireNonEmptyString(config, 'SESSION_SECRET');
    requireNonEmptyString(config, 'FRONTEND_ORIGIN');
  }

  // An unknown provider must stop the app at boot: starting "successfully"
  // and never sending anything would look like silent data loss.
  const emailProvider = readNonEmptyString(config, 'EMAIL_PROVIDER');
  if (emailProvider) {
    const providerName = emailProvider.toLowerCase();
    if (
      !(SUPPORTED_EMAIL_PROVIDERS as readonly string[]).includes(providerName)
    ) {
      throw new Error(
        `Environment variable EMAIL_PROVIDER has unsupported value "${emailProvider}". ` +
          `Supported values: ${SUPPORTED_EMAIL_PROVIDERS.join(', ')}.`,
      );
    }

    // Selecting a real provider without its credential must stop the app at
    // boot rather than queue forever. `none` needs nothing and keeps running.
    if (providerName === 'sender') {
      requireNonEmptyString(config, 'SENDER_API_TOKEN');
    }
  }

  const emailMaxAttempts = readNonEmptyString(config, 'EMAIL_MAX_ATTEMPTS');
  if (
    emailMaxAttempts &&
    (!Number.isInteger(Number(emailMaxAttempts)) ||
      Number(emailMaxAttempts) < 1)
  ) {
    throw new Error(
      'Environment variable EMAIL_MAX_ATTEMPTS must be a positive integer.',
    );
  }

  const dispatchInterval = readNonEmptyString(
    config,
    'EMAIL_DISPATCH_INTERVAL_MS',
  );
  if (
    dispatchInterval &&
    (!Number.isInteger(Number(dispatchInterval)) ||
      Number(dispatchInterval) < 0)
  ) {
    throw new Error(
      'Environment variable EMAIL_DISPATCH_INTERVAL_MS must be a non-negative integer.',
    );
  }

  return config;
}
