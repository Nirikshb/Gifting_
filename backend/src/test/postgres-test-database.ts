import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { ProductImage } from '../products/entities/product-image.entity';
import { StockAdjustment } from '../products/entities/stock-adjustment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStatusHistory } from '../orders/entities/order-status-history.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerSession } from '../customers/entities/customer-session.entity';
import { Cart } from '../carts/entities/cart.entity';
import { CartItem } from '../carts/entities/cart-item.entity';
import { Newsletter } from '../newsletter/entities/newsletter.entity';
import { Campaign } from '../campaign/entities/campaign.entity';
import { EmailOutbox } from '../notifications/entities/email-outbox.entity';
import { EmailSetting } from '../email-settings/entities/email-setting.entity';
import { MarketingAllowanceLedger } from '../marketing-allowance/entities/marketing-allowance-ledger.entity';
import { CreateProducts1792400315297 } from '../migrations/1792400315297-CreateProducts';
import { CreateOrders1792500800000 } from '../migrations/1792500800000-CreateOrders';
import { CreateCustomersAndSessions1792600000000 } from '../migrations/1792600000000-CreateCustomersAndSessions';
import { CreateCarts1792700000000 } from '../migrations/1792700000000-CreateCarts';
import { CreateNewsletterSubscriptions1792800000000 } from '../migrations/1792800000000-CreateNewsletterSubscriptions';
import { AddCheckoutFieldsToOrders1792900000000 } from '../migrations/1792900000000-AddCheckoutFieldsToOrders';
import { OrderLifecycle1793000000000 } from '../migrations/1793000000000-OrderLifecycle';
import { ProductManagement1793100000000 } from '../migrations/1793100000000-ProductManagement';
import { EmailOutbox1793200000000 } from '../migrations/1793200000000-EmailOutbox';
import { NewsletterConsent1793300000000 } from '../migrations/1793300000000-NewsletterConsent';
import { EmailSettings1793400000000 } from '../migrations/1793400000000-EmailSettings';
import { MarketingAllowanceLedger1793500000000 } from '../migrations/1793500000000-MarketingAllowanceLedger';
import { Campaigns1793600000000 } from '../migrations/1793600000000-Campaigns';
import { EmailOutboxMarketingEvents1793700000000 } from '../migrations/1793700000000-EmailOutboxMarketingEvents';
import { EmailOutboxSubscriberKind1793800000000 } from '../migrations/1793800000000-EmailOutboxSubscriberKind';

/**
 * Shared harness for database-backed integration specs: creates a dedicated
 * throwaway database, applies every migration and returns a connected
 * data source. The database is dropped by `dropTestDatabase` in teardown.
 */

export function testDatabaseEnv(): {
  host: string;
  port: number;
  username: string;
  password: string;
} {
  const host = process.env.DB_HOST ?? '127.0.0.1';
  const port = Number(process.env.DB_PORT ?? 5432);
  const username = process.env.DB_USERNAME;
  const password = process.env.DB_PASSWORD;
  if (!username || !password) {
    throw new Error(
      'Integration tests require DB_USERNAME and DB_PASSWORD (see backend/.env).',
    );
  }
  return { host, port, username, password };
}

const ALL_ENTITIES = [
  Product,
  ProductImage,
  StockAdjustment,
  Order,
  OrderItem,
  OrderStatusHistory,
  EmailOutbox,
  EmailSetting,
  MarketingAllowanceLedger,
  Customer,
  CustomerSession,
  Cart,
  CartItem,
  Newsletter,
  Campaign,
];

const ALL_MIGRATIONS = [
  CreateProducts1792400315297,
  CreateOrders1792500800000,
  CreateCustomersAndSessions1792600000000,
  CreateCarts1792700000000,
  CreateNewsletterSubscriptions1792800000000,
  AddCheckoutFieldsToOrders1792900000000,
  OrderLifecycle1793000000000,
  ProductManagement1793100000000,
  EmailOutbox1793200000000,
  NewsletterConsent1793300000000,
  EmailSettings1793400000000,
  MarketingAllowanceLedger1793500000000,
  Campaigns1793600000000,
  EmailOutboxMarketingEvents1793700000000,
  EmailOutboxSubscriberKind1793800000000,
];

export async function createTestDatabase(
  database: string,
): Promise<DataSource> {
  const env = testDatabaseEnv();
  const maintenance = new DataSource({
    type: 'postgres',
    ...env,
    database: 'postgres',
    synchronize: false,
  });
  await maintenance.initialize();
  await maintenance.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
  await maintenance.query(`CREATE DATABASE ${database}`);
  await maintenance.destroy();

  const dataSource = new DataSource({
    type: 'postgres',
    ...env,
    database,
    entities: ALL_ENTITIES,
    migrations: ALL_MIGRATIONS,
    synchronize: false,
  });
  await dataSource.initialize();
  await dataSource.runMigrations();
  return dataSource;
}

export async function dropTestDatabase(
  dataSource: DataSource | undefined,
  database: string,
): Promise<void> {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
  const env = testDatabaseEnv();
  const maintenance = new DataSource({
    type: 'postgres',
    ...env,
    database: 'postgres',
    synchronize: false,
  });
  await maintenance.initialize();
  await maintenance.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
  await maintenance.destroy();
}
