import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

export const ORDER_HISTORY_CATEGORIES = ['fulfilment', 'payment'] as const;
export type OrderHistoryCategory = (typeof ORDER_HISTORY_CATEGORIES)[number];

export const ORDER_HISTORY_ACTOR_TYPES = [
  'customer',
  'admin',
  'system',
] as const;
export type OrderHistoryActorType =
  (typeof ORDER_HISTORY_ACTOR_TYPES)[number];

@Entity('order_status_history')
@Check(
  'order_status_history_category_valid',
  "category IN ('fulfilment', 'payment')",
)
@Check(
  'order_status_history_actor_type_valid',
  "actor_type IN ('customer', 'admin', 'system')",
)
export class OrderStatusHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id' })
  orderId!: number;

  @ManyToOne(() => Order, (order) => order.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ type: 'varchar', length: 16 })
  category!: OrderHistoryCategory;

  @Column({
    name: 'from_status',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  fromStatus!: string | null;

  @Column({ name: 'to_status', type: 'varchar', length: 32 })
  toStatus!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note!: string | null;

  @Column({ name: 'actor_type', type: 'varchar', length: 16 })
  actorType!: OrderHistoryActorType;

  @Column({ name: 'actor_id', type: 'integer', nullable: true })
  actorId!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
