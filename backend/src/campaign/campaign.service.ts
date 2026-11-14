import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import { AudienceService } from './audience.service';
import { NotificationsService } from '../notifications/notifications.service';
import { campaignSendEventKey } from '../notifications/notification-events';
import { renderCampaignEmail } from '../notifications/templates/campaign';

const DRAFT_EDITABLE_FIELDS = [
  'name',
  'subject',
  'heading',
  'content',
  'imageUrl',
  'ctaLabel',
  'ctaUrl',
  'audienceDefinition',
];

/** Recipients are enqueued in id-ordered keyset batches of this size. */
const SEND_BATCH_SIZE = 200;

/**
 * Campaign lifecycle management.
 *
 * Status transitions:
 *   draft -> scheduled  (schedule)
 *   draft -> cancelled  (cancel)
 *   scheduled -> cancelled (cancel)
 *   draft -> sending -> sent / failed  (immediate send)
 *   scheduled -> sending -> sent / failed  (automatic execution)
 *
 * All other transitions are rejected. Only drafts can be edited.
 */
@Injectable()
export class CampaignService implements OnModuleInit {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly audienceService: AudienceService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Reconcile campaigns left mid-flight by a previous process so an
    // interrupted send can never be stranded in `sending` without its
    // outbox rows being accounted for. Kept non-fatal: a database hiccup
    // at boot must not stop the app from starting.
    try {
      await this.reconcileSendingCampaigns();
    } catch (error: unknown) {
      this.logger.error(
        `Boot reconciliation of sending campaigns failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Create a new campaign as a draft. */
  async create(dto: {
    name: string;
    subject: string;
    heading: string;
    content: string;
    imageUrl?: string | null;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    audienceDefinition?: Record<string, unknown> | null;
  }): Promise<Campaign> {
    const campaign = this.dataSource.getRepository(Campaign).create({
      ...dto,
      status: 'draft',
      scheduledAt: null,
      sentAt: null,
    });

    return this.dataSource.getRepository(Campaign).save(campaign);
  }

  /** List campaigns with server-side pagination. */
  async list(query: {
    page?: number;
    limit?: number;
    status?: CampaignStatus;
    search?: string;
  }): Promise<{
    items: Campaign[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 25));

    const where: Record<string, unknown> = {};
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await this.dataSource
      .getRepository(Campaign)
      .findAndCount({
        where,
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    return { items, total, page, limit };
  }

  /** Retrieve a single campaign by id. */
  async findOne(id: number): Promise<Campaign | null> {
    return this.dataSource.getRepository(Campaign).findOne({ where: { id } });
  }

  /**
   * Update a draft campaign.
   *
   * Only drafts can be edited. `status`, `scheduledAt` and `sentAt` are
   * managed by the schedule/cancel endpoints and are not updatable here.
   */
  async update(
    id: number,
    dto: Partial<{
      name: string;
      subject: string;
      heading: string;
      content: string;
      imageUrl: string | null;
      ctaLabel: string | null;
      ctaUrl: string | null;
      audienceDefinition: Record<string, unknown> | null;
    }>,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }

    if (campaign.status !== 'draft') {
      throw new BadRequestException(
        `Campaign ${id} is ${campaign.status}; only drafts can be edited.`,
      );
    }

    const updates: Record<string, unknown> = {};
    for (const field of DRAFT_EDITABLE_FIELDS) {
      if (field in dto) {
        updates[field] = (dto as Record<string, unknown>)[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return campaign;
    }

    await this.dataSource
      .getRepository(Campaign)
      .update({ id, status: 'draft' }, updates);

    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }
    return updated;
  }

  /**
   * Schedule a draft campaign for a future date.
   *
   * Requires a valid future `scheduledAt`. Scheduled execution is out of
   * scope: this only stores the date.
   */
  async schedule(id: number, dto: { scheduledAt: string }): Promise<Campaign> {
    const campaign = await this.findOne(id);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }

    if (campaign.status !== 'draft') {
      throw new BadRequestException(
        `Campaign ${id} is ${campaign.status}; only drafts can be scheduled.`,
      );
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (
      Number.isNaN(scheduledAt.getTime()) ||
      scheduledAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        `Campaign ${id} must be scheduled for a future date.`,
      );
    }

    await this.dataSource
      .getRepository(Campaign)
      .update({ id, status: 'draft' }, { status: 'scheduled', scheduledAt });

    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }
    return updated;
  }

  /**
   * Cancel a draft or scheduled campaign.
   *
   * Once a campaign is no longer a draft (scheduled/sending/sent/failed), it
   * can no longer be edited or rescheduled; only cancellation remains
   * available from draft or scheduled.
   */
  async cancel(id: number): Promise<Campaign> {
    const campaign = await this.findOne(id);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new BadRequestException(
        `Campaign ${id} is ${campaign.status}; only drafts and scheduled campaigns can be cancelled.`,
      );
    }

    await this.dataSource
      .getRepository(Campaign)
      .update({ id, status: campaign.status }, { status: 'cancelled' });

    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }
    return updated;
  }

  /**
   * Sends a draft campaign immediately.
   *
   * Workflow:
   * 1. Claim the draft atomically (`draft -> sending`) in the same
   *    transaction that enqueues the recipient rows, so a concurrent send
   *    request can never enqueue duplicate emails for the same campaign.
   * 2. Re-read the eligible audience at send time from the database (never
   *    a cached preview) and render the campaign content once.
   * 3. Write one `promotional` outbox row per recipient, in keyset-ordered
   *    batches, with a deterministic per-(campaign, address) event key and
   *    the standard `orIgnore` deduplication.
   * 4. After commit, kick off one dispatch batch and reconcile the campaign
   *    from its outbox rows.
   *
   * Only `draft` campaigns may be sent. A malformed audience definition
   * fails inside the transaction, and the rollback leaves the campaign a
   * draft with no outbox rows. The operation is all-or-nothing.
   */
  async send(
    id: number,
  ): Promise<{ campaign: Campaign; recipientCount: number }> {
    const existing = await this.dataSource
      .getRepository(Campaign)
      .findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }
    if (existing.status !== 'draft') {
      throw new BadRequestException(
        `Campaign ${id} is ${existing.status}; only draft campaigns can be sent.`,
      );
    }

    const claimed = await this.dataSource.transaction(async (manager) => {
      // Atomic claim: only one request can flip draft -> sending.
      const result = await manager
        .createQueryBuilder()
        .update(Campaign)
        .set({ status: 'sending', updatedAt: () => 'CURRENT_TIMESTAMP' })
        .where('id = :id AND status = :status', { id, status: 'draft' })
        .execute();

      if ((result.affected ?? 0) === 0) {
        const current = await manager
          .getRepository(Campaign)
          .findOne({ where: { id } });
        if (!current) {
          throw new NotFoundException(`Campaign ${id} not found.`);
        }
        throw new BadRequestException(
          `Campaign ${id} is ${current.status}; only draft campaigns can be sent.`,
        );
      }

      const campaign = await manager
        .getRepository(Campaign)
        .findOneOrFail({ where: { id } });
      const recipientCount = await this.enqueueRecipientsInTx(
        manager,
        campaign,
      );

      return { campaign, recipientCount };
    });

    // The transaction is committed; dispatch happens outside of it so a
    // provider never receives a call inside an open database transaction.
    await this.notificationsService.dispatchPending();

    const campaign = await this.reconcileSendingCampaign(id);
    return { campaign, recipientCount: claimed.recipientCount };
  }

  /**
   * Claims and executes due scheduled campaigns, one at a time.
   *
   * Each campaign is claimed (`scheduled -> sending`, only when due) and its
   * recipients enqueued inside a single transaction, so a restart can never
   * leave a claimed campaign without its intended outbox rows. Dispatch and
   * reconciliation run after commit. Overlapping executions within one process
   * must be prevented by the caller; multiple instances are safe because the
   * claim uses `FOR UPDATE SKIP LOCKED`.
   *
   * If a due campaign cannot be executed (for example a malformed audience
   * definition that causes claim/enqueue to roll back), it is transitioned to
   * `failed` so the scheduler does not retry it every polling interval. No
   * outbox rows are created in that case because the enqueue transaction rolls
   * back.
   */
  async processDueScheduledCampaigns(): Promise<number> {
    let processed = 0;

    for (;;) {
      let claimed: { id: number; recipientCount: number } | null;
      try {
        claimed = await this.claimAndEnqueueNextDueScheduled();
      } catch (error: unknown) {
        const failedId = await this.failNextInvalidDueScheduledCampaign(error);
        if (failedId !== null) {
          processed += 1;
          continue;
        }
        throw error;
      }

      if (!claimed) {
        break;
      }

      try {
        await this.notificationsService.dispatchPending();
      } catch (error: unknown) {
        this.logger.error(
          `Dispatch after scheduling campaign ${claimed.id} failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      try {
        await this.reconcileSendingCampaign(claimed.id);
      } catch (error: unknown) {
        this.logger.error(
          `Reconciliation after scheduling campaign ${claimed.id} failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      processed += 1;
    }

    return processed;
  }

  /**
   * Atomically claims the next due scheduled campaign and enqueues its
   * recipients in the same transaction. Returns null when none are due.
   */
  private async claimAndEnqueueNextDueScheduled(): Promise<{
    id: number;
    recipientCount: number;
  } | null> {
    return this.dataSource.transaction(async (manager) => {
      const rows = await manager.query<Array<{ id: number }>>(
        `UPDATE campaigns
         SET status = 'sending', updated_at = CURRENT_TIMESTAMP
         WHERE id = (
           SELECT id FROM campaigns
           WHERE status = 'scheduled'
             AND scheduled_at <= (NOW() AT TIME ZONE 'UTC')
           ORDER BY scheduled_at ASC, id ASC
           FOR UPDATE SKIP LOCKED
           LIMIT 1
         )
         RETURNING id`,
      );

      const claimedRow = this.extractReturnedIdRow(rows);
      if (!claimedRow) {
        return null;
      }

      const rawId = claimedRow.id;
      const id = typeof rawId === 'number' ? rawId : Number(rawId);
      if (!Number.isFinite(id)) {
        throw new Error(
          `Invalid campaign id returned from scheduled claim: ${JSON.stringify(rows[0])}`,
        );
      }

      const campaign = await manager
        .getRepository(Campaign)
        .findOneOrFail({ where: { id } });
      const recipientCount = await this.enqueueRecipientsInTx(
        manager,
        campaign,
      );

      return { id, recipientCount };
    });
  }

  /**
   * When a due scheduled campaign cannot be claimed+enqueued (the transaction
   * rolled back, leaving it scheduled), transition that campaign to `failed` so
   * it is not retried every polling interval. This preserves campaign history
   * and creates no outbox rows. Returns the failed campaign id, or null if no
   * due scheduled campaign could be identified/marked (allowing the caller to
   * rethrow transient errors).
   */
  private async failNextInvalidDueScheduledCampaign(
    error: unknown,
  ): Promise<number | null> {
    if (!this.isTerminalScheduledExecutionError(error)) {
      return null;
    }

    const message = error instanceof Error ? error.message : String(error);
    const result = await this.dataSource.query<Array<{ id: number }>>(
      `UPDATE campaigns
       SET status = 'failed', updated_at = CURRENT_TIMESTAMP
       WHERE id = (
         SELECT id FROM campaigns
         WHERE status = 'scheduled'
           AND scheduled_at <= (NOW() AT TIME ZONE 'UTC')
         ORDER BY scheduled_at ASC, id ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING id`,
    );

    const failedRow = this.extractReturnedIdRow(result);
    if (!failedRow) {
      return null;
    }

    const rawId = failedRow.id;
    const id = typeof rawId === 'number' ? rawId : Number(rawId);
    if (!Number.isFinite(id)) {
      return null;
    }
    this.logger.error(
      `Scheduled campaign ${id} marked failed due to non-retryable execution error: ${message}`,
    );
    return id;
  }

  private isTerminalScheduledExecutionError(error: unknown): boolean {
    // Audience/content validation failures thrown by the campaign pipeline are
    // deterministic and will not succeed on retry. Marking the due campaign as
    // failed prevents the scheduler from reprocessing it every polling interval.
    return error instanceof BadRequestException;
  }

  /**
   * Enqueues one `promotional` outbox row per eligible recipient for a campaign
   * that is already in `sending`. Must run inside the claiming transaction so
   * claim and enqueue commit together. Uses the same audience iteration,
   * rendering, deterministic event keys and outbox deduplication as immediate
   * sends.
   */
  private async enqueueRecipientsInTx(
    manager: EntityManager,
    campaign: Campaign,
  ): Promise<number> {
    const rendered = renderCampaignEmail(campaign);

    let recipientCount = 0;
    for await (const batch of this.audienceService.iterateEligibleRecipients(
      campaign.audienceDefinition,
      SEND_BATCH_SIZE,
      manager,
    )) {
      for (const recipient of batch) {
        await this.notificationsService.enqueuePromotional(manager, {
          eventKey: campaignSendEventKey(campaign.id, recipient.email),
          recipientEmail: recipient.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });
        recipientCount += 1;
      }
    }

    if (recipientCount === 0) {
      // Vacuous completion: zero intended recipients, nothing to dispatch.
      await manager
        .createQueryBuilder()
        .update(Campaign)
        .set({
          status: 'sent',
          sentAt: () => 'CURRENT_TIMESTAMP',
          updatedAt: () => 'CURRENT_TIMESTAMP',
        })
        .where('id = :id AND status = :status', {
          id: campaign.id,
          status: 'sending',
        })
        .execute();
    }

    return recipientCount;
  }

  /**
   * Reconciles a `sending` campaign from its promotional outbox rows.
   *
   * - No rows in flight and zero recipients: nothing to reconcile here
   *   (the send path marks an empty send as `sent`).
   * - No rows in flight and at least one permanent failure: `sent -> failed`
   *   is not possible; `sending -> failed` means completion is impossible.
   * - Nothing in flight and every row accepted by the provider:
   *   `sending -> sent`.
   * - Anything still pending/sending: keep `sending`.
   */
  async reconcileSendingCampaign(id: number): Promise<Campaign> {
    const campaign = await this.requireCampaign(id);
    if (campaign.status !== 'sending') {
      return campaign;
    }

    const counts = await this.outboxCountsFor(id);
    if (counts.total === 0 || counts.inFlight > 0) {
      return campaign;
    }

    const next: CampaignStatus = counts.failed > 0 ? 'failed' : 'sent';
    await this.dataSource
      .createQueryBuilder()
      .update(Campaign)
      .set({
        status: next,
        sentAt: next === 'sent' ? () => 'CURRENT_TIMESTAMP' : () => 'NULL',
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :id AND status = :status', { id, status: 'sending' })
      .execute();

    return this.requireCampaign(id);
  }

  /** Reconciles every campaign currently in `sending`. */
  async reconcileSendingCampaigns(): Promise<void> {
    const sending = await this.dataSource
      .getRepository(Campaign)
      .find({ where: { status: 'sending' }, select: { id: true } });

    for (const campaign of sending) {
      try {
        await this.reconcileSendingCampaign(campaign.id);
      } catch (error: unknown) {
        this.logger.error(
          `Failed to reconcile campaign ${campaign.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  private async requireCampaign(id: number): Promise<Campaign> {
    const campaign = await this.dataSource
      .getRepository(Campaign)
      .findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }
    return campaign;
  }

  private async outboxCountsFor(id: number): Promise<{
    total: number;
    sent: number;
    inFlight: number;
    failed: number;
  }> {
    const rows = await this.dataSource.query<
      Array<{
        total: string;
        sent: string;
        in_flight: string;
        failed: string;
      }>
    >(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE status = 'sent')::text AS sent,
              COUNT(*) FILTER (WHERE status IN ('pending', 'sending'))::text AS in_flight,
              COUNT(*) FILTER (WHERE status = 'failed')::text AS failed
       FROM email_outbox
       WHERE event_key LIKE $1`,
      [`campaign_send:${id}:%`],
    );

    const row = rows[0];
    return {
      total: Number(row.total),
      sent: Number(row.sent),
      inFlight: Number(row.in_flight),
      failed: Number(row.failed),
    };
  }

  /** Returns whether a status transition is permitted. */
  isValidTransition(from: CampaignStatus, to: CampaignStatus): boolean {
    const allowed: Record<CampaignStatus, CampaignStatus[]> = {
      draft: ['scheduled', 'cancelled', 'sending', 'sent'],
      scheduled: ['cancelled', 'sending'],
      sending: ['sent', 'failed'],
      sent: [],
      failed: [],
      cancelled: [],
    };

    return (allowed[from] ?? []).includes(to);
  }

  /** Validate the audience definition for create/update operations. */
  validateAudienceDefinition(definition: Record<string, unknown>): void {
    this.audienceService.validateAudienceDefinition(definition);
  }

  private extractReturnedIdRow(rows: unknown): { id?: number | string } | null {
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const first: unknown = rows[0];
    if (Array.isArray(first)) {
      if (first.length === 0) {
        return null;
      }
      const nested: unknown = first[0];
      if (nested && typeof nested === 'object') {
        return nested;
      }
      return null;
    }

    if (first && typeof first === 'object') {
      return first;
    }

    return null;
  }
}
