import { MigrationInterface, QueryRunner } from 'typeorm';

export class NullableEmailOutboxOrderId1793900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE email_outbox
                ALTER COLUMN order_id DROP NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE email_outbox
                ALTER COLUMN order_id SET NOT NULL
        `);
  }
}
