import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

export const STOCK_ADJUSTMENT_ACTOR_TYPES = ['admin', 'system'] as const;
export type StockAdjustmentActorType =
  (typeof STOCK_ADJUSTMENT_ACTOR_TYPES)[number];

/**
 * Audit trail for manual stock changes made in the admin area. Checkout
 * reservations and cancellation restorations are recorded on the order, not
 * here, so this table only contains deliberate admin adjustments.
 */
@Entity('stock_adjustments')
@Check(
  'stock_adjustments_actor_type_valid',
  "actor_type IN ('admin', 'system')",
)
@Check(
  'stock_adjustments_quantities_non_negative',
  'previous_quantity >= 0 AND new_quantity >= 0',
)
export class StockAdjustment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'product_id', type: 'integer' })
  productId!: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'previous_quantity', type: 'integer' })
  previousQuantity!: number;

  @Column({ name: 'new_quantity', type: 'integer' })
  newQuantity!: number;

  @Column({ type: 'integer' })
  delta!: number;

  @Column({ length: 500 })
  reason!: string;

  @Column({ name: 'actor_type', type: 'varchar', length: 16 })
  actorType!: StockAdjustmentActorType;

  @Column({ name: 'actor_id', type: 'integer', nullable: true })
  actorId!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
