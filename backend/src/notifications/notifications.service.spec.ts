import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { Order } from '../orders/entities/order.entity';
import { EmailProvider, EmailSendError, EmailMessage } from './email-provider';
import { EmailOutbox } from './entities/email-outbox.entity';
import { NotificationsService } from './notifications.service';
import { EmailSettingsService } from '../email-settings/email-settings.service';
import { MarketingAllowanceService } from '../marketing-allowance/marketing-allowance.service';
import { MarketingConsentChecker } from './marketing-consent.checker';
import type { MarketingAllowanceLedger } from '../marketing-allowance/entities/marketing-allowance-ledger.entity';
import type { MarketingAllowanceCategory } from '../marketing-allowance/entities/marketing-allowance-ledger.entity';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

/** Minimal mock of EmailSettingsService: every category enabled by default. */
class MockEmailSettingsService {
  async isEnabled(): Promise<boolean> {
    return true;
  }
}

type InsertCall = {
  entity: unknown;
  values: Record<string, unknown>;
  orIgnore: boolean;
};

type UpdateCall = {
  entity: unknown;
  set: Record<string, unknown>;
  where: string;
  params: Record<string, unknown>;
};

class FakeDatabase {
  insertCalls: InsertCall[] = [];
  updateCalls: UpdateCall[] = [];
  dueRows: EmailOutbox[] = [];
  findCalls = 0;
  lastFindOptions: unknown = null;
  /** Result of the conditional claim; 0 simulates a lost race. */
  claimAffected = 1;
  findError: Error | null = null;

  createInsertBuilder() {
    const call: Partial<InsertCall> = { orIgnore: false };
    const builder = {
      insert: () => builder,
      into: (entity: unknown) => {
        call.entity = entity;
        return builder;
      },
      values: (values: Record<string, unknown>) => {
        call.values = values;
        return builder;
      },
      orIgnore: () => {
        call.orIgnore = true;
        return builder;
      },
      execute: () => {
        this.insertCalls.push({
          entity: call.entity,
          values: call.values!,
          orIgnore: call.orIgnore!,
        });
        return Promise.resolve({ identifiers: [{ id: 1 }], raw: [{}] });
      },
    };
    return builder;
  }

  createUpdateBuilder() {
    const call: Partial<UpdateCall> = {};
    const builder = {
      update: (entity: unknown) => {
        call.entity = entity;
        return builder;
      },
      set: (values: Record<string, unknown>) => {
        call.set = values;
        return builder;
      },
      where: (clause: string, params: Record<string, unknown>) => {
        call.where = clause;
        call.params = params;
        return builder;
      },
      execute: () => {
        const update: UpdateCall = {
          entity: call.entity,
          set: call.set!,
          where: call.where!,
          params: call.params!,
        };
        this.updateCalls.push(update);
        const isClaim = typeof update.set.attempts === 'function';
        return Promise.resolve({
          affected: isClaim ? this.claimAffected : 1,
        });
      },
    };
    return builder;
  }

  repositoryFor(entity: unknown) {
    if (entity !== EmailOutbox) {
      throw new Error('Unexpected repository request');
    }

    return {
      find: vi.fn((options: unknown) => {
        this.findCalls += 1;
        this.lastFindOptions = options;
        if (this.findError) {
          return Promise.reject(this.findError);
        }
        return Promise.resolve(this.dueRows);
      }),
    };
  }

  claims(): UpdateCall[] {
    return this.updateCalls.filter(
      (call) => typeof call.set.attempts === 'function',
    );
  }

  updatesWithStatus(status: string): UpdateCall[] {
    // The stale-`sending` sweep also writes `pending`; it is not a requeue.
    return this.updateCalls.filter(
      (call) =>
        call.set.status === status && !call.where.includes('locked_at <'),
    );
  }

  requeues(): UpdateCall[] {
    return this.updatesWithStatus('pending');
  }

  holds(): UpdateCall[] {
    return this.updateCalls.filter(
      (call) =>
        call.set.lastError !== undefined && call.set.status === undefined,
    );
  }

  resets(): UpdateCall[] {
    return this.updateCalls.filter((call) =>
      call.where.includes('locked_at <'),
    );
  }
}

