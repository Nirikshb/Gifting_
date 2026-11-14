import { createHash } from 'crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { CampaignService } from './campaign.service';
import { AudienceService } from './audience.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailSettingsService } from '../email-settings/email-settings.service';
import { MarketingAllowanceService } from '../marketing-allowance/marketing-allowance.service';
import { TypeOrmMarketingConsentChecker } from '../notifications/typeorm-marketing-consent.checker';
import { Newsletter } from '../newsletter/entities/newsletter.entity';
import { EmailSetting } from '../email-settings/entities/email-setting.entity';
import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from '../notifications/email-provider';
import { EmailSendError } from '../notifications/email-provider';
import {
  createTestDatabase,
  dropTestDatabase,
} from '../test/postgres-test-database';

/**
 * Send-workflow verification against a real PostgreSQL database.
 *
 * Creates a dedicated `gifting_campaign_send_test` database, applies every
 * migration and exercises the `POST /admin/campaigns/:id/send` flow: claim +
 * enqueue inside one transaction, outbox deduplication, consent/allowance
 * enforcement at dispatch time, and the sending -> sent/failed reconciliation.
 * The database is dropped afterwards.
 */

const TEST_DATABASE = 'gifting_campaign_send_test';

function eventKeyFor(campaignId: number, email: string): string {
  const hash = createHash('sha256')
    .update(email.trim().toLowerCase())
    .digest('hex');
  return `campaign_send:${campaignId}:${hash}`;
}

interface OutboxRow {
  event_key: string;
  event_type: string;
  recipient_email: string;
  recipient_kind: string;
  status: string;
  subject: string;
  html_body: string;
  text_body: string;
  last_error: string | null;
  attempts: number;
}

class TestEmailProvider implements EmailProvider {
  readonly provider = 'test';
  readonly sent: EmailMessage[] = [];
  configured = true;
  private readonly failures = new Map<string, EmailSendError>();

  isConfigured(): boolean {
    return this.configured;
  }

  failFor(email: string, error: EmailSendError): void {
    this.failures.set(email.trim().toLowerCase(), error);
  }

  clearFailures(): void {
    this.failures.clear();
  }

  reset(): void {
    this.sent.length = 0;
    this.failures.clear();
    this.configured = true;
  }

  send(message: EmailMessage): Promise<EmailSendResult> {
    const failure = this.failures.get(message.to);
    if (failure) {
      return Promise.reject(failure);
    }
    this.sent.push(message);
    return Promise.resolve({ messageId: `test-message-${this.sent.length}` });
  }
}

let dataSource: DataSource;
let provider: TestEmailProvider;
let notifications: NotificationsService;
let campaignService: CampaignService;
let referenceCounter = 0;

beforeAll(async () => {
  dataSource = await createTestDatabase(TEST_DATABASE);

  provider = new TestEmailProvider();
  const config = new ConfigService({
    EMAIL_FROM_ADDRESS: 'studio@example.com',
    EMAIL_FROM_NAME: 'Aapulki',
    EMAIL_MAX_ATTEMPTS: '5',
    EMAIL_DISPATCH_INTERVAL_MS: '0',
    FRONTEND_ORIGIN: 'http://localhost:3000',
  });
  const emailSettings = new EmailSettingsService(
    dataSource.getRepository(EmailSetting),
  );
  const allowance = new MarketingAllowanceService(dataSource);
  const consentChecker = new TypeOrmMarketingConsentChecker(
    dataSource.getRepository(Newsletter),
  );
  notifications = new NotificationsService(
    dataSource,
    provider,
    config,
    emailSettings,
    allowance,
    consentChecker,
  );
  const audience = new AudienceService(dataSource);
  campaignService = new CampaignService(dataSource, audience, notifications);
}, 180000);

afterAll(async () => {
  await dropTestDatabase(dataSource, TEST_DATABASE);
}, 60000);

