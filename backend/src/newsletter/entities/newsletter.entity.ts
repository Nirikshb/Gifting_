import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const NEWSLETTER_STATUSES = [
  'pending_confirmation',
  'subscribed',
  'unsubscribed',
] as const;
export type NewsletterStatus = (typeof NEWSLETTER_STATUSES)[number];

@Entity('newsletter_subscriptions')
export class Newsletter {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 32, default: 'pending_confirmation' })
  status!: NewsletterStatus;

  /** When the marketing consent was given (double opt-in sets it at subscribe). */
  @Column({ name: 'consent_at', type: 'timestamp', nullable: true })
  consentAt!: Date | null;

  /** Where the consent came from, e.g. `api`, `checkout_banner`. */
  @Column({
    name: 'consent_source',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  consentSource!: string | null;

  /** Consent text / version the user accepted, e.g. `weekly-newsletter:v1`. */
  @Column({
    name: 'consent_text',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  consentText!: string | null;

  /** When the double opt-in confirmation was accepted. */
  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt!: Date | null;

  /** Hash of the single-use confirmation token; null once confirmed. */
  @Column({
    name: 'confirmation_token_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  confirmationTokenHash!: string | null;

  @Column({
    name: 'confirmation_token_expires_at',
    type: 'timestamp',
    nullable: true,
  })
  confirmationTokenExpiresAt!: Date | null;

  /** When the confirmation email was last sent out. */
  @Column({ name: 'confirmation_sent_at', type: 'timestamp', nullable: true })
  confirmationSentAt!: Date | null;

  /** Hash of the single-use unsubscribe token; null once used. */
  @Column({
    name: 'unsubscribe_token_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  unsubscribeTokenHash!: string | null;

  @Column({ name: 'unsubscribed_at', type: 'timestamp', nullable: true })
  unsubscribedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
