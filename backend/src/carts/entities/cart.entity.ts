import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { CartItem } from './cart-item.entity';

@Entity('carts')
@Unique('carts_customer_id_unique', ['customerId'])
@Unique('carts_guest_token_hash_unique', ['guestTokenHash'])
@Check(
  'carts_exactly_one_owner',
  '(customer_id IS NOT NULL AND guest_token_hash IS NULL) OR (customer_id IS NULL AND guest_token_hash IS NOT NULL)',
)
export class Cart {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'customer_id', type: 'integer', nullable: true })
  customerId!: number | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer | null;

  @Column({ name: 'guest_token_hash', type: 'varchar', length: 64, nullable: true })
  guestTokenHash!: string | null;

  @Column({ name: 'last_activity_at', type: 'timestamp' })
  lastActivityAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @OneToMany(() => CartItem, (item) => item.cart)
  items!: CartItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