beforeEach(async () => {
  await dataSource.query(
    `TRUNCATE order_items, orders, customers, products,
              newsletter_subscriptions, campaigns, email_outbox,
              marketing_allowance_ledger RESTART IDENTITY CASCADE`,
  );
  provider.reset();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

async function seedSubscriber(
  email: string,
  status: 'pending_confirmation' | 'subscribed' | 'unsubscribed' = 'subscribed',
): Promise<void> {
  await dataSource.query(
    `INSERT INTO newsletter_subscriptions (email, status, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())`,
    [email, status],
  );
}

async function seedOrder(input: {
  email?: string;
  items?: Array<{ productId?: number; lineTotal?: string }>;
}): Promise<number> {
  const items = input.items ?? [{ lineTotal: '25.00' }];
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.lineTotal ?? '0'),
    0,
  );
  const total = subtotal.toFixed(2);

  const result = await dataSource.query<Array<{ id: number }>>(
    `INSERT INTO orders (
       order_reference, customer_id, customer_name, customer_email,
       delivery_line1, delivery_city, delivery_postcode, delivery_country,
       subtotal_amount, shipping_amount, total_amount,
       order_status, payment_status, paid_at, created_at, updated_at
     ) VALUES ($1, NULL, 'Test Customer', $2, '1 Test Street', 'Test City',
       '12345', 'Test Country', $3, 0, $3, 'pending', 'paid', NOW(), NOW(), NOW())
     RETURNING id`,
    [
      `T11-${Date.now().toString(36)}-${referenceCounter++}`,
      input.email ?? 'guest-order@example.com',
      total,
    ],
  );
  const orderId = result[0].id;

  for (const item of items) {
    await dataSource.query(
      `INSERT INTO order_items (
         order_id, product_id, product_name, product_slug,
         unit_price, quantity, line_total
       ) VALUES ($1,$2,'Test Item','test-item-slug',$3,$4,$5)`,
      [
        orderId,
        item.productId ?? null,
        item.lineTotal ?? '0.00',
        1,
        item.lineTotal ?? '0.00',
      ],
    );
  }

  return orderId;
}

async function seedAllowance(
  email: string,
  category: 'promotional' | 'abandoned_cart' = 'promotional',
  status: 'reserved' | 'sent' | 'failed' = 'sent',
): Promise<void> {
  await dataSource.query(
    `INSERT INTO marketing_allowance_ledger (
       normalized_email, customer_id, marketing_category, campaign_id,
       outbox_id, status, provider_message_id, sent_at
     ) VALUES ($1, NULL, $2, NULL, NULL, $3, 'prior-message', NOW())`,
    [email, category, status],
  );
}

async function seedCampaign(
  input: {
    name?: string;
    audienceDefinition?: Record<string, unknown> | null;
    status?: string;
    content?: string;
  } = {},
): Promise<number> {
  const definition =
    input.audienceDefinition === undefined
      ? null
      : JSON.stringify(input.audienceDefinition);
  const result = await dataSource.query<Array<{ id: number }>>(
    `INSERT INTO campaigns (
       name, subject, heading, content, image_url,
       cta_label, cta_url, audience_definition, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
     RETURNING id`,
    [
      input.name ?? 'Test Campaign',
      'Campaign subject',
      'Campaign heading',
      input.content ?? 'First line.\n\nSecond line.',
      'https://example.com/banner.jpg',
      'Shop now',
      'https://example.com/offer',
      definition,
      input.status ?? 'draft',
    ],
  );
  return result[0].id;
}

async function outboxRows(campaignId: number): Promise<OutboxRow[]> {
  return dataSource.query<OutboxRow[]>(
    `SELECT event_key, event_type, recipient_email, recipient_kind,
            status, subject, html_body, text_body, last_error, attempts
     FROM email_outbox WHERE event_key LIKE $1 ORDER BY id`,
    [`campaign_send:${campaignId}:%`],
  );
}