/** Mock MarketingAllowanceService: tracks allowances per category. */
class MockMarketingAllowanceService {
  private ledgers: MarketingAllowanceLedger[] = [];
  private nextId = 1;
  private reservedCategories = new Set<string>();
  private consumedCategories = new Set<string>();

  async reserveAllowance(
    email: string,
    category: MarketingAllowanceCategory,
    outboxId?: number,
  ): Promise<
    | { success: true; ledger: MarketingAllowanceLedger }
    | { success: false; reason: 'already-reserved' | 'already-consumed' }
  > {
    if (this.consumedCategories.has(category)) {
      return { success: false, reason: 'already-consumed' };
    }
    if (this.reservedCategories.has(category)) {
      return { success: false, reason: 'already-reserved' };
    }
    this.reservedCategories.add(category);
    const ledger: MarketingAllowanceLedger = {
      id: this.nextId++,
      normalizedEmail: email,
      customerId: null,
      marketingCategory: category,
      campaignId: null,
      outboxId: outboxId ?? null,
      status: 'reserved',
      providerMessageId: null,
      sentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.ledgers.push(ledger);
    return { success: true, ledger };
  }

  async findByOutboxId(
    outboxId: number,
  ): Promise<MarketingAllowanceLedger | null> {
    return this.ledgers.find((l) => l.outboxId === outboxId) ?? null;
  }

  async markAllowanceSent(ledgerId: number): Promise<MarketingAllowanceLedger> {
    const ledger = this.ledgers.find((l) => l.id === ledgerId);
    if (ledger) {
      ledger.status = 'sent';
      this.consumedCategories.add(ledger.marketingCategory);
    }
    return null as unknown as MarketingAllowanceLedger;
  }

  async markAllowanceFailed(
    ledgerId: number,
  ): Promise<MarketingAllowanceLedger> {
    const ledger = this.ledgers.find((l) => l.id === ledgerId);
    if (ledger) {
      ledger.status = 'failed';
      this.reservedCategories.delete(ledger.marketingCategory);
    }
    return null as unknown as MarketingAllowanceLedger;
  }
}

/** Mock MarketingConsentChecker: subscribed and not unsubscribed by default. */
class MockMarketingConsentChecker implements MarketingConsentChecker {
  subscribed = true;
  unsubscribed = false;

  async isSubscribed(): Promise<boolean> {
    return this.subscribed;
  }
  async isUnsubscribed(): Promise<boolean> {
    return this.unsubscribed;
  }
}

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function makeProvider(options: { configured?: boolean } = {}) {
  const configured = options.configured ?? true;
  const send = vi.fn().mockResolvedValue({ messageId: 'provider-msg-1' });

  const provider: EmailProvider = {
    provider: 'test-provider',
    isConfigured: () => configured,
    send,
  };

  return { provider, send };
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 12,
    orderReference: '11111111-1111-4111-8111-111111111111',
    customerId: null,
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    recipientName: 'Jane Doe',
    deliveryLine1: '12 Market Road',
    deliveryLine2: null,
    deliveryCity: 'Jaipur',
    deliveryPostcode: '302001',
    deliveryCountry: 'India',
    giftMessage: 'Happy birthday',
    subtotalAmount: '9.00',
    shippingAmount: '49.00',
    totalAmount: '58.00',
    orderStatus: 'pending',
    paymentStatus: 'unpaid',
    idempotencyKey: null,
    confirmationTokenHash: null,
    paidAt: null,
    cancelledAt: null,
    stockRestoredAt: null,
    paymentReference: null,
    items: [
      {
        id: 1,
        orderId: 12,
        productId: 1,
        productName: 'Kraft Gift Box',
        productSlug: 'kraft-gift-box',
        unitPrice: '4.50',
        quantity: 2,
        lineTotal: '9.00',
        createdAt: new Date('2026-02-01T10:00:00Z'),
      },
    ],
    statusHistory: [],
    createdAt: new Date('2026-02-01T10:00:00Z'),
    updatedAt: new Date('2026-02-01T10:00:00Z'),
    ...overrides,
  } as Order;
}

function makeManager(order: Order | null, db: FakeDatabase): EntityManager {
  return {
    getRepository: (entity: unknown) => {
      if (entity === Order) {
        return { findOne: vi.fn().mockResolvedValue(order) };
      }
      throw new Error('Unexpected repository request');
    },
    createQueryBuilder: () => db.createInsertBuilder(),
  } as unknown as EntityManager;
}

