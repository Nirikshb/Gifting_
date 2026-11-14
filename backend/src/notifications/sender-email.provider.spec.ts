import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailMessage, EmailSendError } from './email-provider';
import { SenderEmailProvider } from './sender-email.provider';

const SENDER_API_URL = 'https://api.sender.net/v2/message/send';
const API_TOKEN = 'sender-api-token-value';

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function makeMessage(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    from: { name: 'Aapulki', email: 'studio@example.com' },
    to: 'jane@example.com',
    subject: 'Aapulki order 11111111-1111-4111-8111-111111111111 received',
    html: '<html><body>html</body></html>',
    text: 'html',
    idempotencyKey: 'order_placed:12',
    ...overrides,
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

describe('SenderEmailProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports itself as configured only when the API token is present', () => {
    const provider = new SenderEmailProvider(
      makeConfig({ SENDER_API_TOKEN: API_TOKEN }),
    );

    expect(provider.provider).toBe('sender');
    expect(provider.isConfigured()).toBe(true);

    const unconfigured = new SenderEmailProvider(makeConfig({}));
    expect(unconfigured.isConfigured()).toBe(false);
  });

  it('sends a successful request and returns the provider message id', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        success: true,
        message: 'Email sent',
        emailId: 'ep2W4y-7pn8o21-YPpLY9PR5Jy9-x7GYQ',
      }),
    );
    const provider = new SenderEmailProvider(
      makeConfig({ SENDER_API_TOKEN: API_TOKEN }),
    );

    const result = await provider.send(makeMessage());

    expect(result).toEqual({
      messageId: 'ep2W4y-7pn8o21-YPpLY9PR5Jy9-x7GYQ',
    });
  });

  it('posts to the Sender endpoint with the expected payload', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: true, message: 'Email sent', emailId: 'msg-1' }),
    );
    const provider = new SenderEmailProvider(
      makeConfig({ SENDER_API_TOKEN: API_TOKEN }),
    );

    await provider.send(
      makeMessage({
        from: { name: 'Aapulki Studio', email: 'studio@example.com' },
        toName: 'Jane Doe',
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(SENDER_API_URL);
    expect(init.method).toBe('POST');

    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${API_TOKEN}`);
    expect(headers['Content-Type']).toBe('application/json');

    expect(JSON.parse(init.body as string)).toEqual({
      from: { email: 'studio@example.com', name: 'Aapulki Studio' },
      to: { email: 'jane@example.com', name: 'Jane Doe' },
      subject: makeMessage().subject,
      text: 'html',
      html: '<html><body>html</body></html>',
    });
  });

  it('omits the recipient name from the payload when none is available', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: true, message: 'Email sent', emailId: 'msg-1' }),
    );
    const provider = new SenderEmailProvider(
      makeConfig({ SENDER_API_TOKEN: API_TOKEN }),
    );

    await provider.send(makeMessage({ toName: null }));

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.to).toEqual({ email: 'jane@example.com' });
    expect(body).not.toHaveProperty('name');
  });

  it('refuses to send without a configured API token and fails permanently', async () => {
    const provider = new SenderEmailProvider(makeConfig({}));

    await expect(provider.send(makeMessage())).rejects.toThrow(
      'Sender API token is not configured.',
    );

    const error = await provider
      .send(makeMessage())
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(EmailSendError);
    expect((error as EmailSendError).retryable).toBe(false);
  });

  it('classifies an invalid credentials response as permanent', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      ),
    );
    const provider = new SenderEmailProvider(
      makeConfig({ SENDER_API_TOKEN: API_TOKEN }),
    );

    const error = await provider
      .send(makeMessage())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(EmailSendError);
    expect((error as EmailSendError).retryable).toBe(false);
  });

  it('classifies a validation failure as permanent', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          message: 'The given data was invalid.',
          errors: { email: ['Required value, email'] },
        },
        { status: 422 },
      ),
    );
    const provider = new SenderEmailProvider(
      makeConfig({ SENDER_API_TOKEN: API_TOKEN }),
    );

    const error = await provider
      .send(makeMessage())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(EmailSendError);
    expect((error as EmailSendError).retryable).toBe(false);
  });

  it('classifies a rate limit as retryable and honours Retry-After', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { success: false, message: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': '30' },
        },
      ),
    );
    const provider = new SenderEmailProvider(
      makeConfig({ SENDER_API_TOKEN: API_TOKEN }),
    );

    const error = await provider
      .send(makeMessage())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(EmailSendError);
    expect((error as EmailSendError).retryable).toBe(true);
    expect((error as EmailSendError).retryAfterMs).toBe(30_000);
  });

  it('classifies a server error as retryable', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Internal error' }, { status: 500 }),
    );
    const provider = new SenderEmailProvider(
      makeConfig({ SENDER_API_TOKEN: API_TOKEN }),
    );

    const error = await provider
      .send(makeMessage())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(EmailSendError);
    expect((error as EmailSendError).retryable).toBe(true);
  });

  it('classifies a network failure as retryable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const provider = new SenderEmailProvider(
      makeConfig({ SENDER_API_TOKEN: API_TOKEN }),
    );

    const error = await provider
      .send(makeMessage())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(EmailSendError);
    expect((error as EmailSendError).retryable).toBe(true);
  });

  it('classifies a timeout as retryable', async () => {
    fetchMock.mockRejectedValue(
      Object.assign(new Error('The operation was aborted'), {
        name: 'AbortError',
      }),
    );
    const provider = new SenderEmailProvider(
      makeConfig({ SENDER_API_TOKEN: API_TOKEN }),
    );

    const error = await provider
      .send(makeMessage())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(EmailSendError);
    expect((error as EmailSendError).retryable).toBe(true);
  });

  it('classifies a malformed success response as a retryable send error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: true, message: 'Email sent' }),
    );
    const provider = new SenderEmailProvider(
      makeConfig({ SENDER_API_TOKEN: API_TOKEN }),
    );

    const error = await provider
      .send(makeMessage())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(EmailSendError);
    expect((error as EmailSendError).retryable).toBe(true);
  });

  it('extracts the provider message id from the success response', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        success: true,
        message: 'Email sent',
        emailId: 'ep2W4y-7pn8o21-YPpLY9PR5Jy9-x7GYQ',
      }),
    );
    const provider = new SenderEmailProvider(
      makeConfig({ SENDER_API_TOKEN: API_TOKEN }),
    );

    await expect(provider.send(makeMessage())).resolves.toEqual({
      messageId: 'ep2W4y-7pn8o21-YPpLY9PR5Jy9-x7GYQ',
    });
  });

  it('extracts the provider message id from alternative response shapes', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { messageId: 'nested-message-id' } }),
    );
    const provider = new SenderEmailProvider(
      makeConfig({ SENDER_API_TOKEN: API_TOKEN }),
    );

    await expect(provider.send(makeMessage())).resolves.toEqual({
      messageId: 'nested-message-id',
    });
  });
});
