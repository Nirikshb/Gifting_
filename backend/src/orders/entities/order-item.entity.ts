import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Order } from './order.entity';

@Entity('order_items')
@Check('order_items_quantity_positive', 'quantity > 0')
@Check('order_items_unit_price_non_negative', 'unit_price >= 0')
@Check('order_items_line_total_non_negative', 'line_total >= 0')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id' })
  orderId!: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'product_id', nullable: true })
  productId!: number | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product!: Product | null;

  @Column({ name: 'product_name', length: 150 })
  productName!: string;

  @Column({ name: 'product_slug', length: 180 })
  productSlug!: string;

  @Column({ name: 'unit_price', type: 'numeric', precision: 10, scale: 2 })
  unitPrice!: string;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'line_total', type: 'numeric', precision: 10, scale: 2 })
  lineTotal!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
