import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the transactional email outbox.
 *
 * Rows are inserted by the order services inside the same transaction as the
 * order change they describe, so an order and its notifications commit or roll
 * back together. Delivery happens later, outside any order transaction, and
 * only ever moves a row through pending -> sending -> sent/failed.
 *
 * `event_key` is unique per logical event (one row per order event), which is
 * what makes repeated status requests harmless: the second insert is ignored.
 */
export class EmailOutbox1793200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE email_outbox (
                id SERIAL PRIMARY KEY,
                event_key VARCHAR(255) NOT NULL,
                event_type VARCHAR(64) NOT NULL,
                order_id INTEGER,
                recipient_email VARCHAR(255) NOT NULL DEFAULT '',
                recipient_kind VARCHAR(16) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                html_body TEXT NOT NULL,
                text_body TEXT NOT NULL,
                status VARCHAR(16) NOT NULL DEFAULT 'pending',
                attempts INTEGER NOT NULL DEFAULT 0,
                last_error VARCHAR(1000),
                next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                locked_at TIMESTAMP,
                sent_at TIMESTAMP,
                provider_message_id VARCHAR(255),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT email_outbox_event_key_unique UNIQUE (event_key),
                CONSTRAINT email_outbox_event_type_valid
                    CHECK (event_type IN ('order_placed', 'admin_new_order', 'order_status_changed')),
                CONSTRAINT email_outbox_recipient_kind_valid
                    CHECK (recipient_kind IN ('customer', 'admin')),
                CONSTRAINT email_outbox_status_valid
                    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
                CONSTRAINT email_outbox_attempts_non_negative CHECK (attempts >= 0),
                CONSTRAINT email_outbox_order_fkey
                    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
            )
        `);

    await queryRunner.query(`
            CREATE INDEX email_outbox_status_next_attempt_idx
                ON email_outbox (status, next_attempt_at, id)
        `);

    await queryRunner.query(`
            CREATE INDEX email_outbox_order_id_idx ON email_outbox (order_id, id)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS email_outbox_order_id_idx`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS email_outbox_status_next_attempt_idx`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS email_outbox`);
  }
}
