import {
  EmailProvider,
  EmailSendError,
  EmailMessage,
  EmailSendResult,
} from './email-provider';

/**
 * Placeholder adapter used until an email provider is chosen.
 *
 * It reports itself as not configured (so dispatch holds notifications as
 * pending with a clear reason) and, as a second line of defence, throws if it
 * is ever called directly. Nothing here can mark a message as sent.
 */
export class UnconfiguredEmailProvider implements EmailProvider {
  readonly provider = 'unconfigured';

  isConfigured(): boolean {
    return false;
  }

  send(message: EmailMessage): Promise<EmailSendResult> {
    void message;
    return Promise.reject(
      new EmailSendError('Email provider is not configured.', false),
    );
  }
}
