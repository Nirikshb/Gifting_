import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckoutFieldsToOrders1792900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE orders
                ADD COLUMN customer_id INTEGER,
                ADD COLUMN recipient_name VARCHAR(150),
                ADD COLUMN gift_message VARCHAR(500),
                ADD COLUMN subtotal_amount NUMERIC(10, 2),
                ADD COLUMN shipping_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
                ADD COLUMN idempotency_key VARCHAR(64),
                ADD COLUMN confirmation_token_hash VARCHAR(64)
        `);

    // Legacy orders stored a single total: treat it as the subtotal with no shipping.
    await queryRunner.query(`
            UPDATE orders
            SET subtotal_amount = total_amount
            WHERE subtotal_amount IS NULL
        `);

    await queryRunner.query(`
            ALTER TABLE orders
                ALTER COLUMN subtotal_amount SET NOT NULL
        `);

    await queryRunner.query(`
            ALTER TABLE orders
                ADD CONSTRAINT orders_customer_id_fkey
                    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL,
                ADD CONSTRAINT orders_subtotal_non_negative CHECK (subtotal_amount >= 0),
                ADD CONSTRAINT orders_shipping_non_negative CHECK (shipping_amount >= 0),
                ADD CONSTRAINT orders_total_matches
                    CHECK (subtotal_amount + shipping_amount = total_amount),
                ADD CONSTRAINT orders_idempotency_key_unique UNIQUE (idempotency_key)
        `);

    await queryRunner.query(`
            CREATE INDEX orders_customer_id_idx ON orders (customer_id)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX orders_customer_id_idx`);

    await queryRunner.query(`
            ALTER TABLE orders
                DROP CONSTRAINT orders_idempotency_key_unique,
                DROP CONSTRAINT orders_total_matches,
                DROP CONSTRAINT orders_shipping_non_negative,
                DROP CONSTRAINT orders_subtotal_non_negative,
                DROP CONSTRAINT orders_customer_id_fkey
        `);

    await queryRunner.query(`
            ALTER TABLE orders
                DROP COLUMN confirmation_token_hash,
                DROP COLUMN idempotency_key,
                DROP COLUMN shipping_amount,
                DROP COLUMN subtotal_amount,
                DROP COLUMN gift_message,
                DROP COLUMN recipient_name,
                DROP COLUMN customer_id
        `);
  }
}
