import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, LessThanOrEqual } from 'typeorm';
import {
  EMAIL_CONFIG_RETRY_DELAY_MS,
  getAdminNotificationEmail,
  getEmailBaseUrl,
  getEmailDispatchIntervalMs,
  getEmailMaxAttempts,
  getEmailSender,
} from '../config/email-configuration';
import { Order, type OrderStatus } from '../orders/entities/order.entity';
import { EMAIL_PROVIDER, EmailSendError } from './email-provider';
import type { EmailMessage, EmailProvider } from './email-provider';
import {
  EmailOutbox,
  NotificationEventType,
  NotificationRecipientKind,
} from './entities/email-outbox.entity';
import { MarketingAllowanceLedger } from '../marketing-allowance/entities/marketing-allowance-ledger.entity';
import {
  adminNewOrderEventKey,
  isCustomerNotifiableStatus,
  orderPlacedEventKey,
  orderStatusEventKey,
} from './notification-events';
import { MARKETING_CONSENT_CHECKER } from './marketing-consent.checker';
import { renderAdminNewOrderEmail } from './templates/admin-new-order';
import { renderOrderPlacedEmail } from './templates/order-placed';
import { renderOrderStatusEmail } from './templates/order-status';
import { OrderEmailContext } from './templates/order-summary';
import { EmailSettingsService } from '../email-settings/email-settings.service';
import type { EmailSettingKey } from '../email-settings/email-settings.service';
import { MarketingAllowanceService } from '../marketing-allowance/marketing-allowance.service';
import type { MarketingAllowanceCategory } from '../marketing-allowance/entities/marketing-allowance-ledger.entity';
import type { MarketingConsentChecker } from './marketing-consent.checker';

export const RECIPIENT_PATTERN = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/;
const MAX_LAST_ERROR_LENGTH = 1000;
const MAX_SUBJECT_LENGTH = 255;
const MAX_ADDRESS_LENGTH = 255;
const MAX_PROVIDER_MESSAGE_ID_LENGTH = 255;

/** Retry ladder: 1m, 2m, 4m ... capped at one hour. */
const RETRY_BACKOFF_BASE_MS = 60_000;
const RETRY_BACKOFF_MAX_MS = 3_600_000;

/** A `sending` row older than this belonged to a process that died. */
const STALE_SENDING_MS = 10 * 60_000;

const DISPATCH_BATCH_SIZE = 25;

type DispatchGate = {
  providerConfigured: boolean;
  sender: { name: string; email: string } | null;
};

type NotificationDraft = {
  eventKey: string;
  eventType: NotificationEventType;
  orderId: number;
  recipientKind: NotificationRecipientKind;
  recipientEmail: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Owns the transactional email outbox.
 *
 * Two halves, deliberately separated:
 *
 * - `enqueue*` runs **inside the caller's order transaction** (it receives the
 *   `EntityManager`), so the order and its notification rows commit or roll
 *   back together. Rendering is pure and can never throw on order data.
 * - `dispatch*` runs **only after that transaction has committed**. It claims
 *   rows one at a time (`pending -> sending`), calls the provider, then records
 *   `sent` or a retry/`failed` state. No provider call ever happens while an
 *   order transaction is open, and a provider problem can never roll one back.
 */