function makeDataSource(db: FakeDatabase): DataSource {
  return {
    getRepository: (entity: unknown) => db.repositoryFor(entity),
    createQueryBuilder: () => db.createUpdateBuilder(),
  } as unknown as DataSource;
}

function makeOutboxRow(overrides: Partial<EmailOutbox> = {}): EmailOutbox {
  return {
    id: 1,
    eventKey: 'order_placed:12',
    eventType: 'order_placed',
    orderId: 12,
    recipientEmail: 'jane@example.com',
    recipientKind: 'customer',
    subject: 'Aapulki order 11111111-1111-4111-8111-111111111111 received',
    htmlBody: '<html>body</html>',
    textBody: 'body',
    status: 'pending',
    attempts: 0,
    lastError: null,
    nextAttemptAt: new Date(Date.now() - 1_000),
    lockedAt: null,
    sentAt: null,
    providerMessageId: null,
    createdAt: new Date('2026-02-01T10:00:00Z'),
    updatedAt: new Date('2026-02-01T10:00:00Z'),
    ...overrides,
  };
}

type Harness = {
  service: NotificationsService;
  db: FakeDatabase;
  send: ReturnType<typeof makeProvider>['send'];
  config: Record<string, string>;
};

function makeHarness(
  options: {
    config?: Record<string, string>;
    providerConfigured?: boolean;
    order?: Order | null;
    consentSubscribed?: boolean;
    consentUnsubscribed?: boolean;
    allowanceReserved?: boolean;
    allowanceConsumed?: boolean;
  } = {},
): Harness {
  const db = new FakeDatabase();
  const { provider, send } = makeProvider({
    configured: options.providerConfigured,
  });
  const config: Record<string, string> = {
    FRONTEND_ORIGIN: 'http://localhost:4000',
    EMAIL_FROM_NAME: 'Aapulki',
    EMAIL_FROM_ADDRESS: 'studio@example.com',
    ADMIN_NOTIFICATION_EMAIL: 'orders@example.com',
    ...options.config,
  };

  const consentChecker = new MockMarketingConsentChecker();
  consentChecker.subscribed = options.consentSubscribed ?? true;
  consentChecker.unsubscribed = options.consentUnsubscribed ?? false;

  const allowanceService = new MockMarketingAllowanceService();

  const service = new NotificationsService(
    makeDataSource(db),
    provider,
    makeConfig(config),
    new MockEmailSettingsService() as unknown as EmailSettingsService,
    allowanceService as unknown as MarketingAllowanceService,
    consentChecker,
  );

  return { service, db, send, config };
}

// ---------------------------------------------------------------------------
// Enqueue (inside the order transaction)
// ---------------------------------------------------------------------------

