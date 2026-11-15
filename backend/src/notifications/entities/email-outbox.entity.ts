import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

export const NOTIFICATION_EVENT_TYPES = [
  'order_placed',
  'admin_new_order',
  'order_status_changed',
  'newsletter_confirmation',
  'payment_confirmed',
  'promotional',
  'abandoned_cart',
] as const;
export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const NOTIFICATION_RECIPIENT_KINDS = [
  'customer',
  'admin',
  'subscriber',
] as const;
export type NotificationRecipientKind =
  (typeof NOTIFICATION_RECIPIENT_KINDS)[number];

export const OUTBOX_STATUSES = [
  'pending',
  'sending',
  'sent',
  'failed',
] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

/**
 * One row per logical email event. The subject and bodies are rendered when
 * the row is written, so a later status change can never rewrite the wording
 * of an email that describes an earlier moment in the order's life.
 */
@Entity('email_outbox')
@Index(['status', 'nextAttemptAt', 'id'])
@Check(
  'email_outbox_event_type_valid',
  "event_type IN ('order_placed', 'admin_new_order', 'order_status_changed', 'newsletter_confirmation', 'payment_confirmed', 'promotional', 'abandoned_cart')",
)
@Check(
  'email_outbox_recipient_kind_valid',
  "recipient_kind IN ('customer', 'admin', 'subscriber')",
)
@Check(
  'email_outbox_status_valid',
  "status IN ('pending', 'sending', 'sent', 'failed')",
)
@Check('email_outbox_attempts_non_negative', 'attempts >= 0')
export class EmailOutbox {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Dedupe key, e.g. `order_placed:12` or `order_status:12:shipped`. */
  @Column({ name: 'event_key', unique: true, length: 255 })
  eventKey!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType!: NotificationEventType;

  @Column({ name: 'order_id', type: 'integer', nullable: true })
  orderId!: number | null;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'order_id',
    foreignKeyConstraintName: 'email_outbox_order_fkey',
  })
  order!: Order | null;

  /**
   * Empty when no recipient is configured yet; dispatch keeps such rows
   * pending with a clear error instead of dropping them.
   */
  @Column({
    name: 'recipient_email',
    type: 'varchar',
    length: 255,
    default: '',
  })
  recipientEmail!: string;

  @Column({ name: 'recipient_kind', type: 'varchar', length: 16 })
  recipientKind!: NotificationRecipientKind;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ name: 'html_body', type: 'text' })
  htmlBody!: string;

  @Column({ name: 'text_body', type: 'text' })
  textBody!: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: OutboxStatus;

  /** Incremented when a delivery attempt is claimed, not on configuration holds. */
  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error', type: 'varchar', length: 1000, nullable: true })
  lastError!: string | null;

  /** Rows become eligible for a delivery attempt at or after this time. */
  @Column({ name: 'next_attempt_at', type: 'timestamp' })
  nextAttemptAt!: Date;

  /** Set while one worker owns the row, so a retry cannot double-send. */
  @Column({ name: 'locked_at', type: 'timestamp', nullable: true })
  lockedAt!: Date | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @Column({
    name: 'provider_message_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerMessageId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
