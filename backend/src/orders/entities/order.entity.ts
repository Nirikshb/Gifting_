import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

export const ORDER_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['unpaid', 'paid', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

@Entity('orders')
@Check('orders_total_non_negative', 'total_amount >= 0')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_reference', unique: true, length: 36 })
  orderReference!: string;

  @Column({ name: 'customer_name', length: 150 })
  customerName!: string;

  @Column({ name: 'customer_email', length: 255 })
  customerEmail!: string;

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

  @OneToMany(() => OrderItem, (item) => item.order)
  items!: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
