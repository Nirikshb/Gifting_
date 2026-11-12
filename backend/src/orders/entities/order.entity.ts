import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'unpaid',
  'pending',
  'paid',
  'failed',
  'refunded',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

@Entity('orders')
@Check('orders_total_non_negative', 'total_amount >= 0')
@Check('orders_subtotal_non_negative', 'subtotal_amount >= 0')
@Check('orders_shipping_non_negative', 'shipping_amount >= 0')
@Check(
  'orders_total_matches',
  'subtotal_amount + shipping_amount = total_amount',
)
@Check(
  'orders_order_status_valid',
  "order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')",
)
@Check(
  'orders_payment_status_valid',
  "payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')",
)
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_reference', unique: true, length: 36 })
  orderReference!: string;

  @Column({ name: 'customer_id', type: 'integer', nullable: true })
  customerId!: number | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer | null;

  @Column({ name: 'customer_name', length: 150 })
  customerName!: string;

  @Column({ name: 'customer_email', length: 255 })
  customerEmail!: string;

  @Column({ name: 'recipient_name', type: 'varchar', length: 150, nullable: true })
  recipientName!: string | null;

  @Column({ name: 'delivery_line1', length: 200 })
  deliveryLine1!: string;

  @Column({ name: 'delivery_line2', type: 'varchar', length: 200, nullable: true })
  deliveryLine2!: string | null;

  @Column({ name: 'delivery_city', length: 100 })
  deliveryCity!: string;

  @Column({ name: 'delivery_postcode', length: 20 })
  deliveryPostcode!: string;

  @Column({ name: 'delivery_country', length: 100 })
  deliveryCountry!: string;

  @Column({ name: 'gift_message', type: 'varchar', length: 500, nullable: true })
  giftMessage!: string | null;

  @Column({
    name: 'subtotal_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  subtotalAmount!: string;

  @Column({
    name: 'shipping_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  shippingAmount!: string;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  totalAmount!: string;

  @Column({
    name: 'order_status',
    type: 'varchar',
    length: 32,
    default: 'pending',
  })
  orderStatus!: OrderStatus;

  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: 32,
    default: 'unpaid',
  })
  paymentStatus!: PaymentStatus;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 64,
    nullable: true,
    unique: true,
  })
  idempotencyKey!: string | null;

  @Column({
    name: 'confirmation_token_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  confirmationTokenHash!: string | null;

  /**
   * Set only by a verified payment event. Never written from request input.
   */
  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt!: Date | null;

  /**
   * Guards stock restoration so a cancelled order restores inventory exactly
   * once, even if cancellation is retried.
   */
  @Column({ name: 'stock_restored_at', type: 'timestamp', nullable: true })
  stockRestoredAt!: Date | null;

  @Column({
    name: 'payment_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  paymentReference!: string | null;

  @OneToMany(() => OrderItem, (item) => item.order)
  items!: OrderItem[];

  @OneToMany(() => OrderStatusHistory, (history) => history.order)
  statusHistory!: OrderStatusHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
