import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the fulfilment/payment lifecycle, staff role support and the order
 * status history used by the admin timeline.
 *
 * Existing orders are backfilled with history rows so the timeline starts from
 * a complete record instead of appearing empty.
 */
export class OrderLifecycle1793000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE customers
                ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'customer',
                ADD CONSTRAINT customers_role_valid
                    CHECK (role IN ('customer', 'admin'))
        `);

    await queryRunner.query(`
            ALTER TABLE orders
                ADD COLUMN paid_at TIMESTAMP,
                ADD COLUMN cancelled_at TIMESTAMP,
                ADD COLUMN stock_restored_at TIMESTAMP,
                ADD COLUMN payment_reference VARCHAR(255)
        `);

    await queryRunner.query(`
            ALTER TABLE orders
                DROP CONSTRAINT orders_order_status_valid,
                DROP CONSTRAINT orders_payment_status_valid
        `);

    await queryRunner.query(`
            ALTER TABLE orders
                ADD CONSTRAINT orders_order_status_valid CHECK (
                    order_status IN (
                        'pending',
                        'confirmed',
                        'processing',
                        'shipped',
                        'delivered',
                        'cancelled'
                    )
                ),
                ADD CONSTRAINT orders_payment_status_valid CHECK (
                    payment_status IN (
                        'unpaid',
                        'pending',
                        'paid',
                        'failed',
                        'refunded'
                    )
                )
        `);

    await queryRunner.query(`
            CREATE INDEX orders_payment_status_idx ON orders (payment_status)
        `);

    await queryRunner.query(`
            CREATE INDEX orders_customer_created_at_idx
                ON orders (customer_id, created_at DESC)
        `);

    await queryRunner.query(`
            CREATE TABLE order_status_history (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                category VARCHAR(16) NOT NULL,
                from_status VARCHAR(32),
                to_status VARCHAR(32) NOT NULL,
                note VARCHAR(500),
                actor_type VARCHAR(16) NOT NULL,
                actor_id INTEGER,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT order_status_history_order_id_fkey
                    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
                CONSTRAINT order_status_history_category_valid
                    CHECK (category IN ('fulfilment', 'payment')),
                CONSTRAINT order_status_history_actor_type_valid
                    CHECK (actor_type IN ('customer', 'admin', 'system'))
            )
        `);

    await queryRunner.query(`
            CREATE INDEX order_status_history_order_created_at_idx
                ON order_status_history (order_id, created_at, id)
        `);

    // Backfill one starting point for each existing order's current state.
    await queryRunner.query(`
            INSERT INTO order_status_history (
                order_id,
                category,
                from_status,
                to_status,
                note,
                actor_type,
                actor_id,
                created_at
            )
            SELECT
                id,
                'fulfilment',
                NULL,
                order_status,
                'Recorded before status history was introduced',
                'system',
                NULL,
                created_at
            FROM orders
        `);

    await queryRunner.query(`
            INSERT INTO order_status_history (
                order_id,
                category,
                from_status,
                to_status,
                note,
                actor_type,
                actor_id,
                created_at
            )
            SELECT
                id,
                'payment',
                NULL,
                payment_status,
                'Recorded before status history was introduced',
                'system',
                NULL,
                created_at
            FROM orders
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE order_status_history`);

    // Statuses introduced by this migration do not fit the old constraints.
    await queryRunner.query(`
            UPDATE orders
            SET order_status = 'confirmed'
            WHERE order_status IN ('processing', 'shipped', 'delivered')
        `);

    await queryRunner.query(`
            UPDATE orders
            SET payment_status = 'unpaid'
            WHERE payment_status IN ('pending', 'refunded')
        `);

    await queryRunner.query(`
            ALTER TABLE orders
                DROP CONSTRAINT orders_order_status_valid,
                DROP CONSTRAINT orders_payment_status_valid
        `);

    await queryRunner.query(`
            ALTER TABLE orders
                ADD CONSTRAINT orders_order_status_valid
                    CHECK (order_status IN ('pending', 'confirmed', 'cancelled')),
                ADD CONSTRAINT orders_payment_status_valid
                    CHECK (payment_status IN ('unpaid', 'paid', 'failed'))
        `);

    await queryRunner.query(`DROP INDEX orders_customer_created_at_idx`);
    await queryRunner.query(`DROP INDEX orders_payment_status_idx`);

    await queryRunner.query(`
            ALTER TABLE orders
                DROP COLUMN payment_reference,
                DROP COLUMN stock_restored_at,
                DROP COLUMN cancelled_at,
                DROP COLUMN paid_at
        `);

    await queryRunner.query(`
            ALTER TABLE customers
                DROP CONSTRAINT customers_role_valid,
                DROP COLUMN role
        `);
  }
}
