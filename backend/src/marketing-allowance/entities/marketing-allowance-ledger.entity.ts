import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const MARKETING_ALLOWANCE_CATEGORIES = [
  'promotional',
  'abandoned_cart',
] as const;
export type MarketingAllowanceCategory =
  (typeof MARKETING_ALLOWANCE_CATEGORIES)[number];

export const MARKETING_ALLOWANCE_STATUSES = [
  'reserved',
  'sent',
  'failed',
] as const;
export type MarketingAllowanceStatus =
  (typeof MARKETING_ALLOWANCE_STATUSES)[number];

/**
 * One row per recipient per marketing category, tracking the one-time
 * marketing allowance.
 *
 * PostgreSQL remains the source of truth. This ledger only records whether
 * the allowance for a category has been reserved, consumed (provider
 * accepted), or permanently failed. Provider acceptance is not inbox
 * delivery confirmation.
 */
@Entity('marketing_allowance_ledger')
@Index(
  'marketing_allowance_ledger_email_category_unique',
  ['normalizedEmail', 'marketingCategory'],
  { unique: true },
)
export class MarketingAllowanceLedger {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Lowercase, trimmed email - the mandatory reservation identity. */
  @Column({ name: 'normalized_email', type: 'varchar', length: 255 })
  normalizedEmail!: string;

  /** Optional link to an authenticated customer account. */
  @Column({ name: 'customer_id', type: 'integer', nullable: true })
  customerId!: number | null;

  /** Which one-time allowance this row tracks. */
  @Column({ name: 'marketing_category', type: 'varchar', length: 32 })
  marketingCategory!: MarketingAllowanceCategory;

  /**
   * Reference to the campaign that consumed the allowance.
   *
   * Nullable and without a foreign key: no campaign entity exists yet, so
   * declaring a FK would invent a target that does not exist. It is kept as a
   * plain integer so the ledger can reference a campaign once one is created,
   * without requiring a migration to add the constraint later.
   */
  @Column({ name: 'campaign_id', type: 'integer', nullable: true })
  campaignId!: number | null;

  /**
   * Reference to the EmailOutbox delivery-attempt record.
   *
   * Nullable until a marketing email is enqueued. EmailOutbox remains the
   * source of delivery-attempt history; no FK is declared here yet.
   */
  @Column({ name: 'outbox_id', type: 'integer', nullable: true })
  outboxId!: number | null;

  @Column({ name: 'status', type: 'varchar', length: 16 })
  status!: MarketingAllowanceStatus;

  @Column({
    name: 'provider_message_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerMessageId!: string | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
