import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the studio side of product management: uploaded product images and an
 * audit trail for manual stock adjustments.
 *
 * The products table itself is unchanged. Product images keep using the
 * existing `image_url` column, and stock keeps using `stock_quantity`.
 */
export class ProductManagement1793100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE product_images (
                id SERIAL PRIMARY KEY,
                original_name VARCHAR(255) NOT NULL,
                stored_name VARCHAR(100) NOT NULL,
                mime_type VARCHAR(80) NOT NULL,
                size_bytes INTEGER NOT NULL,
                created_by_customer_id INTEGER,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT product_images_stored_name_unique UNIQUE (stored_name),
                CONSTRAINT product_images_size_positive CHECK (size_bytes > 0),
                CONSTRAINT product_images_created_by_fkey
                    FOREIGN KEY (created_by_customer_id) REFERENCES customers (id) ON DELETE SET NULL
            )
        `);

    await queryRunner.query(`
            CREATE TABLE stock_adjustments (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL,
                previous_quantity INTEGER NOT NULL,
                new_quantity INTEGER NOT NULL,
                delta INTEGER NOT NULL,
                reason VARCHAR(500) NOT NULL,
                actor_type VARCHAR(16) NOT NULL DEFAULT 'admin',
                actor_id INTEGER,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT stock_adjustments_product_fkey
                    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
                CONSTRAINT stock_adjustments_actor_type_valid
                    CHECK (actor_type IN ('admin', 'system')),
                CONSTRAINT stock_adjustments_quantities_non_negative
                    CHECK (previous_quantity >= 0 AND new_quantity >= 0)
            )
        `);

    await queryRunner.query(`
            CREATE INDEX stock_adjustments_product_created_at_idx
                ON stock_adjustments (product_id, created_at DESC, id DESC)
        `);

    await queryRunner.query(`
            CREATE INDEX products_category_idx ON products (category)
        `);

    await queryRunner.query(`
            CREATE INDEX products_is_active_idx ON products (is_active)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS products_is_active_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS products_category_idx`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_adjustments`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_images`);
  }
}
