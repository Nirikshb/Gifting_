import { createHash, randomBytes } from 'crypto';

/**
 * Order confirmation tokens are high-entropy bearer tokens. Only a SHA-256
 * hash is persisted, so reading the database does not reveal valid links.
 */
export function createOrderConfirmationToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOrderConfirmationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
