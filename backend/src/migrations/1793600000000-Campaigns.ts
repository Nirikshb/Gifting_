import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `campaigns` table: one row per marketing campaign definition.
 *
 * Campaign content is stored separately from the code-controlled email layout
 * and is editable without changing the codebase. Arbitrary executable HTML is
 * not stored here: content is a plain-text body rendered inside the branded
 * template at send time.
 *
 * Also adds a foreign key from `marketing_allowance_ledger.campaign_id` to
 * `campaigns.id`. Existing ledger rows have `campaign_id = NULL`, so adding
 * the constraint is safe and preserves all existing records.
 */
export class Campaigns1793600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE campaigns (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                heading VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                image_url VARCHAR(500),
                cta_label VARCHAR(255),
                cta_url VARCHAR(500),
                audience_definition JSONB,
                status VARCHAR(16) NOT NULL DEFAULT 'draft',
                scheduled_at TIMESTAMP,
                sent_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

    await queryRunner.query(`
            CREATE INDEX campaigns_status_scheduled_at_id_idx
                ON campaigns (status, scheduled_at, id)
        `);

    await queryRunner.query(`
            ALTER TABLE marketing_allowance_ledger
                ADD CONSTRAINT marketing_allowance_ledger_campaign_id_fkey
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE marketing_allowance_ledger
                DROP CONSTRAINT marketing_allowance_ledger_campaign_id_fkey
        `);

    await queryRunner.query(`DROP TABLE campaigns`);
  }
}
