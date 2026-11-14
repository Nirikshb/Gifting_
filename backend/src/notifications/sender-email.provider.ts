import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailMessage,
  EmailProvider,
  EmailSendError,
  EmailSendResult,
} from './email-provider';
import { getSenderApiToken } from '../config/email-configuration';

/**
 * Sender.net transactional email adapter.
 *
 * Talks to the public `v2/message/send` endpoint with native fetch (no SDK, no
 * extra HTTP client). The token is read from backend environment configuration
 * only and is never logged. Errors are classified into the retryable /
 * permanent buckets the outbox dispatcher already understands.
 */
const SENDER_API_URL = 'https://api.sender.net/v2/message/send';
const SENDER_SEND_TIMEOUT_MS = 10_000;

type SenderTo = { email: string; name?: string };
type SenderRequest = {
  from: { email: string; name: string };
  to: SenderTo;
  subject: string;
  text?: string;
  html: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
export class SenderEmailProvider implements EmailProvider {
  readonly provider = 'sender';

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return getSenderApiToken(this.configService) !== null;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const apiToken = getSenderApiToken(this.configService);
    if (!apiToken) {
      throw new EmailSendError('Sender API token is not configured.', false);
    }

    try {
      const response = await fetch(SENDER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          from: { email: message.from.email, name: message.from.name },
          to: {
            email: message.to,
            ...(message.toName ? { name: message.toName } : {}),
          },
          subject: message.subject,
          ...(message.text ? { text: message.text } : {}),
          html: message.html,
        } satisfies SenderRequest),
        signal: AbortSignal.timeout(SENDER_SEND_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw await this.toSendError(response);
      }

      const messageId = await this.extractMessageId(response);
      if (!messageId) {
        // A 2xx without a usable provider message id cannot be acted on safely.
        throw new EmailSendError(
          'Unexpected response from the Sender API.',
          true,
        );
      }

      return { messageId };
    } catch (error) {
      if (error instanceof EmailSendError) {
        throw error;
      }

      throw new EmailSendError(
        `Sender API request failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
        true,
      );
    }
  }

  // ---------------------------------------------------------------------
  // Response handling
  // ---------------------------------------------------------------------

  private async toSendError(response: Response): Promise<EmailSendError> {
    const retryAfterMs = this.readRetryAfterMs(response);
    const detail = (await response.text().catch(() => '')).trim();

    return new EmailSendError(
      `Sender API error ${response.status}${detail ? `: ${detail}` : '.'}`,
      this.isRetryableStatus(response.status),
      retryAfterMs,
    );
  }

  private async extractMessageId(response: Response): Promise<string | null> {
    const body: unknown = await response.json().catch(() => null);
    if (!isRecord(body)) {
      return null;
    }

    const data = isRecord(body.data) ? body.data : body;
    const rawId = data.emailId ?? data.messageId ?? data.id;
    const messageId =
      typeof rawId === 'string'
        ? rawId
        : typeof rawId === 'number'
          ? String(rawId)
          : null;

    const trimmed = messageId?.trim();
    return trimmed ? trimmed : null;
  }

  private readRetryAfterMs(response: Response): number | null {
    const raw = response.headers.get('retry-after');
    if (!raw) {
      return null;
    }

    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return null;
    }

    return seconds * 1000;
  }

  private isRetryableStatus(status: number): boolean {
    // 429 is transient (back off, honouring Retry-After); anything in the
    // 5xx range is transient. Client errors (401 auth, 422 validation, 400)
    // will not fix themselves, so they fail permanently.
    if (status === 429) {
      return true;
    }

    return status >= 500;
  }
}