describe('NotificationsService enqueue', () => {
  it('queues the order-placed email in the caller transaction with real order data', async () => {
    const { service, db } = makeHarness();
    const manager = makeManager(makeOrder(), db);

    await service.enqueueOrderPlaced(manager, 12);

    expect(db.insertCalls).toHaveLength(1);
    const call = db.insertCalls[0];
    expect(call.entity).toBe(EmailOutbox);
    // Conflict-tolerant insert: a repeated event key is a no-op, not an error
    // that would abort the surrounding order transaction.
    expect(call.orIgnore).toBe(true);
    expect(call.values).toMatchObject({
      eventKey: 'order_placed:12',
      eventType: 'order_placed',
      orderId: 12,
      recipientKind: 'customer',
      recipientEmail: 'jane@example.com',
      status: 'pending',
      attempts: 0,
    });
    expect(String(call.values.subject)).toContain(
      '11111111-1111-4111-8111-111111111111',
    );
    expect(String(call.values.htmlBody)).toContain('Kraft Gift Box');
    expect(String(call.values.htmlBody)).toContain('₹58.00');
    expect(String(call.values.textBody)).toContain('Kraft Gift Box');
    expect(call.values.nextAttemptAt).toBeInstanceOf(Date);
  });

  it('queues the studio email with the configured admin recipient', async () => {
    const { service, db } = makeHarness();
    const manager = makeManager(makeOrder(), db);

    await service.enqueueAdminNewOrder(manager, 12);

    expect(db.insertCalls).toHaveLength(1);
    expect(db.insertCalls[0].values).toMatchObject({
      eventKey: 'admin_new_order:12',
      eventType: 'admin_new_order',
      recipientKind: 'admin',
      recipientEmail: 'orders@example.com',
    });
    expect(String(db.insertCalls[0].values.htmlBody)).toContain(
      'No payment has been collected.',
    );
  });

  it('records an empty admin recipient when none is configured', async () => {
    const { service, db } = makeHarness({
      config: {
        ADMIN_NOTIFICATION_EMAIL: '',
        ADMIN_EMAILS: '',
      },
    });
    const manager = makeManager(makeOrder(), db);

    await service.enqueueAdminNewOrder(manager, 12);

    expect(db.insertCalls[0].values.recipientEmail).toBe('');
  });

  it('falls back to the first ADMIN_EMAILS address', async () => {
    const { service, db } = makeHarness({
      config: {
        ADMIN_NOTIFICATION_EMAIL: '',
        ADMIN_EMAILS: 'studio@aapulki.example, second@aapulki.example',
      },
    });
    const manager = makeManager(makeOrder(), db);

    await service.enqueueAdminNewOrder(manager, 12);

    expect(db.insertCalls[0].values.recipientEmail).toBe(
      'studio@aapulki.example',
    );
  });

  it.each([
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ] as const)(
    'queues the customer email for the %s status change',
    async (status) => {
      const { service, db } = makeHarness();
      const manager = makeManager(makeOrder({ orderStatus: status }), db);

      await service.enqueueOrderStatusChanged(manager, 12, status, {
        cancellationReason: status === 'cancelled' ? 'Changed my mind' : null,
      });

      expect(db.insertCalls).toHaveLength(1);
      expect(db.insertCalls[0].values).toMatchObject({
        eventKey: `order_status:12:${status}`,
        eventType: 'order_status_changed',
        recipientKind: 'customer',
        recipientEmail: 'jane@example.com',
      });
      if (status === 'cancelled') {
        expect(String(db.insertCalls[0].values.htmlBody)).toContain(
          'Changed my mind',
        );
        expect(String(db.insertCalls[0].values.textBody)).toContain(
          'Changed my mind',
        );
      }
    },
  );

  it('ignores a pending status change because the placed email already covers it', async () => {
    const { service, db } = makeHarness();
    const manager = makeManager(makeOrder(), db);

    await service.enqueueOrderStatusChanged(manager, 12, 'pending');

    expect(db.insertCalls).toHaveLength(0);
  });

  it('produces the same event key for a repeated event so the database dedupes it', async () => {
    const { service, db } = makeHarness();
    const manager = makeManager(makeOrder(), db);

    await service.enqueueOrderPlaced(manager, 12);
    await service.enqueueOrderPlaced(manager, 12);

    expect(db.insertCalls).toHaveLength(2);
    const [first, second] = db.insertCalls.map((call) => call.values.eventKey);
    expect(first).toBe(second);
    expect(db.insertCalls.every((call) => call.orIgnore)).toBe(true);
  });

  it('links signed-in customers to their account page but not guests', async () => {
    const { service, db } = makeHarness();

    await service.enqueueOrderPlaced(
      makeManager(makeOrder({ customerId: null }), db),
      12,
    );
    const guestHtml = String(db.insertCalls[0].values.htmlBody);
    expect(guestHtml).not.toContain('/account/orders/');
    expect(guestHtml).not.toContain('?token=');

    db.insertCalls = [];
    await service.enqueueOrderPlaced(
      makeManager(makeOrder({ customerId: 42 }), db),
      12,
    );
    const accountHtml = String(db.insertCalls[0].values.htmlBody);
    expect(accountHtml).toContain(
      'http://localhost:4000/account/orders/11111111-1111-4111-8111-111111111111',
    );
  });

  it('omits links entirely when no frontend origin is configured', async () => {
    const { service, db } = makeHarness({
      config: { FRONTEND_ORIGIN: '', SITE_URL: '' },
    });

    await service.enqueueAdminNewOrder(
      makeManager(makeOrder({ customerId: 42 }), db),
      12,
    );

    const html = String(db.insertCalls[0].values.htmlBody);
    expect(html).not.toContain('http://localhost:4000');
    expect(html).not.toContain('/admin/orders/');
  });

  it('skips (rather than throws) when the order row cannot be read', async () => {
    const { service, db } = makeHarness();
    const manager = makeManager(null, db);

    await expect(
      service.enqueueOrderPlaced(manager, 12),
    ).resolves.toBeUndefined();
    expect(db.insertCalls).toHaveLength(0);
  });

  it('strips line breaks from the subject so it cannot inject headers', async () => {
    const { service, db } = makeHarness();
    const manager = makeManager(makeOrder(), db);

    await service.enqueueOrderPlaced(manager, 12);

    expect(String(db.insertCalls[0].values.subject)).not.toMatch(/[\r\n]/);
  });
});

