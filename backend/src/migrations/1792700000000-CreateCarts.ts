import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCarts1792700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE carts (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER,
                guest_token_hash VARCHAR(64),
                last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT carts_customer_id_fkey
                    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
                CONSTRAINT carts_customer_id_unique UNIQUE (customer_id),
                CONSTRAINT carts_guest_token_hash_unique UNIQUE (guest_token_hash),
                CONSTRAINT carts_exactly_one_owner CHECK (
                    (
                        customer_id IS NOT NULL
                        AND guest_token_hash IS NULL
                    )
                    OR (
                        customer_id IS NULL
                        AND guest_token_hash IS NOT NULL
                    )
                )
            )
        `);

    await queryRunner.query(`
            CREATE INDEX carts_expires_at_idx ON carts (expires_at)
        `);

    await queryRunner.query(`
            CREATE TABLE cart_items (
                id SERIAL PRIMARY KEY,
                cart_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                seen_unit_price NUMERIC(10, 2) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT cart_items_cart_id_fkey
                    FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE CASCADE,
                CONSTRAINT cart_items_product_id_fkey
                    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
                CONSTRAINT cart_items_cart_id_product_id_unique
                    UNIQUE (cart_id, product_id),
                CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0),
                CONSTRAINT cart_items_seen_unit_price_non_negative
                    CHECK (seen_unit_price >= 0)
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE cart_items`);
    await queryRunner.query(`DROP TABLE carts`);
  }
}
