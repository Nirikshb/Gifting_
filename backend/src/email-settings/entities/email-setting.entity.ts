import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * One row per independently controllable transactional email category.
 * These are runtime, database-backed settings: editable without deployment,
 * persisted across restarts, and never holding provider credentials.
 */
@Entity('email_settings')
export class EmailSetting {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Stable category key, e.g. `order_confirmation`, `payment_confirmation`. */
  @Column({ unique: true, length: 64 })
  key!: string;

  /** Whether this category is currently dispatched. */
  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  /** Human-readable description shown in the admin UI. */
  @Column({ type: 'text' })
  description!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
