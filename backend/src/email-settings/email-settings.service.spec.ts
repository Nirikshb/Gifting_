import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { EmailSetting } from './entities/email-setting.entity';
import {
  EmailSettingsService,
  EMAIL_SETTING_KEYS,
} from './email-settings.service';

describe('EmailSettingsService', () => {
  let service: EmailSettingsService;
  const settingsRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn().mockImplementation((input: unknown) => input),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    settingsRepository.find.mockReset();
    settingsRepository.findOne.mockReset();
    settingsRepository.save.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailSettingsService,
        {
          provide: getRepositoryToken(EmailSetting),
          useValue: settingsRepository,
        },
      ],
    }).compile();

    service = module.get<EmailSettingsService>(EmailSettingsService);
  });

  describe('getAll', () => {
    it('returns settings ordered by key', async () => {
      const rows = [
        { key: 'order_confirmation', enabled: true, description: 'd1' },
        { key: 'admin_new_order', enabled: true, description: 'd2' },
      ];
      settingsRepository.find.mockResolvedValue(rows);

      const result = await service.getAll();

      expect(result).toEqual(rows);
      expect(settingsRepository.find).toHaveBeenCalledWith({
        order: { key: 'ASC' },
      });
    });
  });

  describe('findByKey', () => {
    it('returns a setting by key', async () => {
      const row = { key: 'order_confirmation', enabled: true };
      settingsRepository.findOne.mockResolvedValue(row);

      const result = await service.findByKey('order_confirmation');

      expect(result).toEqual(row);
      expect(settingsRepository.findOne).toHaveBeenCalledWith({
        where: { key: 'order_confirmation' },
      });
    });

    it('returns null for an unknown key', async () => {
      settingsRepository.findOne.mockResolvedValue(null);

      const result = await service.findByKey('order_confirmation');

      expect(result).toBeNull();
    });
  });

  describe('isEnabled', () => {
    it('returns true when the setting exists and is enabled', async () => {
      settingsRepository.findOne.mockResolvedValue({
        key: 'order_confirmation',
        enabled: true,
      });

      expect(await service.isEnabled('order_confirmation')).toBe(true);
    });

    it('returns false when the setting exists but is disabled', async () => {
      settingsRepository.findOne.mockResolvedValue({
        key: 'payment_confirmation',
        enabled: false,
      });

      expect(await service.isEnabled('payment_confirmation')).toBe(false);
    });

    it('returns false for an unknown key (fail closed)', async () => {
      settingsRepository.findOne.mockResolvedValue(null);

      expect(await service.isEnabled('order_confirmation')).toBe(false);
    });
  });

  describe('update', () => {
    it('updates an existing setting', async () => {
      const existing = {
        key: 'order_confirmation',
        enabled: true,
        description: 'desc',
      };
      const updated = { ...existing, enabled: false };
      settingsRepository.findOne.mockResolvedValue(existing);
      settingsRepository.save.mockResolvedValue(updated);

      const result = await service.update('order_confirmation', false);

      expect(result.enabled).toBe(false);
      expect(settingsRepository.save).toHaveBeenCalled();
    });

    it('creates a new setting when it does not exist', async () => {
      settingsRepository.findOne.mockResolvedValue(null);
      settingsRepository.save.mockImplementation((input: unknown) => input);

      const result = await service.update('cancellation_confirmation', true);

      expect(result.key).toBe('cancellation_confirmation');
      expect(result.enabled).toBe(true);
      expect(settingsRepository.save).toHaveBeenCalled();
    });
  });

  describe('seedDefaults', () => {
    it('inserts defaults when the table is empty', async () => {
      settingsRepository.find.mockResolvedValue([]);
      settingsRepository.save.mockResolvedValue([]);

      await service.seedDefaults();

      expect(settingsRepository.save).toHaveBeenCalled();
      const saved = settingsRepository.save.mock.calls[0][0] as unknown[];
      const keys = saved.map((row) => (row as { key: string }).key);
      expect(keys).toEqual(EMAIL_SETTING_KEYS);
    });

    it('does not overwrite existing rows', async () => {
      const existing = {
        key: 'order_confirmation',
        enabled: false,
        description: 'custom',
      };
      settingsRepository.find.mockResolvedValue([existing as EmailSetting]);
      settingsRepository.save.mockResolvedValue([]);

      await service.seedDefaults();

      const saved = settingsRepository.save.mock.calls[0][0] as unknown[];
      const savedKeys = saved.map((row) => (row as { key: string }).key);
      // Existing key must not be in the saved set.
      expect(savedKeys).not.toContain('order_confirmation');
      // Missing keys should still be seeded.
      expect(savedKeys.length).toBeGreaterThan(0);
    });
  });

  describe('findOneOrFail', () => {
    it('throws NotFoundException for a missing key', async () => {
      settingsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneOrFail('order_confirmation')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
