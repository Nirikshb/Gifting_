import { DataSource } from 'typeorm';
import { CartItem } from './carts/entities/cart-item.entity';
import { Cart } from './carts/entities/cart.entity';
import { CustomerSession } from './customers/entities/customer-session.entity';
import { Customer } from './customers/entities/customer.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { Order } from './orders/entities/order.entity';
import { Product } from './products/entities/product.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [Product, Order, OrderItem, Customer, CustomerSession, Cart, CartItem],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
