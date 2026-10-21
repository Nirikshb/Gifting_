import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProducts1792400315297 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                slug VARCHAR(180) NOT NULL,
                description TEXT NOT NULL,
                price NUMERIC(10, 2) NOT NULL,
                stock_quantity INTEGER NOT NULL DEFAULT 0,
                image_url VARCHAR(500),
                category VARCHAR(80) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT products_slug_unique UNIQUE (slug),
                CONSTRAINT products_price_non_negative CHECK (price >= 0),
                CONSTRAINT products_stock_quantity_non_negative CHECK (stock_quantity >= 0)
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE products`);
    }
}
