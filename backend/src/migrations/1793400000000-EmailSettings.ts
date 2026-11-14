import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `email_settings` table: one row per independently controllable
 * transactional email category. Rows are inserted with safe defaults;
 * `payment_confirmation` defaults to disabled because no verified payment
 * event source exists yet.
 */
export class EmailSettings1793400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE email_settings (
                id SERIAL PRIMARY KEY,
                key VARCHAR(64) NOT NULL UNIQUE,
                enabled BOOLEAN NOT NULL DEFAULT TRUE,
                description TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

    await queryRunner.query(`
            INSERT INTO email_settings (key, enabled, description) VALUES
                ('order_confirmation', true, 'Order confirmation email sent to the customer when an order is placed.'),
                ('payment_confirmation', false, 'Payment confirmation email sent to the customer once a verified payment is recorded. Disabled until a verified payment event source is wired up.'),
                ('order_status_updates', true, 'Order status change emails sent to the customer (confirmed, processing, shipped, delivered).'),
                ('cancellation_confirmation', true, 'Order cancellation email sent to the customer when an order is cancelled. Controlled independently of other status updates.'),
                ('admin_new_order', true, 'New order notification email sent to the studio. Independent of the customer order-confirmation switch.')
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE email_settings`);
  }
}
