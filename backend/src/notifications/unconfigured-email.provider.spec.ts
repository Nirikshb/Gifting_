import { describe, expect, it } from 'vitest';
import { EmailSendError } from './email-provider';
import { UnconfiguredEmailProvider } from './unconfigured-email.provider';

describe('UnconfiguredEmailProvider', () => {
  const provider = new UnconfiguredEmailProvider();

  it('reports itself as not configured so dispatch holds rows as pending', () => {
    expect(provider.isConfigured()).toBe(false);
    expect(provider.provider).toBe('unconfigured');
  });

  it('refuses to send anything and fails clearly', async () => {
    await expect(
      provider.send({
        from: { name: 'Aapulki', email: 'studio@example.com' },
        to: 'jane@example.com',
        subject: 'Subject',
        html: '<p>html</p>',
        text: 'text',
        idempotencyKey: 'order_placed:1',
      }),
    ).rejects.toThrow(EmailSendError);

    await expect(
      provider.send({
        from: { name: 'Aapulki', email: 'studio@example.com' },
        to: 'jane@example.com',
        subject: 'Subject',
        html: '<p>html</p>',
        text: 'text',
        idempotencyKey: 'order_placed:1',
      }),
    ).rejects.toThrow('Email provider is not configured.');
  });

  it('classifies the refusal as permanent so nothing pretends to retry a send that never happened', async () => {
    const error = await provider
      .send({
        from: { name: 'Aapulki', email: 'studio@example.com' },
        to: 'jane@example.com',
        subject: 'Subject',
        html: '<p>html</p>',
        text: 'text',
        idempotencyKey: 'order_placed:1',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(EmailSendError);
    expect((error as EmailSendError).retryable).toBe(false);
  });
});
