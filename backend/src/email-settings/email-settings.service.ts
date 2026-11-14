import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailSetting } from './entities/email-setting.entity';

/**
 * Category keys that the admin can toggle independently. Each maps to one or
 * more outbox `event_type` values checked at dispatch time.
 */
export const EMAIL_SETTING_KEYS = [
  'order_confirmation',
  'payment_confirmation',
  'order_status_updates',
  'cancellation_confirmation',
  'admin_new_order',
] as const;

export type EmailSettingKey = (typeof EMAIL_SETTING_KEYS)[number];

/** Default descriptions for each category, used when seeding the table. */
const DEFAULT_DESCRIPTIONS: Record<EmailSettingKey, string> = {
  order_confirmation:
    'Order confirmation email sent to the customer when an order is placed.',
  payment_confirmation:
    'Payment confirmation email sent to the customer once a verified payment is recorded. Disabled until a verified payment event source is wired up.',
  order_status_updates:
    'Order status change emails sent to the customer (confirmed, processing, shipped, delivered).',
  cancellation_confirmation:
    'Order cancellation email sent to the customer when an order is cancelled. Controlled independently of other status updates.',
  admin_new_order:
    'New order notification email sent to the studio. Independent of the customer order-confirmation switch.',
};

/** Categories that are disabled by default because their event source is not yet connected. */
const DISABLED_BY_DEFAULT: readonly EmailSettingKey[] = [
  'payment_confirmation',
];

@Injectable()
export class EmailSettingsService {
  constructor(
    @InjectRepository(EmailSetting)
    private readonly settingsRepository: Repository<EmailSetting>,
  ) {}

  /** Returns every setting, ordered by key. */
  async getAll(): Promise<EmailSetting[]> {
    return this.settingsRepository.find({
      order: { key: 'ASC' },
    });
  }

  /** Returns a single setting by key, or null when it does not exist. */
  async findByKey(key: EmailSettingKey): Promise<EmailSetting | null> {
    return this.settingsRepository.findOne({ where: { key } });
  }

  /** Returns whether a category is currently enabled. Unknown keys default to off. */
  async isEnabled(key: EmailSettingKey): Promise<boolean> {
    const setting = await this.findByKey(key);
    return setting?.enabled ?? false;
  }

  /**
   * Updates one category. Creates the row with its default description when it
   * does not yet exist (for example after a migration adds a new key).
   */
  async update(key: EmailSettingKey, enabled: boolean): Promise<EmailSetting> {
    let setting = await this.findByKey(key);

    if (!setting) {
      setting = this.settingsRepository.create({
        key,
        enabled,
        description: DEFAULT_DESCRIPTIONS[key],
      });
    } else {
      setting.enabled = enabled;
    }

    return this.settingsRepository.save(setting);
  }

  /** Bulk-updates multiple categories in a single pass. */
  async updateMany(
    updates: Array<{ key: EmailSettingKey; enabled: boolean }>,
  ): Promise<EmailSetting[]> {
    return Promise.all(
      updates.map(({ key, enabled }) => this.update(key, enabled)),
    );
  }

  /**
   * Seeds the table with safe defaults when it is empty. Idempotent: existing
   * rows are never overwritten, so an admin's changes survive restarts and
   * re-migrations.
   */
  async seedDefaults(): Promise<void> {
    const existing = await this.settingsRepository.find({
      select: { key: true },
    });
    const existingKeys = new Set(existing.map((row) => row.key));

    const missing = EMAIL_SETTING_KEYS.filter((key) => !existingKeys.has(key));

    if (missing.length === 0) {
      return;
    }

    await this.settingsRepository.save(
      missing.map((key) =>
        this.settingsRepository.create({
          key,
          enabled: !DISABLED_BY_DEFAULT.includes(key),
          description: DEFAULT_DESCRIPTIONS[key],
        }),
      ),
    );
  }

  async findOneOrFail(key: EmailSettingKey): Promise<EmailSetting> {
    const setting = await this.findByKey(key);
    if (!setting) {
      throw new NotFoundException(`Email setting "${key}" not found.`);
    }
    return setting;
  }
}
