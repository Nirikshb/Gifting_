import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Widens `email_outbox.recipient_kind` to allow `subscriber`.
 *
 * The entity (and `enqueueNewsletterConfirmation` / campaign promotional
 * enqueues) already treat `subscriber` as valid, but the original migration
 * only allowed `customer` and `admin`. Inserting a subscriber-kind row
 * (newsletter confirmation, campaign send) therefore violated the check
 * constraint on any fully migrated database. Widening the constraint matches
 * the entity's declared check; no data is changed.
 */
export class EmailOutboxSubscriberKind1793800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE email_outbox
        DROP CONSTRAINT email_outbox_recipient_kind_valid
    `);
    await queryRunner.query(`
      ALTER TABLE email_outbox
        ADD CONSTRAINT email_outbox_recipient_kind_valid
          CHECK (recipient_kind IN ('customer', 'admin', 'subscriber'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE email_outbox
        DROP CONSTRAINT email_outbox_recipient_kind_valid
    `);
    await queryRunner.query(`
      ALTER TABLE email_outbox
        ADD CONSTRAINT email_outbox_recipient_kind_valid
          CHECK (recipient_kind IN ('customer', 'admin'))
    `);
  }
}
