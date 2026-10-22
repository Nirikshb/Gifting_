import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrders1792500800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE orders (
                id SERIAL PRIMARY KEY,
                order_reference VARCHAR(36) NOT NULL,
                customer_name VARCHAR(150) NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                delivery_line1 VARCHAR(200) NOT NULL,
                delivery_line2 VARCHAR(200),
                delivery_city VARCHAR(100) NOT NULL,
                delivery_postcode VARCHAR(20) NOT NULL,
                delivery_country VARCHAR(100) NOT NULL,
                total_amount NUMERIC(10, 2) NOT NULL,
                order_status VARCHAR(32) NOT NULL DEFAULT 'pending',
                payment_status VARCHAR(32) NOT NULL DEFAULT 'unpaid',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT orders_order_reference_unique UNIQUE (order_reference),
                CONSTRAINT orders_total_non_negative CHECK (total_amount >= 0),
                CONSTRAINT orders_order_status_valid CHECK (
                    order_status IN ('pending', 'confirmed', 'cancelled')
                ),
                CONSTRAINT orders_payment_status_valid CHECK (
                    payment_status IN ('unpaid', 'paid', 'failed')
                )
            )
        `);

    await queryRunner.query(`
            CREATE INDEX orders_created_at_idx ON orders (created_at)
        `);

    await queryRunner.query(`
            CREATE INDEX orders_order_status_idx ON orders (order_status)
        `);

    await queryRunner.query(`
            CREATE TABLE order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                product_id INTEGER,
                product_name VARCHAR(150) NOT NULL,
                product_slug VARCHAR(180) NOT NULL,
                unit_price NUMERIC(10, 2) NOT NULL,
                quantity INTEGER NOT NULL,
                line_total NUMERIC(10, 2) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT order_items_order_id_fkey
                    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
                CONSTRAINT order_items_product_id_fkey
                    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
                CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
                CONSTRAINT order_items_unit_price_non_negative CHECK (unit_price >= 0),
                CONSTRAINT order_items_line_total_non_negative CHECK (line_total >= 0)
            )
        `);

    await queryRunner.query(`
            CREATE INDEX order_items_order_id_idx ON order_items (order_id)
        `);

    await queryRunner.query(`
            CREATE INDEX order_items_product_id_idx ON order_items (product_id)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE order_items`);
    await queryRunner.query(`DROP TABLE orders`);
  }
}
