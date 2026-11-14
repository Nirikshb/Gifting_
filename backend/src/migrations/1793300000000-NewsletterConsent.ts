import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the double opt-in / consent columns to the newsletter subscriptions.
 *
 * Existing rows keep their email but gain the `pending_confirmation` status:
 * without a verifiable consent they must reconfirm, so no consent timestamp is
 * backfilled and nothing pretends an existing address opted in.
 */
export class NewsletterConsent1793300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE newsletter_subscriptions ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'pending_confirmation'
        `);
    await queryRunner.query(`
            ALTER TABLE newsletter_subscriptions ADD COLUMN consent_at TIMESTAMP
        `);
    await queryRunner.query(`
            ALTER TABLE newsletter_subscriptions ADD COLUMN consent_source VARCHAR(64)
        `);
    await queryRunner.query(`
            ALTER TABLE newsletter_subscriptions ADD COLUMN consent_text VARCHAR(255)
        `);
    await queryRunner.query(`
            ALTER TABLE newsletter_subscriptions ADD COLUMN confirmed_at TIMESTAMP
        `);
    await queryRunner.query(`
            ALTER TABLE newsletter_subscriptions ADD COLUMN confirmation_token_hash VARCHAR(64)
        `);
    await queryRunner.query(`
            ALTER TABLE newsletter_subscriptions ADD COLUMN confirmation_token_expires_at TIMESTAMP
        `);
    await queryRunner.query(`
            ALTER TABLE newsletter_subscriptions ADD COLUMN confirmation_sent_at TIMESTAMP
        `);
    await queryRunner.query(`
            ALTER TABLE newsletter_subscriptions ADD COLUMN unsubscribe_token_hash VARCHAR(64)
        `);
    await queryRunner.query(`
            ALTER TABLE newsletter_subscriptions ADD COLUMN unsubscribed_at TIMESTAMP
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE newsletter_subscriptions DROP COLUMN unsubscribed_at`,
    );
    await queryRunner.query(
      `ALTER TABLE newsletter_subscriptions DROP COLUMN unsubscribe_token_hash`,
    );
    await queryRunner.query(
      `ALTER TABLE newsletter_subscriptions DROP COLUMN confirmation_sent_at`,
    );
    await queryRunner.query(
      `ALTER TABLE newsletter_subscriptions DROP COLUMN confirmation_token_expires_at`,
    );
    await queryRunner.query(
      `ALTER TABLE newsletter_subscriptions DROP COLUMN confirmation_token_hash`,
    );
    await queryRunner.query(
      `ALTER TABLE newsletter_subscriptions DROP COLUMN consent_text`,
    );
    await queryRunner.query(
      `ALTER TABLE newsletter_subscriptions DROP COLUMN consent_source`,
    );
    await queryRunner.query(
      `ALTER TABLE newsletter_subscriptions DROP COLUMN consent_at`,
    );
    await queryRunner.query(
      `ALTER TABLE newsletter_subscriptions DROP COLUMN confirmed_at`,
    );
    await queryRunner.query(
      `ALTER TABLE newsletter_subscriptions DROP COLUMN status`,
    );
  }
}