// ---------------------------------------------------------------------------
// Dispatch (after commit)
// ---------------------------------------------------------------------------

describe('NotificationsService dispatch', () => {
  it('claims, sends and marks the row sent with the configured sender', async () => {
    const { service, db, send } = makeHarness();
    db.dueRows = [makeOutboxRow()];

    await service.dispatchPending();

    expect(db.resets()).toHaveLength(1); // stale-send sweep runs first
    expect(db.claims()).toHaveLength(1);
    expect(db.claims()[0].set).toMatchObject({ status: 'sending' });
    expect((db.claims()[0].set.attempts as () => string)()).toBe(
      'attempts + 1',
    );
    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0] as EmailMessage;
    expect(message.from).toEqual({
      name: 'Aapulki',
      email: 'studio@example.com',
    });
    expect(message.to).toBe('jane@example.com');
    expect(message.subject).toContain('11111111-1111-4111-8111-111111111111');
    expect(message.html).toBe('<html>body</html>');
    expect(message.text).toBe('body');
    expect(message.idempotencyKey).toBe('order_placed:12');
    expect(db.updatesWithStatus('sent')).toHaveLength(1);
    expect(db.updatesWithStatus('sent')[0].set.sentAt).toBeInstanceOf(Date);
    expect(db.updatesWithStatus('pending')).toHaveLength(0);
    expect(db.updatesWithStatus('failed')).toHaveLength(0);
  });

  it('holds the row pending when no provider is configured, without sending', async () => {
    const { service, db, send } = makeHarness({ providerConfigured: false });
    db.dueRows = [makeOutboxRow()];

    await service.dispatchPending();

    expect(send).not.toHaveBeenCalled();
    expect(db.claims()).toHaveLength(0);
    expect(db.holds()).toHaveLength(1);
    expect(db.holds()[0].set.lastError).toBe(
      'Email provider is not configured.',
    );
    expect(db.holds()[0].set.nextAttemptAt).toBeInstanceOf(Date);
    expect(db.updatesWithStatus('failed')).toHaveLength(0);
    // No delivery attempt was consumed: the row stays retryable forever.
    expect(db.holds()[0].set.attempts).toBeUndefined();
  });

  it('holds the row pending when the sender address is missing', async () => {
    const { service, db, send } = makeHarness({
      config: { EMAIL_FROM_ADDRESS: '' },
    });
    db.dueRows = [makeOutboxRow()];

    await service.dispatchPending();

    expect(send).not.toHaveBeenCalled();
    expect(db.claims()).toHaveLength(0);
    expect(db.holds()[0].set.lastError).toBe(
      'Sender address is not configured.',
    );
  });

  it('holds a notification that has no recipient yet', async () => {
    const { service, db, send } = makeHarness();
    db.dueRows = [makeOutboxRow({ recipientEmail: '' })];

    await service.dispatchPending();

    expect(send).not.toHaveBeenCalled();
    expect(db.holds()[0].set.lastError).toBe(
      'No recipient configured for this notification.',
    );
  });

  it('fails permanently on a malformed recipient without calling the provider', async () => {
    const { service, db, send } = makeHarness();
    db.dueRows = [makeOutboxRow({ recipientEmail: 'not-an-email' })];

    await service.dispatchPending();

    expect(send).not.toHaveBeenCalled();
    expect(db.claims()).toHaveLength(0);
    expect(db.updatesWithStatus('failed')).toHaveLength(1);
    expect(db.updatesWithStatus('failed')[0].set.lastError).toBe(
      'Invalid recipient address.',
    );
  });

  it('requeues a transient provider failure with backoff', async () => {
    const { service, db, send } = makeHarness();
    db.dueRows = [makeOutboxRow()];
    send.mockRejectedValue(new EmailSendError('rate limited', true));

    const before = Date.now();
    await service.dispatchPending();

    expect(db.claims()).toHaveLength(1);
    expect(db.updatesWithStatus('pending')).toHaveLength(1);
    const requeue = db.updatesWithStatus('pending')[0];
    expect(requeue.set.lastError).toBe('rate limited');
    const nextAttemptAt = requeue.set.nextAttemptAt as Date;
    expect(nextAttemptAt.getTime()).toBeGreaterThanOrEqual(before + 59_000);
    expect(nextAttemptAt.getTime()).toBeLessThanOrEqual(Date.now() + 61_000);
    expect(db.updatesWithStatus('failed')).toHaveLength(0);
  });

  it('requeues with the provider Retry-After hint when one is given', async () => {
    const { service, db, send } = makeHarness();
    db.dueRows = [makeOutboxRow()];
    send.mockRejectedValue(new EmailSendError('rate limited', true, 30_000));

    const before = Date.now();
    await service.dispatchPending();

    const requeue = db.updatesWithStatus('pending')[0];
    const nextAttemptAt = requeue.set.nextAttemptAt as Date;
    // Retry-After (30s) wins over the default 1m backoff ladder.
    expect(nextAttemptAt.getTime()).toBeGreaterThanOrEqual(before + 29_000);
    expect(nextAttemptAt.getTime()).toBeLessThanOrEqual(before + 31_000);
  });

  it('marks the row failed when the provider rejects permanently', async () => {
    const { service, db, send } = makeHarness();
    db.dueRows = [makeOutboxRow()];
    send.mockRejectedValue(new EmailSendError('mailbox does not exist', false));

    await service.dispatchPending();

    expect(db.updatesWithStatus('failed')).toHaveLength(1);
    expect(db.updatesWithStatus('failed')[0].set.lastError).toBe(
      'mailbox does not exist',
    );
    expect(db.updatesWithStatus('pending')).toHaveLength(0);
  });

  it('marks the row failed once the attempt limit is reached', async () => {
    const { service, db, send } = makeHarness({
      config: { EMAIL_MAX_ATTEMPTS: '2' },
    });
    db.dueRows = [makeOutboxRow({ attempts: 1 })];
    send.mockRejectedValue(new Error('connection reset'));

    await service.dispatchPending();

    expect(db.updatesWithStatus('failed')).toHaveLength(1);
    expect(db.updatesWithStatus('failed')[0].set.lastError).toBe(
      'Delivery failed after 2 attempts: connection reset',
    );
  });

  it('treats an unclassified provider error as transient', async () => {
    const { service, db, send } = makeHarness();
    db.dueRows = [makeOutboxRow()];
    send.mockRejectedValue(new Error('socket hang up'));

    await service.dispatchPending();

    expect(db.updatesWithStatus('pending')).toHaveLength(1);
    expect(db.updatesWithStatus('failed')).toHaveLength(0);
  });

  it('redacts the recipient address out of stored provider errors', async () => {
    const { service, db, send } = makeHarness();
    db.dueRows = [makeOutboxRow()];
    send.mockRejectedValue(
      new Error('smtp 550 for recipient jane@example.com'),
    );

    await service.dispatchPending();

    const stored = String(db.updatesWithStatus('pending')[0].set.lastError);
    expect(stored).toContain('[redacted-email]');
    expect(stored).not.toContain('jane@example.com');
  });

  it('skips a row another worker claimed between read and claim', async () => {
    const { service, db, send } = makeHarness();
    db.dueRows = [makeOutboxRow()];
    db.claimAffected = 0;

    await service.dispatchPending();

    expect(db.claims()).toHaveLength(1);
    expect(send).not.toHaveBeenCalled();
    expect(db.updatesWithStatus('sent')).toHaveLength(0);
  });

  it('shares one sweep between concurrent callers', async () => {
    const { service, db, send } = makeHarness();
    db.dueRows = [makeOutboxRow()];

    await Promise.all([service.dispatchPending(), service.dispatchPending()]);

    expect(db.findCalls).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('returns rows a crashed process left in sending back to the queue', async () => {
    const { service, db } = makeHarness();
    db.dueRows = [];

    await service.dispatchPending();

    const resets = db.resets();
    expect(resets).toHaveLength(1);
    expect(resets[0].set.status).toBe('pending');
    expect(resets[0].where).toContain('locked_at <');
  });

  it('only selects due pending rows', async () => {
    const { service, db } = makeHarness();
    db.dueRows = [];

    await service.dispatchPending();

    expect(db.findCalls).toBe(1);
    expect(db.lastFindOptions).toMatchObject({
      where: { status: 'pending' },
      take: 25,
    });
  });

  it('never sends while an order transaction is still open', async () => {
    const { service, db, send } = makeHarness();
    let committed = false;
    let committedAtSend: boolean | null = null;
    send.mockImplementation(() => {
      committedAtSend = committed;
      return Promise.resolve({ messageId: 'msg' });
    });

    const manager = makeManager(makeOrder(), db);
    await service.enqueueOrderPlaced(manager, 12);
    committed = true;

    db.dueRows = [makeOutboxRow()];
    await service.dispatchPending();

    expect(send).toHaveBeenCalledTimes(1);
    expect(committedAtSend).toBe(true);
  });

  it('keeps the row when the sweep itself fails, without throwing', async () => {
    const { service, db } = makeHarness();
    db.findError = new Error('connection refused');
    const errorSpy = vi
      .spyOn(
        (service as unknown as { logger: { error: (m: string) => void } })
          .logger,
        'error',
      )
      .mockImplementation(() => undefined);

    expect(() => service.scheduleDispatch()).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('connection refused'),
    );
    // The failure never produced a claim or a state change: the rows are
    // untouched and will be picked up by the next sweep.
    expect(db.claims()).toHaveLength(0);
    expect(db.updatesWithStatus('sent')).toHaveLength(0);
    expect(db.updatesWithStatus('failed')).toHaveLength(0);
  });

  it('sweeps once at boot to recover rows left by a restart', () => {
    const { service } = makeHarness({
      config: { EMAIL_DISPATCH_INTERVAL_MS: '0' },
    });
    const scheduleSpy = vi
      .spyOn(service, 'scheduleDispatch')
      .mockImplementation(() => undefined);

    service.onModuleInit();
    expect(scheduleSpy).toHaveBeenCalledTimes(1);

    service.onModuleDestroy();
  });

  // ---------------------------------------------------------------------------
  // Marketing dispatch safety
  // ---------------------------------------------------------------------------

  it('sends a marketing email to a subscribed recipient and consumes the allowance', async () => {
    const { service, db, send } = makeHarness();
    db.dueRows = [
      makeOutboxRow({
        id: 1,
        eventType: 'promotional',
        eventKey: 'promotional:jane@example.com:1',
      }),
    ];

    await service.dispatchPending();

    expect(send).toHaveBeenCalledTimes(1);
    expect(db.updatesWithStatus('sent')).toHaveLength(1);
  });

  it('sends an abandoned_cart email to a subscribed recipient', async () => {
    const { service, db, send } = makeHarness();
    db.dueRows = [
      makeOutboxRow({
        id: 1,
        eventType: 'abandoned_cart',
        eventKey: 'abandoned_cart:jane@example.com:1',
      }),
    ];

    await service.dispatchPending();

    expect(send).toHaveBeenCalledTimes(1);
    expect(db.updatesWithStatus('sent')).toHaveLength(1);
  });

  it('fails a marketing email to a non-subscribed recipient without sending', async () => {
    const { service, db, send } = makeHarness({ consentSubscribed: false });
    db.dueRows = [
      makeOutboxRow({
        id: 1,
        eventType: 'promotional',
        eventKey: 'promotional:jane@example.com:1',
      }),
    ];

    await service.dispatchPending();

    expect(send).not.toHaveBeenCalled();
    expect(db.updatesWithStatus('failed')).toHaveLength(1);
    expect(db.updatesWithStatus('failed')[0].set.lastError).toContain(
      'consent',
    );
  });

  it('fails a marketing email to an unsubscribed recipient without sending', async () => {
    const { service, db, send } = makeHarness({ consentUnsubscribed: true });
    db.dueRows = [
      makeOutboxRow({
        id: 1,
        eventType: 'promotional',
        eventKey: 'promotional:jane@example.com:1',
      }),
    ];

    await service.dispatchPending();

    expect(send).not.toHaveBeenCalled();
    expect(db.updatesWithStatus('failed')).toHaveLength(1);
    expect(db.updatesWithStatus('failed')[0].set.lastError).toContain(
      'unsubscribed',
    );
  });

  it('treats promotional and abandoned_cart allowances independently', async () => {
    const { service, db, send } = makeHarness();

    // Promotional email consumed
    db.dueRows = [
      makeOutboxRow({
        id: 1,
        eventType: 'promotional',
        eventKey: 'promotional:jane@example.com:1',
      }),
    ];
    await service.dispatchPending();
    expect(send).toHaveBeenCalledTimes(1);
    expect(db.updatesWithStatus('sent')).toHaveLength(1);

    // Abandoned cart to same address still works (independent allowance)
    db.dueRows = [
      makeOutboxRow({
        id: 2,
        eventType: 'abandoned_cart',
        eventKey: 'abandoned_cart:jane@example.com:1',
      }),
    ];
    send.mockClear();
    await service.dispatchPending();
    expect(send).toHaveBeenCalledTimes(1);
    expect(db.updatesWithStatus('sent')).toHaveLength(2);
  });

  it('reuses the existing allowance reservation on retry of the same outbox row', async () => {
    const { service, db, send } = makeHarness();

    // First attempt fails retryable
    db.dueRows = [
      makeOutboxRow({
        id: 1,
        eventType: 'promotional',
        eventKey: 'promotional:jane@example.com:1',
      }),
    ];
    send.mockRejectedValueOnce(new EmailSendError('rate limited', true));

    await service.dispatchPending();
    expect(db.updatesWithStatus('pending')).toHaveLength(1); // requeued

    // Retry: should reuse the existing reservation
    send.mockClear();
    send.mockResolvedValue({ messageId: 'msg-2' });
    await service.dispatchPending();
    expect(send).toHaveBeenCalledTimes(1);
    expect(db.updatesWithStatus('sent')).toHaveLength(1);
  });

  it('retains the reservation on a retryable provider failure', async () => {
    const { service, db, send } = makeHarness();
    db.dueRows = [
      makeOutboxRow({
        id: 1,
        eventType: 'promotional',
        eventKey: 'promotional:jane@example.com:1',
      }),
    ];
    send.mockRejectedValue(new EmailSendError('rate limited', true));

    await service.dispatchPending();

    expect(db.updatesWithStatus('pending')).toHaveLength(1);
    expect(db.updatesWithStatus('failed')).toHaveLength(0);
  });

  it('releases the allowance on a permanent provider failure', async () => {
    const { service, db, send } = makeHarness();
    db.dueRows = [
      makeOutboxRow({
        id: 1,
        eventType: 'promotional',
        eventKey: 'promotional:jane@example.com:1',
      }),
    ];
    send.mockRejectedValue(new EmailSendError('mailbox does not exist', false));

    await service.dispatchPending();

    expect(db.updatesWithStatus('failed')).toHaveLength(1);
    // Allowance released: a new outbox row for the same address can reserve again
    db.dueRows = [
      makeOutboxRow({
        id: 2,
        eventType: 'promotional',
        eventKey: 'promotional:jane@example.com:2',
      }),
    ];
    send.mockClear();
    send.mockResolvedValue({ messageId: 'msg-2' });
    await service.dispatchPending();
    expect(send).toHaveBeenCalledTimes(1);
    expect(db.updatesWithStatus('sent')).toHaveLength(1);
  });

  it('sends transactional emails regardless of marketing consent', async () => {
    const { service, db, send } = makeHarness({ consentSubscribed: false });
    db.dueRows = [
      makeOutboxRow({
        id: 1,
        eventType: 'order_placed',
        eventKey: 'order_placed:12',
      }),
    ];

    await service.dispatchPending();

    expect(send).toHaveBeenCalledTimes(1);
    expect(db.updatesWithStatus('sent')).toHaveLength(1);
  });

  it('sends newsletter confirmation emails regardless of marketing consent', async () => {
    const { service, db, send } = makeHarness({ consentSubscribed: false });
    db.dueRows = [
      makeOutboxRow({
        id: 1,
        eventType: 'newsletter_confirmation',
        eventKey: 'newsletter_confirmation:jane@example.com:hash',
      }),
    ];

    await service.dispatchPending();

    expect(send).toHaveBeenCalledTimes(1);
    expect(db.updatesWithStatus('sent')).toHaveLength(1);
  });
});