describe('CampaignService.send (real database)', () => {
  describe('valid draft send', () => {
    it('sends a draft and marks it sent once every outbox row is accepted', async () => {
      await seedSubscriber('send-one@example.com');
      await seedSubscriber('send-two@example.com');
      await seedSubscriber('pending@example.com', 'pending_confirmation');
      await seedSubscriber('gone@example.com', 'unsubscribed');

      const campaignId = await seedCampaign({ name: 'Winter Drop' });
      const result = await campaignService.send(campaignId);

      expect(result.recipientCount).toBe(2);
      expect(result.campaign.status).toBe('sent');
      expect(result.campaign.sentAt).not.toBeNull();

      const rows = await outboxRows(campaignId);
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.event_type).toBe('promotional');
        expect(row.recipient_kind).toBe('subscriber');
        expect(row.status).toBe('sent');
        expect(row.subject).toBe('Campaign subject');
        expect(row.event_key).toBe(
          eventKeyFor(campaignId, row.recipient_email),
        );
      }
      expect(provider.sent.map((message) => message.to).sort()).toEqual([
        'send-one@example.com',
        'send-two@example.com',
      ]);
    });

    it('applies the stored audience definition to recipient selection', async () => {
      await seedSubscriber('first-time@example.com');
      await seedOrder({
        email: 'first-time@example.com',
        items: [{ lineTotal: '20.00' }],
      });
      await seedSubscriber('repeat@example.com');
      await seedOrder({
        email: 'repeat@example.com',
        items: [{ lineTotal: '20.00' }],
      });
      await seedOrder({
        email: 'repeat@example.com',
        items: [{ lineTotal: '20.00' }],
      });
      await seedSubscriber('never@example.com');

      const campaignId = await seedCampaign({
        audienceDefinition: { firstTimePurchaser: {} },
      });
      const result = await campaignService.send(campaignId);

      expect(result.recipientCount).toBe(1);
      expect(result.campaign.status).toBe('sent');
      const rows = await outboxRows(campaignId);
      expect(rows.map((row) => row.recipient_email)).toEqual([
        'first-time@example.com',
      ]);
    });

    it('creates exactly one row per eligible recipient, keyed deterministically', async () => {
      await seedSubscriber('one@example.com');
      await seedSubscriber('two@example.com');

      const campaignId = await seedCampaign({});
      await campaignService.send(campaignId);

      const rows = await outboxRows(campaignId);
      expect(rows).toHaveLength(2);
      expect(new Set(rows.map((row) => row.event_key)).size).toBe(2);
      expect(
        rows.map((row) => eventKeyFor(campaignId, row.recipient_email)).sort(),
      ).toEqual(rows.map((row) => row.event_key).sort());
    });

    it('deduplicates an enqueued recipient against the unique event key', async () => {
      await seedSubscriber('dedupe@example.com');

      await dataSource.transaction(async (manager) => {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          await notifications.enqueuePromotional(manager, {
            eventKey: eventKeyFor(41, 'dedupe@example.com'),
            recipientEmail: 'dedupe@example.com',
            subject: 's',
            html: '<p>x</p>',
            text: 'x',
          });
        }
      });

      const rows = await outboxRows(41);
      expect(rows).toHaveLength(1);
    });

    it('streams eligible recipients in id-ordered keyset batches', async () => {
      for (let index = 0; index < 210; index += 1) {
        await seedSubscriber(`batch-${index}@example.com`);
      }

      const campaignId = await seedCampaign({});
      const result = await campaignService.send(campaignId);

      expect(result.recipientCount).toBe(210);
      // The internal dispatch handles one batch of 25 per sweep; drain the rest.
      for (let remain = 185; remain > 0; remain -= 25) {
        await notifications.dispatchPending();
      }
      const rows = await outboxRows(campaignId);
      expect(rows).toHaveLength(210);
      const ids = rows.map((row) => row.recipient_email);
      expect(ids).toHaveLength(210);
      expect(provider.sent).toHaveLength(210);
    }, 60000);

    it('renders the campaign content escape-first inside the branded layout', async () => {
      await seedSubscriber('template@example.com');
      const campaignId = await seedCampaign({
        content: 'Hello\n\n<script>alert(1)</script>',
      });

      await campaignService.send(campaignId);

      const rows = await outboxRows(campaignId);
      expect(rows).toHaveLength(1);
      const html = rows[0].html_body;
      expect(html).toContain('Campaign heading');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).not.toContain('<script>');
      expect(html).toContain('https://example.com/banner.jpg');
      expect(html).toContain('Shop now');
      expect(rows[0].text_body).toContain('Hello');
      expect(rows[0].text_body).toContain('<script>alert(1)</script>');
    });
  });

  describe('claim and non-draft rejection', () => {
    it('rejects sending a scheduled campaign', async () => {
      const campaignId = await seedCampaign({ status: 'scheduled' });

      await expect(campaignService.send(campaignId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects sending a cancelled campaign', async () => {
      const campaignId = await seedCampaign({ status: 'cancelled' });

      await expect(campaignService.send(campaignId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects sending a campaign that was already sent', async () => {
      await seedSubscriber('already@example.com');
      const campaignId = await seedCampaign({});
      await campaignService.send(campaignId);

      await expect(campaignService.send(campaignId)).rejects.toThrow(
        BadRequestException,
      );
      expect(await outboxRows(campaignId)).toHaveLength(1);
    });

    it('rejects a missing campaign', async () => {
      await expect(campaignService.send(999999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('concurrency', () => {
    it('only one of two concurrent send requests wins', async () => {
      await seedSubscriber('concurrent@example.com');
      const campaignId = await seedCampaign({});

      const settled = await Promise.allSettled([
        campaignService.send(campaignId),
        campaignService.send(campaignId),
      ]);

      const fulfilled = settled.filter((item) => item.status === 'fulfilled');
      const rejected = settled.filter(
        (item): item is PromiseRejectedResult => item.status === 'rejected',
      );
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(BadRequestException);
      expect(await outboxRows(campaignId)).toHaveLength(1);
    });
  });

  describe('dispatch-time marketing protections', () => {
    it('fails a requeued recipient who unsubscribed before the retry', async () => {
      await seedSubscriber('stays@example.com');
      await seedSubscriber('leaves@example.com');
      provider.failFor(
        'leaves@example.com',
        new EmailSendError('rate limited', true),
      );

      const campaignId = await seedCampaign({});
      const result = await campaignService.send(campaignId);
      expect(result.campaign.status).toBe('sending');

      const requeued = (await outboxRows(campaignId)).find(
        (row) => row.recipient_email === 'leaves@example.com',
      );
      expect(requeued?.status).toBe('pending');
      expect(requeued?.attempts).toBe(1);
      expect(
        (await outboxRows(campaignId)).find(
          (row) => row.recipient_email === 'stays@example.com',
        ),
      ).toMatchObject({ status: 'sent' });

      await dataSource.query(
        `UPDATE newsletter_subscriptions SET status = 'unsubscribed' WHERE email = $1`,
        ['leaves@example.com'],
      );
      provider.clearFailures();
      // Move the requeued row's eligibility window into the past to
      // simulate the backoff period elapsing before the retry sweep runs.
      await dataSource.query(
        `UPDATE email_outbox SET next_attempt_at = NOW() - INTERVAL '1 second'
         WHERE event_key = $1`,
        [eventKeyFor(campaignId, 'leaves@example.com')],
      );
      await notifications.dispatchPending();

      const rows = await outboxRows(campaignId);
      const leaves = rows.find(
        (row) => row.recipient_email === 'leaves@example.com',
      );
      expect(leaves?.status).toBe('failed');
      expect(leaves?.last_error).toContain('Marketing consent');

      const reconciled =
        await campaignService.reconcileSendingCampaign(campaignId);
      expect(reconciled.status).toBe('failed');
    });

    it('permanently failing recipients release their allowance', async () => {
      await seedSubscriber('ok@example.com');
      await seedSubscriber('bad@example.com');
      provider.failFor(
        'bad@example.com',
        new EmailSendError('invalid recipient address', false),
      );

      const campaignId = await seedCampaign({});
      const result = await campaignService.send(campaignId);
      expect(result.campaign.status).toBe('failed');

      const rows = await outboxRows(campaignId);
      expect(
        rows.find((row) => row.recipient_email === 'ok@example.com'),
      ).toMatchObject({ status: 'sent' });
      expect(
        rows.find((row) => row.recipient_email === 'bad@example.com'),
      ).toMatchObject({ status: 'failed' });

      const ledger = await dataSource.query<
        Array<{ normalized_email: string; status: string }>
      >(
        `SELECT normalized_email, status FROM marketing_allowance_ledger
         WHERE marketing_category = 'promotional'`,
      );
      expect(ledger).toHaveLength(2);
      expect(
        ledger.find((row) => row.normalized_email === 'bad@example.com')
          ?.status,
      ).toBe('failed');
      expect(
        ledger.find((row) => row.normalized_email === 'ok@example.com')?.status,
      ).toBe('sent');
    });

    it('suppresses recipients whose one-time allowance was already consumed', async () => {
      await seedSubscriber('used@example.com');
      await seedSubscriber('fresh@example.com');
      await seedAllowance('used@example.com', 'promotional', 'sent');

      const campaignId = await seedCampaign({});
      const result = await campaignService.send(campaignId);
      expect(result.campaign.status).toBe('failed');

      const rows = await outboxRows(campaignId);
      expect(
        rows.find((row) => row.recipient_email === 'used@example.com'),
      ).toMatchObject({ status: 'failed' });
      expect(
        rows.find((row) => row.recipient_email === 'used@example.com')
          ?.last_error,
      ).toContain('already-consumed');
      expect(
        rows.find((row) => row.recipient_email === 'fresh@example.com'),
      ).toMatchObject({ status: 'sent' });
    });
  });

  describe('edge cases and recovery', () => {
    it('completes a send to an empty audience as sent with zero rows', async () => {
      const campaignId = await seedCampaign({
        audienceDefinition: { ltv: { min: 100000 } },
      });

      const result = await campaignService.send(campaignId);

      expect(result.recipientCount).toBe(0);
      expect(result.campaign.status).toBe('sent');
      expect(result.campaign.sentAt).not.toBeNull();
      expect(await outboxRows(campaignId)).toHaveLength(0);
    });

    it('leaves no trace of an interrupted send and can be retried', async () => {
      await seedSubscriber('retry-me@example.com');
      const campaignId = await seedCampaign({
        audienceDefinition: { noRecentPurchase: { days: 'not-a-number' } },
      });

      await expect(campaignService.send(campaignId)).rejects.toThrow(
        BadRequestException,
      );

      const campaign = await dataSource.query<Array<{ status: string }>>(
        `SELECT status FROM campaigns WHERE id = $1`,
        [campaignId],
      );
      expect(campaign[0].status).toBe('draft');
      expect(await outboxRows(campaignId)).toHaveLength(0);

      await dataSource.query(
        `UPDATE campaigns
         SET audience_definition = '{}'::jsonb
         WHERE id = $1`,
        [campaignId],
      );
      const result = await campaignService.send(campaignId);
      expect(result.campaign.status).toBe('sent');
      expect(await outboxRows(campaignId)).toHaveLength(1);
    });

    it('reconciles a resumed campaign to sent at boot when all rows are accepted', async () => {
      await seedSubscriber('boot-consistency@example.com');
      const campaignId = await seedCampaign({});
      await dataSource.query(
        `UPDATE campaigns SET status = 'sending' WHERE id = $1`,
        [campaignId],
      );
      await dataSource.transaction(async (manager) => {
        await notifications.enqueuePromotional(manager, {
          eventKey: eventKeyFor(campaignId, 'boot-consistency@example.com'),
          recipientEmail: 'boot-consistency@example.com',
          subject: 'Campaign subject',
          html: '<p>x</p>',
          text: 'x',
        });
      });
      await dataSource.query(
        `UPDATE email_outbox SET status = 'sent', sent_at = NOW()
         WHERE event_key = $1`,
        [eventKeyFor(campaignId, 'boot-consistency@example.com')],
      );

      await campaignService.onModuleInit();

      const campaign = await dataSource.query<Array<{ status: string }>>(
        `SELECT status FROM campaigns WHERE id = $1`,
        [campaignId],
      );
      expect(campaign[0].status).toBe('sent');
    });

    it('keeps a campaign with in-flight rows in sending at boot', async () => {
      await seedSubscriber('boot-pending@example.com');
      const campaignId = await seedCampaign({});
      await dataSource.query(
        `UPDATE campaigns SET status = 'sending' WHERE id = $1`,
        [campaignId],
      );
      await dataSource.transaction(async (manager) => {
        await notifications.enqueuePromotional(manager, {
          eventKey: eventKeyFor(campaignId, 'boot-pending@example.com'),
          recipientEmail: 'boot-pending@example.com',
          subject: 'Campaign subject',
          html: '<p>x</p>',
          text: 'x',
        });
      });

      await campaignService.onModuleInit();

      const campaign = await dataSource.query<Array<{ status: string }>>(
        `SELECT status FROM campaigns WHERE id = $1`,
        [campaignId],
      );
      expect(campaign[0].status).toBe('sending');
    });

    it('an interrupted send can be resumed without duplicate rows', async () => {
      await seedSubscriber('resume@example.com');
      const campaignId = await seedCampaign({});

      // Simulate a process killed after enqueuing but before dispatch:
      // campaign stuck in sending, rows pending, no duplicates if reconciled.
      await dataSource.query(
        `UPDATE campaigns SET status = 'sending' WHERE id = $1`,
        [campaignId],
      );
      await dataSource.transaction(async (manager) => {
        await notifications.enqueuePromotional(manager, {
          eventKey: eventKeyFor(campaignId, 'resume@example.com'),
          recipientEmail: 'resume@example.com',
          subject: 'Campaign subject',
          html: '<p>x</p>',
          text: 'x',
        });
      });

      // Resume: the provider comes back and dispatch completes.
      provider.configured = true;
      await notifications.dispatchPending();
      const reconciled =
        await campaignService.reconcileSendingCampaign(campaignId);
      expect(reconciled.status).toBe('sent');
      expect(await outboxRows(campaignId)).toHaveLength(1);

      // A further send request is rejected; nothing is duplicated.
      await expect(campaignService.send(campaignId)).rejects.toThrow(
        BadRequestException,
      );
      expect(await outboxRows(campaignId)).toHaveLength(1);
    });
  });

  describe('scheduled execution', () => {
    async function seedScheduledCampaign(
      scheduledAt: string,
      input: {
        audienceDefinition?: Record<string, unknown> | null;
      } = {},
    ): Promise<number> {
      const campaignId = await seedCampaign({
        audienceDefinition: input.audienceDefinition ?? null,
      });
      await dataSource.query(
        `UPDATE campaigns
         SET status = 'scheduled', scheduled_at = $2::timestamp, updated_at = NOW()
         WHERE id = $1`,
        [campaignId, scheduledAt],
      );
      return campaignId;
    }

    it('executes a campaign after its scheduled time and marks it sent', async () => {
      await seedSubscriber('scheduled-one@example.com');
      await seedSubscriber('scheduled-two@example.com');
      const campaignId = await seedScheduledCampaign(
        new Date(Date.now() - 60_000).toISOString(),
      );

      const processed = await campaignService.processDueScheduledCampaigns();

      expect(processed).toBe(1);
      const campaign = await campaignService.findOne(campaignId);
      expect(campaign?.status).toBe('sent');
      expect(campaign?.sentAt).not.toBeNull();
      const rows = await outboxRows(campaignId);
      expect(rows).toHaveLength(2);
      expect(rows.every((row) => row.status === 'sent')).toBe(true);
      expect(provider.sent.map((message) => message.to).sort()).toEqual([
        'scheduled-one@example.com',
        'scheduled-two@example.com',
      ]);
    });

    it('keeps future campaigns scheduled', async () => {
      await seedSubscriber('future@example.com');
      const campaignId = await seedScheduledCampaign(
        new Date(Date.now() + 60 * 60_000).toISOString(),
      );

      const processed = await campaignService.processDueScheduledCampaigns();

      expect(processed).toBe(0);
      const campaign = await campaignService.findOne(campaignId);
      expect(campaign?.status).toBe('scheduled');
      expect(campaign?.sentAt).toBeNull();
      expect(await outboxRows(campaignId)).toHaveLength(0);
      expect(provider.sent).toHaveLength(0);
    });

    it('never executes a cancelled campaign', async () => {
      await seedSubscriber('cancelled@example.com');
      const campaignId = await seedScheduledCampaign(
        new Date(Date.now() - 60_000).toISOString(),
      );
      await dataSource.query(
        `UPDATE campaigns SET status = 'cancelled' WHERE id = $1`,
        [campaignId],
      );

      const processed = await campaignService.processDueScheduledCampaigns();

      expect(processed).toBe(0);
      const campaign = await campaignService.findOne(campaignId);
      expect(campaign?.status).toBe('cancelled');
      expect(await outboxRows(campaignId)).toHaveLength(0);
      expect(provider.sent).toHaveLength(0);
    });

    it('processes multiple due campaigns', async () => {
      await seedSubscriber('multi-a@example.com');
      await seedSubscriber('multi-b@example.com');
      await seedSubscriber('multi-c@example.com');
      const first = await seedScheduledCampaign(
        new Date(Date.now() - 120_000).toISOString(),
        { audienceDefinition: { firstTimePurchaser: {} } },
      );
      const second = await seedScheduledCampaign(
        new Date(Date.now() - 60_000).toISOString(),
        { audienceDefinition: { noRecentPurchase: { days: 36500 } } },
      );
      await seedOrder({
        email: 'multi-a@example.com',
        items: [{ lineTotal: '10.00' }],
      });

      const processed = await campaignService.processDueScheduledCampaigns();

      expect(processed).toBe(2);
      expect((await campaignService.findOne(first))?.status).toBe('sent');
      expect((await campaignService.findOne(second))?.status).toBe('sent');
      expect(await outboxRows(first)).toHaveLength(1);
      expect((await outboxRows(first))[0].recipient_email).toBe(
        'multi-a@example.com',
      );
      expect(await outboxRows(second)).toHaveLength(2);
      expect(
        (await outboxRows(second)).map((row) => row.recipient_email).sort(),
      ).toEqual(['multi-b@example.com', 'multi-c@example.com']);
    });

    it('does not duplicate processing on repeated scheduler executions', async () => {
      await seedSubscriber('repeat@example.com');
      const campaignId = await seedScheduledCampaign(
        new Date(Date.now() - 60_000).toISOString(),
      );

      await campaignService.processDueScheduledCampaigns();
      await campaignService.processDueScheduledCampaigns();

      expect(await outboxRows(campaignId)).toHaveLength(1);
      expect(provider.sent).toHaveLength(1);
      expect((await campaignService.findOne(campaignId))?.status).toBe('sent');
    });

    it('multiple concurrent scheduler executions cannot claim the same campaign', async () => {
      await seedSubscriber('race@example.com');
      const campaignId = await seedScheduledCampaign(
        new Date(Date.now() - 60_000).toISOString(),
      );

      const [first, second] = await Promise.all([
        campaignService.processDueScheduledCampaigns(),
        campaignService.processDueScheduledCampaigns(),
      ]);

      expect(first + second).toBe(1);
      expect(await outboxRows(campaignId)).toHaveLength(1);
      expect(provider.sent).toHaveLength(1);
      expect((await campaignService.findOne(campaignId))?.status).toBe('sent');
    });

    it('completes an empty scheduled audience as sent with zero rows', async () => {
      const campaignId = await seedScheduledCampaign(
        new Date(Date.now() - 60_000).toISOString(),
        { audienceDefinition: { ltv: { min: 100000 } } },
      );

      const processed = await campaignService.processDueScheduledCampaigns();

      expect(processed).toBe(1);
      const campaign = await campaignService.findOne(campaignId);
      expect(campaign?.status).toBe('sent');
      expect(campaign?.sentAt).not.toBeNull();
      expect(await outboxRows(campaignId)).toHaveLength(0);
    });

    it('fails a due scheduled campaign with a malformed audience without retrying every poll', async () => {
      await seedSubscriber('malformed-scheduled@example.com');
      const campaignId = await seedScheduledCampaign(
        new Date(Date.now() - 60_000).toISOString(),
        { audienceDefinition: { noRecentPurchase: { days: 'not-a-number' } } },
      );

      const first = await campaignService.processDueScheduledCampaigns();
      const second = await campaignService.processDueScheduledCampaigns();

      expect(first).toBe(1);
      expect(second).toBe(0);
      const campaign = await campaignService.findOne(campaignId);
      expect(campaign?.status).toBe('failed');
      expect(campaign?.sentAt).toBeNull();
      expect(await outboxRows(campaignId)).toHaveLength(0);
    });

    it('recovers a sending campaign with pending outbox rows after a restart', async () => {
      await seedSubscriber('recover-pending@example.com');
      const campaignId = await seedScheduledCampaign(
        new Date(Date.now() - 60_000).toISOString(),
      );
      await dataSource.query(
        `UPDATE campaigns SET status = 'sending', scheduled_at = NOW() - INTERVAL '1 minute' WHERE id = $1`,
        [campaignId],
      );
      await dataSource.transaction(async (manager) => {
        await notifications.enqueuePromotional(manager, {
          eventKey: eventKeyFor(campaignId, 'recover-pending@example.com'),
          recipientEmail: 'recover-pending@example.com',
          subject: 'Campaign subject',
          html: '<p>x</p>',
          text: 'x',
        });
      });

      // Simulate restart: boot reconciliation runs while rows are pending.
      await campaignService.onModuleInit();
      expect((await campaignService.findOne(campaignId))?.status).toBe(
        'sending',
      );

      await notifications.dispatchPending();
      const reconciled =
        await campaignService.reconcileSendingCampaign(campaignId);
      expect(reconciled.status).toBe('sent');
      expect(await outboxRows(campaignId)).toHaveLength(1);
    });

    it('retries outbox delivery and eventually reconciles a scheduled campaign', async () => {
      await seedSubscriber('retry-ok@example.com');
      await seedSubscriber('retry-later@example.com');
      provider.failFor(
        'retry-later@example.com',
        new EmailSendError('rate limited', true),
      );

      const campaignId = await seedScheduledCampaign(
        new Date(Date.now() - 60_000).toISOString(),
      );
      await campaignService.processDueScheduledCampaigns();

      expect((await campaignService.findOne(campaignId))?.status).toBe(
        'sending',
      );
      const firstRows = await outboxRows(campaignId);
      expect(
        firstRows.find((row) => row.recipient_email === 'retry-ok@example.com'),
      ).toMatchObject({ status: 'sent' });
      expect(
        firstRows.find(
          (row) => row.recipient_email === 'retry-later@example.com',
        ),
      ).toMatchObject({ status: 'pending', attempts: 1 });

      provider.clearFailures();
      await dataSource.query(
        `UPDATE email_outbox SET next_attempt_at = NOW() - INTERVAL '1 second'
         WHERE event_key = $1`,
        [eventKeyFor(campaignId, 'retry-later@example.com')],
      );
      // The existing allowance reservation is retained for retry; ensure it is
      // associated with the outbox row so the retry can reuse it.
      await dataSource.query(
        `UPDATE marketing_allowance_ledger
         SET outbox_id = (SELECT id FROM email_outbox WHERE event_key = $1)
         WHERE normalized_email = $2 AND marketing_category = 'promotional'`,
        [
          eventKeyFor(campaignId, 'retry-later@example.com'),
          'retry-later@example.com',
        ],
      );
      await notifications.dispatchPending();
      const reconciled =
        await campaignService.reconcileSendingCampaign(campaignId);

      expect(reconciled.status).toBe('sent');
      const rows = await outboxRows(campaignId);
      expect(rows.every((row) => row.status === 'sent')).toBe(true);
    });

    it('reconciles a scheduled campaign to failed on terminal delivery failure', async () => {
      await seedSubscriber('term-ok@example.com');
      await seedSubscriber('term-bad@example.com');
      provider.failFor(
        'term-bad@example.com',
        new EmailSendError('invalid recipient address', false),
      );

      const campaignId = await seedScheduledCampaign(
        new Date(Date.now() - 60_000).toISOString(),
      );
      await campaignService.processDueScheduledCampaigns();

      expect((await campaignService.findOne(campaignId))?.status).toBe(
        'failed',
      );
      const rows = await outboxRows(campaignId);
      expect(
        rows.find((row) => row.recipient_email === 'term-ok@example.com'),
      ).toMatchObject({ status: 'sent' });
      expect(
        rows.find((row) => row.recipient_email === 'term-bad@example.com'),
      ).toMatchObject({ status: 'failed' });
    });

    it('keeps immediate draft sending unaffected', async () => {
      await seedSubscriber('immediate-still-works@example.com');
      const draftId = await seedCampaign({ status: 'draft' });

      const result = await campaignService.send(draftId);

      expect(result.recipientCount).toBe(1);
      expect(result.campaign.status).toBe('sent');
      expect(await outboxRows(draftId)).toHaveLength(1);
    });

    it('repeated reconciliation is idempotent', async () => {
      await seedSubscriber('idempotent@example.com');
      const campaignId = await seedScheduledCampaign(
        new Date(Date.now() - 60_000).toISOString(),
      );
      await campaignService.processDueScheduledCampaigns();

      await campaignService.reconcileSendingCampaigns();
      await campaignService.reconcileSendingCampaign(campaignId);
      await campaignService.reconcileSendingCampaigns();

      const campaign = await campaignService.findOne(campaignId);
      expect(campaign?.status).toBe('sent');
      expect(campaign?.sentAt).not.toBeNull();
      expect(await outboxRows(campaignId)).toHaveLength(1);
    });
  });
});
