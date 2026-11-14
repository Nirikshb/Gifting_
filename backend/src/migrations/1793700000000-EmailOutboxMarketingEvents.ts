import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `promotional` and `abandoned_cart` to the email outbox event type
 * check constraint so marketing emails can be queued through the same outbox.
 *
 * Existing rows are unaffected.
 */
export class EmailOutboxMarketingEvents1793700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE email_outbox
        DROP CONSTRAINT email_outbox_event_type_valid
    `);
    await queryRunner.query(`
      ALTER TABLE email_outbox
        ADD CONSTRAINT email_outbox_event_type_valid
        CHECK (event_type IN (
          'order_placed',
          'admin_new_order',
          'order_status_changed',
          'newsletter_confirmation',
          'payment_confirmed',
          'promotional',
          'abandoned_cart'
        ))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE email_outbox
        DROP CONSTRAINT email_outbox_event_type_valid
    `);
    await queryRunner.query(`
      ALTER TABLE email_outbox
        ADD CONSTRAINT email_outbox_event_type_valid
        CHECK (event_type IN (
          'order_placed',
          'admin_new_order',
          'order_status_changed',
          'newsletter_confirmation',
          'payment_confirmed'
        ))
    `);
  }
}
