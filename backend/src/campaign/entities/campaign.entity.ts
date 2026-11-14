import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const CAMPAIGN_STATUSES = [
  'draft',
  'scheduled',
  'sending',
  'sent',
  'failed',
  'cancelled',
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/**
 * A marketing campaign definition.
 *
 * Campaign content is stored separately from the code-controlled email layout
 * (rendered by the shared branded templates), so content is editable without
 * changing the codebase. Arbitrary executable HTML is not accepted: content is
 * a plain text body rendered inside the code-controlled layout at send time.
 */
@Entity('campaigns')
@Index(['status', 'scheduledAt', 'id'])
export class Campaign {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Human-readable campaign name shown in the admin UI. */
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  /** Email subject line. */
  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  /** Email heading rendered inside the branded template. */
  @Column({ type: 'varchar', length: 255 })
  heading!: string;

  /** Plain-text campaign body rendered inside the branded template. */
  @Column({ type: 'text' })
  content!: string;

  /** Optional image URL referenced by the branded template. */
  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null;

  /** Optional call-to-action button label. */
  @Column({ name: 'cta_label', type: 'varchar', length: 255, nullable: true })
  ctaLabel!: string | null;

  /** Optional call-to-action destination URL. */
  @Column({ name: 'cta_url', type: 'varchar', length: 500, nullable: true })
  ctaUrl!: string | null;

  /** Audience segment definition (JSON), e.g. segment filters and criteria. */
  @Column({ name: 'audience_definition', type: 'jsonb', nullable: true })
  audienceDefinition!: Record<string, unknown> | null;

  @Column({ name: 'status', type: 'varchar', length: 16 })
  status!: CampaignStatus;

  /** When a scheduled campaign is due to be sent (null until scheduled). */
  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt!: Date | null;

  /** When the campaign was fully sent (null until sent). */
  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