@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private dispatchInFlight: Promise<void> | null = null;
  private dispatchTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(EMAIL_PROVIDER)
    private readonly provider: EmailProvider,
    private readonly configService: ConfigService,
    private readonly emailSettingsService: EmailSettingsService,
    private readonly marketingAllowanceService: MarketingAllowanceService,
    @Inject(MARKETING_CONSENT_CHECKER)
    private readonly marketingConsentChecker: MarketingConsentChecker,
  ) {}

  onModuleInit(): void {
    const interval = getEmailDispatchIntervalMs(this.configService);
    if (interval > 0) {
      this.dispatchTimer = setInterval(() => {
        this.scheduleDispatch();
      }, interval);
      this.dispatchTimer.unref();
    }

    // Sweep once at boot so anything a previous process left pending (a restart
    // mid-flight, or rows queued while the provider was down) resumes without
    // waiting for the next order event.
    this.scheduleDispatch();
  }

  onModuleDestroy(): void {
    if (this.dispatchTimer) {
      clearInterval(this.dispatchTimer);
      this.dispatchTimer = null;
    }
  }

  // ---------------------------------------------------------------------
  // Enqueue (inside the order transaction)
  // ---------------------------------------------------------------------

  /** Customer email for a newly placed order. */
  async enqueueOrderPlaced(
    manager: EntityManager,
    orderId: number,
  ): Promise<void> {
    const order = await this.loadOrderForEmail(manager, orderId);
    if (!order) {
      return;
    }

    await this.insertNotification(manager, {
      eventKey: orderPlacedEventKey(orderId),
      eventType: 'order_placed',
      orderId,
      recipientKind: 'customer',
      recipientEmail: order.customerEmail,
      ...renderOrderPlacedEmail(this.buildContext(order)),
    });
  }

  /** Studio email for a newly placed order. */
  async enqueueAdminNewOrder(
    manager: EntityManager,
    orderId: number,
  ): Promise<void> {
    const order = await this.loadOrderForEmail(manager, orderId);
    if (!order) {
      return;
    }

    await this.insertNotification(manager, {
      eventKey: adminNewOrderEventKey(orderId),
      eventType: 'admin_new_order',
      orderId,
      recipientKind: 'admin',
      recipientEmail: getAdminNotificationEmail(this.configService) ?? '',
      ...renderAdminNewOrderEmail(this.buildContext(order)),
    });
  }

  /**
   * Customer email for a fulfilment change. `pending` is not a notifiable
   * status (the order-placed email covers it) and is ignored here.
   */
  async enqueueOrderStatusChanged(
    manager: EntityManager,
    orderId: number,
    status: OrderStatus,
    options?: {
      cancellationReason?: string | null;
      changedAt?: Date;
    },
  ): Promise<void> {
    if (!isCustomerNotifiableStatus(status)) {
      return;
    }

    const order = await this.loadOrderForEmail(manager, orderId);
    if (!order) {
      return;
    }

    await this.insertNotification(manager, {
      eventKey: orderStatusEventKey(orderId, status),
      eventType: 'order_status_changed',
      orderId,
      recipientKind: 'customer',
      recipientEmail: order.customerEmail,
      ...renderOrderStatusEmail({
        ctx: this.buildContext(order),
        status,
        cancellationReason: options?.cancellationReason ?? null,
        changedAt: options?.changedAt,
      }),
    });
  }

  /**
   * Marketing promotional email, enqueued inside the caller's transaction
   * (for campaigns: the transaction that claims the draft and writes the
   * per-recipient rows). Uses the same `orIgnore()` / unique `event_key`
   * deduplication as every other notification, so re-processing a campaign
   * can never produce a second row for a recipient.
   *
   * Promotional rows are eligible for the same dispatch protections as
   * transactional email: marketing consent is rechecked at dispatch time and
   * a one-time allowance is reserved before the provider is called.
   * Provider acceptance is not inbox delivery.
   */
  async enqueuePromotional(
    manager: EntityManager,
    input: {
      eventKey: string;
      recipientEmail: string;
      subject: string;
      html: string;
      text: string;
    },
  ): Promise<void> {
    const now = new Date();

    await manager
      .createQueryBuilder()
      .insert()
      .into(EmailOutbox)
      .values({
        eventKey: input.eventKey,
        eventType: 'promotional',
        orderId: null,
        recipientEmail: sanitizeSingleLine(
          input.recipientEmail,
          MAX_ADDRESS_LENGTH,
        ),
        recipientKind: 'subscriber',
        subject: sanitizeSingleLine(input.subject, MAX_SUBJECT_LENGTH),
        htmlBody: input.html,
        textBody: input.text,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: now,
      })
      .orIgnore()
      .execute();
  }

  // ---------------------------------------------------------------------
  // Dispatch (after commit)
  // ---------------------------------------------------------------------

  /**
   * Fire-and-forget sweep. Never rejects, so callers can invoke it right
   * after a commit without a delivery problem ever reaching the response.
   */
  scheduleDispatch(): void {
    void this.dispatchPending().catch((error: unknown) => {
      this.logger.error(
        `Email dispatch sweep failed: ${redactEmails(errorMessage(error))}`,
      );
    });
  }

  /**
   * One sweep of due notifications. Concurrent callers share the same run, and
   * rows are claimed with a conditional update so a second process cannot send
   * the same row while this one owns it.
   */
  async dispatchPending(): Promise<void> {
    if (this.dispatchInFlight) {
      return this.dispatchInFlight;
    }

    const run = this.runDispatch().finally(() => {
      this.dispatchInFlight = null;
    });
    this.dispatchInFlight = run;
    return run;
  }

  private async runDispatch(): Promise<void> {
    await this.releaseStaleSending();

    const due = await this.dataSource.getRepository(EmailOutbox).find({
      where: { status: 'pending', nextAttemptAt: LessThanOrEqual(new Date()) },
      order: { id: 'ASC' },
      take: DISPATCH_BATCH_SIZE,
    });

    if (due.length === 0) {
      return;
    }

    const gate: DispatchGate = {
      providerConfigured: this.provider.isConfigured(),
      sender: getEmailSender(this.configService),
    };

    for (const row of due) {
      await this.dispatchRow(row, gate);
    }
  }

  private async dispatchRow(
    row: EmailOutbox,
    gate: DispatchGate,
  ): Promise<void> {
    // A disabled category is never dispatched, even if it was queued while the
    // switch was on. The row is preserved as `failed` with a clear reason so
    // its history remains visible in the admin activity log.
    const settingKey = this.eventTypeToSettingKey(row);
    if (
      settingKey &&
      !(await this.emailSettingsService.isEnabled(settingKey))
    ) {
      await this.failRow(
        row,
        'pending',
        'This notification type is currently disabled.',
      );
      return;
    }

    const recipient = row.recipientEmail.trim();

    // Classification order matters. Missing configuration holds the row as
    // pending (it may be fixed later); malformed data can never succeed, so it
    // fails permanently; only then do we talk to the provider.
    if (!recipient) {
      await this.holdForConfiguration(
        row,
        'No recipient configured for this notification.',
      );
      return;
    }

    if (
      !RECIPIENT_PATTERN.test(recipient) ||
      recipient.length > MAX_ADDRESS_LENGTH
    ) {
      await this.failFromPending(row, 'Invalid recipient address.');
      return;
    }

    if (!gate.providerConfigured) {
      await this.holdForConfiguration(row, 'Email provider is not configured.');
      return;
    }

    if (!gate.sender) {
      await this.holdForConfiguration(row, 'Sender address is not configured.');
      return;
    }

    // Marketing eligibility: consent must be confirmed and the address must
    // not be unsubscribed. Checked before claiming so an ineligible row fails
    // without consuming a dispatch attempt.
    const category = this.eventTypeToAllowanceCategory(row);
    if (category) {
      const subscribed = await this.marketingConsentChecker.isSubscribed(
        row.recipientEmail,
      );
      if (!subscribed) {
        await this.failRow(
          row,
          'pending',
          'Marketing consent not confirmed; double opt-in required.',
        );
        return;
      }

      const unsubscribed = await this.marketingConsentChecker.isUnsubscribed(
        row.recipientEmail,
      );
      if (unsubscribed) {
        await this.failRow(
          row,
          'pending',
          'Address is unsubscribed; marketing suppressed.',
        );
        return;
      }
    }

    const claimed = await this.claimRow(row.id);
    if (!claimed) {
      // Another worker took it between our read and our claim.
      return;
    }

    // Reserve the marketing allowance for this outbox operation. Reuses an
    // existing reservation for the same outbox row (retry) or creates a new
    // one. The unique constraint on (normalized_email, category) prevents
    // concurrent reservations from both succeeding.
    let ledger: MarketingAllowanceLedger | null = null;
    if (category) {
      const reservation = await this.reserveAllowanceForOutbox(
        row.recipientEmail,
        category,
        row.id,
      );
      if (!reservation.success) {
        await this.failRow(
          row,
          'sending',
          `Marketing allowance not available: ${reservation.reason}.`,
        );
        return;
      }
      ledger = reservation.ledger;
    }

    const message: EmailMessage = {
      from: gate.sender,
      to: recipient,
      subject: row.subject,
      html: row.htmlBody,
      text: row.textBody,
      idempotencyKey: row.eventKey,
    };

    try {
      const result = await this.provider.send(message);
      await this.markSent(row, result?.messageId ?? null);
      // Provider acceptance consumes the allowance; it does not confirm
      // inbox delivery.
      if (ledger) {
        await this.marketingAllowanceService.markAllowanceSent(
          ledger.id,
          result?.messageId ?? null,
        );
      }
      this.logger.log(
        `Email outbox ${row.id} (${row.eventKey}) accepted by ${this.provider.provider}.`,
      );
    } catch (error) {
      await this.handleSendFailure(row, error, ledger?.id);
    }
  }

  /**
   * Conditional claim: exactly one worker moves a due row to `sending`, and
   * the attempt counter is incremented there (not on configuration holds).
   */
  private async claimRow(id: number): Promise<boolean> {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(EmailOutbox)
      .set({
        status: 'sending',
        lockedAt: () => 'CURRENT_TIMESTAMP',
        updatedAt: () => 'CURRENT_TIMESTAMP',
        attempts: () => 'attempts + 1',
      })
      .where('id = :id AND status = :status AND next_attempt_at <= :now', {
        id,
        status: 'pending',
        now: new Date(),
      })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  private async markSent(
    row: EmailOutbox,
    providerMessageId: string | null,
  ): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(EmailOutbox)
      .set({
        status: 'sent',
        sentAt: new Date(),
        providerMessageId: nullableValue(
          providerMessageId,
          MAX_PROVIDER_MESSAGE_ID_LENGTH,
        ),
        lastError: () => 'NULL',
        lockedAt: () => 'NULL',
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :id AND status = :sending', {
        id: row.id,
        sending: 'sending',
      })
      .execute();
  }

  /**
   * Missing configuration keeps the row pending and schedules a re-check; the
   * notification is preserved and no delivery attempt is consumed.
   */
  private async holdForConfiguration(
    row: EmailOutbox,
    message: string,
  ): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(EmailOutbox)
      .set({
        lastError: truncate(message, MAX_LAST_ERROR_LENGTH),
        nextAttemptAt: new Date(Date.now() + EMAIL_CONFIG_RETRY_DELAY_MS),
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :id AND status = :status', {
        id: row.id,
        status: 'pending',
      })
      .execute();

    this.logger.warn(
      `Email outbox ${row.id} (${row.eventKey}) on hold: ${redactEmails(truncate(message, MAX_LAST_ERROR_LENGTH))}`,
    );
  }

  private async handleSendFailure(
    row: EmailOutbox,
    error: unknown,
    ledgerId?: number | null,
  ): Promise<void> {
    const message = redactEmails(
      truncate(errorMessage(error), MAX_LAST_ERROR_LENGTH),
    );
    const retryable = error instanceof EmailSendError ? error.retryable : true;
    const attempts = row.attempts + 1;
    const maxAttempts = getEmailMaxAttempts(this.configService);

    if (!retryable || attempts >= maxAttempts) {
      const finalMessage = retryable
        ? truncate(
            `Delivery failed after ${attempts} attempts: ${message}`,
            MAX_LAST_ERROR_LENGTH,
          )
        : message;

      await this.failFromSending(row, finalMessage);
      // Permanent failure releases the allowance by marking it failed so it
      // can be re-reserved by a future outbox row. Do not consume it on a
      // retryable failure — the reservation is retained for retry.
      if (ledgerId) {
        await this.marketingAllowanceService.markAllowanceFailed(ledgerId);
      }
      this.logger.warn(
        `Email outbox ${row.id} (${row.eventKey}) failed after ${attempts} attempt(s): ${redactEmails(finalMessage)}`,
      );
      return;
    }

    const delay = Math.min(
      error instanceof EmailSendError && error.retryAfterMs !== null
        ? error.retryAfterMs
        : RETRY_BACKOFF_BASE_MS * 2 ** (attempts - 1),
      RETRY_BACKOFF_MAX_MS,
    );

    await this.requeueFromSending(row, message, new Date(Date.now() + delay));
    this.logger.warn(
      `Email outbox ${row.id} (${row.eventKey}) attempt ${attempts} failed, retrying: ${redactEmails(message)}`,
    );
  }

  private async failFromPending(
    row: EmailOutbox,
    message: string,
  ): Promise<void> {
    await this.failRow(row, 'pending', message);
    this.logger.warn(
      `Email outbox ${row.id} (${row.eventKey}) failed: ${redactEmails(truncate(message, MAX_LAST_ERROR_LENGTH))}`,
    );
  }

  private async failFromSending(
    row: EmailOutbox,
    message: string,
  ): Promise<void> {
    await this.failRow(row, 'sending', message);
  }

  private async failRow(
    row: EmailOutbox,
    fromStatus: 'pending' | 'sending',
    message: string,
  ): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(EmailOutbox)
      .set({
        status: 'failed',
        lastError: truncate(message, MAX_LAST_ERROR_LENGTH),
        lockedAt: () => 'NULL',
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :id AND status = :fromStatus', {
        id: row.id,
        fromStatus,
      })
      .execute();
  }

  private async requeueFromSending(
    row: EmailOutbox,
    message: string,
    nextAttemptAt: Date,
  ): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(EmailOutbox)
      .set({
        status: 'pending',
        lastError: truncate(message, MAX_LAST_ERROR_LENGTH),
        nextAttemptAt,
        lockedAt: () => 'NULL',
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :id AND status = :sending', {
        id: row.id,
        sending: 'sending',
      })
      .execute();
  }

  /**
   * Returns rows a crashed process left in `sending` to the queue, so a
   * restart cannot strand a notification forever.
   */
  private async releaseStaleSending(): Promise<void> {
    const cutoff = new Date(Date.now() - STALE_SENDING_MS);
    await this.dataSource
      .createQueryBuilder()
      .update(EmailOutbox)
      .set({
        status: 'pending',
        lockedAt: () => 'NULL',
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where(
        'status = :sending AND locked_at IS NOT NULL AND locked_at < :cutoff',
        { sending: 'sending', cutoff },
      )
      .execute();
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  /**
   * Returns null (and logs) instead of throwing: an internal mismatch here
   * must not roll back the order that is being written in the same
   * transaction.
   */
  private async loadOrderForEmail(
    manager: EntityManager,
    orderId: number,
  ): Promise<Order | null> {
    const order = await manager.getRepository(Order).findOne({
      where: { id: orderId },
      relations: { items: true },
    });

    if (!order) {
      this.logger.error(
        `Order ${orderId} not found while queueing a notification; skipped.`,
      );
      return null;
    }

    return order;
  }

  private buildContext(order: Order): OrderEmailContext {
    const siteUrl = getEmailBaseUrl(this.configService);
    const reference = order.orderReference;
    const encodedReference = encodeURIComponent(reference);

    const items = [...(order.items ?? [])]
      .sort((left, right) => left.id - right.id)
      .map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      }));

    return {
      orderReference: reference,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      recipientName: order.recipientName,
      delivery: {
        line1: order.deliveryLine1,
        line2: order.deliveryLine2,
        city: order.deliveryCity,
        postcode: order.deliveryPostcode,
        country: order.deliveryCountry,
      },
      giftMessage: order.giftMessage,
      subtotalAmount: order.subtotalAmount,
      shippingAmount: order.shippingAmount,
      totalAmount: order.totalAmount,
      items,
      createdAt: order.createdAt,
      siteUrl,
      // Guests have no account page to open; the public order page needs a
      // one-time token that is deliberately never placed in an email.
      accountOrderUrl:
        siteUrl && order.customerId !== null
          ? `${siteUrl}/account/orders/${encodedReference}`
          : null,
      adminOrderUrl: siteUrl
        ? `${siteUrl}/admin/orders/${encodedReference}`
        : null,
    };
  }

  /**
   * Newsletter double opt-in confirmation. Queued like any other notification
   * so delivery (and retries) run through the same outbox/provider pipeline;
   * the email itself is a consent-verification message, not marketing copy.
   */
  async enqueueNewsletterConfirmation(input: {
    eventKey: string;
    email: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(EmailOutbox)
      .values({
        eventKey: input.eventKey,
        eventType: 'newsletter_confirmation',
        orderId: null,
        recipientEmail: input.email,
        recipientKind: 'subscriber',
        subject: input.subject,
        htmlBody: input.html,
        textBody: input.text,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: new Date(),
      })
      .orIgnore()
      .execute();

    this.logger.debug(
      `Queued newsletter confirmation ${input.eventKey} for ${input.email}.`,
    );
  }

  /**
   * Maps an outbox row's event type to the email setting key that controls it.
   * Returns null for event types that are not gated by a setting (for example
   * `newsletter_confirmation`, which is consent-driven rather than a toggleable
   * transactional category).
   *
   * `order_status_changed` shares one event type between ordinary status
   * updates and cancellations, so the event key suffix is inspected to tell
   * them apart: `:cancelled` maps to the independent cancellation switch.
   */
  private eventTypeToSettingKey(row: EmailOutbox): EmailSettingKey | null {
    switch (row.eventType) {
      case 'order_placed':
        return 'order_confirmation';
      case 'admin_new_order':
        return 'admin_new_order';
      case 'order_status_changed':
        return row.eventKey.endsWith(':cancelled')
          ? 'cancellation_confirmation'
          : 'order_status_updates';
      default:
        return null;
    }
  }

  /**
   * Maps a marketing outbox event type to its allowance category.
   * Returns null for non-marketing event types, which are not subject to
   * allowance enforcement.
   */
  private eventTypeToAllowanceCategory(
    row: EmailOutbox,
  ): MarketingAllowanceCategory | null {
    switch (row.eventType) {
      case 'promotional':
        return 'promotional';
      case 'abandoned_cart':
        return 'abandoned_cart';
      default:
        return null;
    }
  }

  /**
   * Reserve or reuse a marketing allowance for a specific outbox row.
   *
   * If a reservation already exists for this outboxId (a retry of the same
   * operation), it is reused. Otherwise a new reservation is created. The
   * unique constraint on (normalized_email, category) prevents concurrent
   * reservations from both succeeding.
   */
  private async reserveAllowanceForOutbox(
    email: string,
    category: MarketingAllowanceCategory,
    outboxId: number,
  ): Promise<
    | { success: true; ledger: MarketingAllowanceLedger }
    | { success: false; reason: 'already-reserved' | 'already-consumed' }
  > {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Reuse an existing reservation for this exact outbox row (retry).
    const existing =
      await this.marketingAllowanceService.findByOutboxId(outboxId);
    if (existing) {
      if (existing.status === 'reserved') {
        return { success: true, ledger: existing };
      }
      if (existing.status === 'sent') {
        return { success: false, reason: 'already-consumed' };
      }
      // status === 'failed': the allowance was released, so reserve again.
    }

    // 2. No existing usable reservation: create a new one.
    return this.marketingAllowanceService.reserveAllowance(
      normalizedEmail,
      category,
      outboxId,
    );
  }

  private async insertNotification(
    manager: EntityManager,
    draft: NotificationDraft,
  ): Promise<void> {
    const now = new Date();

    // `orIgnore()` = ON CONFLICT DO NOTHING: a duplicate event key is a
    // no-op inside this transaction instead of an error that would abort it.
    await manager
      .createQueryBuilder()
      .insert()
      .into(EmailOutbox)
      .values({
        eventKey: draft.eventKey,
        eventType: draft.eventType,
        orderId: draft.orderId,
        recipientEmail: sanitizeSingleLine(
          draft.recipientEmail,
          MAX_ADDRESS_LENGTH,
        ),
        recipientKind: draft.recipientKind,
        subject: sanitizeSingleLine(draft.subject, MAX_SUBJECT_LENGTH),
        htmlBody: draft.html,
        textBody: draft.text,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: now,
      })
      .orIgnore()
      .execute();

    this.logger.debug(
      `Queued email ${draft.eventKey} for order ${draft.orderId} (${draft.eventType}).`,
    );
  }
}

/** Strips line breaks (header-injection surface) and trims. */
function sanitizeSingleLine(value: string, maxLength: number): string {
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function nullableValue(
  value: string | null,
  maxLength: number,
): string | (() => string) {
  if (value === null) {
    return () => 'NULL';
  }

  return sanitizeSingleLine(value, maxLength);
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Provider errors may echo the recipient address; logs must not carry PII.
 */
function redactEmails(value: string): string {
  return value.replace(
    /[^\s@,;<>"']+@[^\s@,;<>"']+\.[^\s@,;<>"']+/g,
    '[redacted-email]',
  );
}
