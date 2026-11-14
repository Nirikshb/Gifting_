/**
 * Injection token for the email provider adapter.
 *
 * Defaults to the placeholder adapter, which fails closed, so no code path can
 * claim that a message was delivered. `EMAIL_PROVIDER=sender` swaps in the
 * Sender.net adapter through the provider factory in `NotificationsModule`.
 */
export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export type EmailMessage = {
  from: { name: string; email: string };
  to: string;
  /**
   * Recipient display name, when the sending context knows one. Providers
   * that address messages by name use it; adapters simply omit it when absent.
   */
  toName?: string | null;
  subject: string;
  html: string;
  text: string;
  /**
   * Stable key for the logical event (`order_placed:12`). Adapters should pass
   * it to the provider as an idempotency key where the provider supports one,
   * so a crash between "accepted" and "recorded" cannot duplicate a message.
   */
  idempotencyKey: string;
};

export type EmailSendResult = {
  /** Provider's identifier for the accepted message, when it returns one. */
  messageId?: string | null;
};

export class EmailSendError extends Error {
  readonly retryable: boolean;
  /**
   * Provider-suggested delay before retrying, from the provider's own
   * rate-limit guidance (`Retry-After`). Null when the provider did not give one.
   */
  readonly retryAfterMs: number | null;

  constructor(
    message: string,
    retryable: boolean,
    retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = 'EmailSendError';
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

export interface EmailProvider {
  readonly provider: string;
  /**
   * False while required configuration is missing. Dispatch treats that as a
   * hold: the notification stays pending and is re-checked later, instead of
   * burning delivery attempts or being dropped.
   */
  isConfigured(): boolean;
  /**
   * Sends one message. Implementations must throw `EmailSendError` for
   * outcomes they can classify (invalid address, rejected, rate limited);
   * anything else is treated as transient and retried.
   */
  send(message: EmailMessage): Promise<EmailSendResult>;
}
