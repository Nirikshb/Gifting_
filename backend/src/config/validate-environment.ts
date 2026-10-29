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

  return config;
}
