import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Cart } from './cart.entity';

@Entity('cart_items')
@Unique('cart_items_cart_id_product_id_unique', ['cartId', 'productId'])
@Check('cart_items_quantity_positive', 'quantity > 0')
@Check('cart_items_seen_unit_price_non_negative', 'seen_unit_price >= 0')
export class CartItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'cart_id' })
  cartId!: number;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart!: Cart;

  @Column({ name: 'product_id' })
  productId!: number;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'seen_unit_price', type: 'numeric', precision: 10, scale: 2 })
  seenUnitPrice!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
