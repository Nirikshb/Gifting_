import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `marketing_allowance_ledger` table: one row per recipient per
 * marketing category, tracking the one-time marketing allowance.
 *
 * The unique constraint on (normalized_email, marketing_category) is what
 * makes reservation atomic: at most one row can exist per category per
 * address, so concurrent reservation requests cannot both succeed.
 *
 * `campaign_id` and `outbox_id` are nullable integers without foreign keys:
 * no campaign entity exists yet, so declaring a target would invent one. They
 * are kept so the ledger can reference a campaign and its outbox row once
 * those exist, without requiring a later migration to add the columns.
 */
export class MarketingAllowanceLedger1793500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE marketing_allowance_ledger (
                id SERIAL PRIMARY KEY,
                normalized_email VARCHAR(255) NOT NULL,
                customer_id INTEGER,
                marketing_category VARCHAR(32) NOT NULL,
                campaign_id INTEGER,
                outbox_id INTEGER,
                status VARCHAR(16) NOT NULL,
                provider_message_id VARCHAR(255),
                sent_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT marketing_allowance_ledger_email_category_unique UNIQUE (normalized_email, marketing_category)
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE marketing_allowance_ledger`);
  }
}
