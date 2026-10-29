import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomersAndSessions1792600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE customers (
                id SERIAL PRIMARY KEY,
                google_sub VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                display_name VARCHAR(150) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT customers_google_sub_unique UNIQUE (google_sub)
            )
        `);

    await queryRunner.query(`
            CREATE TABLE customer_sessions (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER NOT NULL,
                token_hash VARCHAR(64) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT customer_sessions_token_hash_unique UNIQUE (token_hash),
                CONSTRAINT customer_sessions_customer_id_fkey
                    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
                CONSTRAINT customer_sessions_expires_after_created CHECK (
                    expires_at > created_at
                )
            )
        `);

    await queryRunner.query(`
            CREATE INDEX customer_sessions_customer_id_idx
                ON customer_sessions (customer_id)
        `);

    await queryRunner.query(`
            CREATE INDEX customer_sessions_expires_at_idx
                ON customer_sessions (expires_at)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE customer_sessions`);
    await queryRunner.query(`DROP TABLE customers`);
  }
}
