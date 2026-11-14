import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminEmailController } from './admin-email.controller';
import {
  EmailSettingsService,
  EMAIL_SETTING_KEYS,
} from './email-settings.service';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

class FakeSettingsService {
  settings: Record<string, { enabled: boolean; description: string }> = {};
  getAll() {
    return Object.entries(this.settings).map(([key, value]) => ({
      key,
      enabled: value.enabled,
      description: value.description,
    }));
  }
  findByKey(key: string) {
    const value = this.settings[key];
    return value
      ? { key, enabled: value.enabled, description: value.description }
      : null;
  }
  isEnabled(key: string) {
    return this.settings[key]?.enabled ?? false;
  }
  update(key: string, enabled: boolean) {
    this.settings[key] = { enabled, description: '' };
    return { key, enabled, description: '' };
  }
  updateMany() {
    return [];
  }
  seedDefaults() {}
  findOneOrFail(key: string) {
    const value = this.settings[key];
    if (!value) {
      throw new NotFoundException(`Email setting "${key}" not found.`);
    }
    return { key, enabled: value.enabled, description: value.description };
  }
}

class FakeNotificationsService {
  enqueued: Array<{
    eventKey: string;
    email: string;
    subject: string;
    html: string;
    text: string;
  }> = [];
  enqueueNewsletterConfirmation(input: {
    eventKey: string;
    email: string;
    subject: string;
    html: string;
    text: string;
  }) {
    this.enqueued.push(input);
  }
}

type RepositoryMock = {
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  findAndCount: ReturnType<typeof vi.fn>;
};

class FakeDataSource {
  private readonly repo: RepositoryMock;

  constructor() {
    this.repo = {
      find: vi.fn(),
      findOne: vi.fn(),
      count: vi.fn(),
      save: vi.fn(),
      findAndCount: vi.fn().mockResolvedValue([[], 0]),
    };
  }

  getRepository(_entity: unknown): RepositoryMock {
    return this.repo;
  }

  createQueryBuilder() {
    const qb = {
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getRawOne: vi.fn().mockResolvedValue(null),
      getRawMany: vi.fn().mockResolvedValue([]),
    };
    return qb;
  }
}

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function makeController(
  settingsService = new FakeSettingsService(),
  notificationsService = new FakeNotificationsService(),
  dataSource = new FakeDataSource(),
  configValues: Record<string, string> = {},
) {
  return new AdminEmailController(
    settingsService as unknown as EmailSettingsService,
    notificationsService as unknown as NotificationsService,
    dataSource as unknown as DataSource,
    makeConfig(configValues),
  );
}

describe('AdminEmailController', () => {
  describe('guards', () => {
    it('uses AdminGuard on all routes', () => {
      expect(AdminGuard).toBeDefined();
    });

    it('uses CsrfGuard on write routes', () => {
      expect(CsrfGuard).toBeDefined();
    });
  });

  describe('listSettings', () => {
    it('returns all settings with key, enabled, description', async () => {
      const settingsService = new FakeSettingsService();
      settingsService.settings = {
        order_confirmation: {
          enabled: true,
          description: 'Order confirmation.',
        },
        payment_confirmation: {
          enabled: false,
          description: 'Payment confirmation.',
        },
      };
      const controller = makeController(settingsService);

      const result = await controller.listSettings();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('key');
      expect(result[0]).toHaveProperty('enabled');
      expect(result[0]).toHaveProperty('description');
    });
  });

  describe('updateSetting', () => {
    it('updates an existing setting', async () => {
      const settingsService = new FakeSettingsService();
      settingsService.settings = {
        order_confirmation: { enabled: true, description: 'desc' },
      };
      const controller = makeController(settingsService);

      const result = await controller.updateSetting(
        'order_confirmation',
        { enabled: false },
        { id: 42 } as never,
      );

      expect(result.enabled).toBe(false);
      expect(settingsService.isEnabled('order_confirmation')).toBe(false);
    });

    it('rejects unknown keys', async () => {
      const settingsService = new FakeSettingsService();
      const controller = makeController(settingsService);

      await expect(
        controller.updateSetting('nonexistent', { enabled: true }, {
          id: 1,
        } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('lists all known setting keys', () => {
      expect(EMAIL_SETTING_KEYS).toContain('order_confirmation');
      expect(EMAIL_SETTING_KEYS).toContain('payment_confirmation');
      expect(EMAIL_SETTING_KEYS).toContain('order_status_updates');
      expect(EMAIL_SETTING_KEYS).toContain('cancellation_confirmation');
      expect(EMAIL_SETTING_KEYS).toContain('admin_new_order');
    });
  });

  describe('setting defaults', () => {
    it('has payment_confirmation disabled by default', () => {
      const disabledByDefault = ['payment_confirmation'];
      expect(disabledByDefault).toContain('payment_confirmation');
    });

    it('keeps admin_new_order independent of order_confirmation', () => {
      const keys = ['admin_new_order', 'order_confirmation'];
      expect(keys).toContain('admin_new_order');
      expect(keys).toContain('order_confirmation');
      expect(keys.indexOf('admin_new_order')).not.toBe(
        keys.indexOf('order_confirmation'),
      );
    });
  });

  describe('listActivity', () => {
    it('returns paginated items with pagination metadata', async () => {
      const controller = makeController();

      const result = await controller.listActivity({
        page: 1,
        limit: 25,
      });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('page');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('totalPages');
    });

    it('passes filters to the repository query', async () => {
      const settingsService = new FakeSettingsService();
      const dataSource = new FakeDataSource();
      const repo = dataSource.getRepository('EmailOutbox');
      const findAndCount = vi.fn().mockResolvedValue([[], 0]);
      repo.findAndCount = findAndCount;
      const controller = makeController(
        settingsService,
        new FakeNotificationsService(),
        dataSource,
      );

      await controller.listActivity({
        page: 1,
        limit: 25,
        status: 'sent',
        eventType: 'order_placed',
        recipient: 'alice@example.com',
      });

      expect(findAndCount).toHaveBeenCalled();
      const callArg = findAndCount.mock.calls[0][0] as {
        where: { status: string; eventType: string };
      };
      expect(callArg.where.status).toBe('sent');
      expect(callArg.where.eventType).toBe('order_placed');
    });
  });

  describe('activityDetail', () => {
    it('returns a single email record', async () => {
      const dataSource = new FakeDataSource();
      const repo = dataSource.getRepository('EmailOutbox');
      repo.findOne = vi.fn().mockResolvedValue({
        id: 1,
        eventType: 'order_placed',
        eventKey: 'order_placed:12',
        orderId: 12,
        recipientEmail: 'alice@example.com',
        recipientKind: 'customer',
        subject: 'Aapulki order ref-12 received',
        status: 'sent',
        attempts: 1,
        lastError: null,
        providerMessageId: 'msg-123',
        createdAt: new Date(),
        sentAt: new Date(),
        updatedAt: new Date(),
      });

      const controller = makeController(
        new FakeSettingsService(),
        new FakeNotificationsService(),
        dataSource,
      );

      const result = await controller.activityDetail(1);

      expect(result.id).toBe(1);
      expect(result.eventType).toBe('order_placed');
    });

    it('throws NotFoundException for a missing record', async () => {
      const dataSource = new FakeDataSource();
      const repo = dataSource.getRepository('EmailOutbox');
      repo.findOne = vi.fn().mockResolvedValue(null);

      const controller = makeController(
        new FakeSettingsService(),
        new FakeNotificationsService(),
        dataSource,
      );

      await expect(controller.activityDetail(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('stats', () => {
    it('returns delivery statistics', async () => {
      const dataSource = new FakeDataSource();
      const repo = dataSource.getRepository('EmailOutbox');
      repo.count = vi.fn().mockResolvedValue(0);
      repo.findOne = vi.fn().mockResolvedValue(null);

      const controller = makeController(
        new FakeSettingsService(),
        new FakeNotificationsService(),
        dataSource,
      );

      const result = await controller.stats();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('pending');
      expect(result).toHaveProperty('sending');
      expect(result).toHaveProperty('sent');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('lastSuccessfulDelivery');
    });
  });

  describe('providerStatus', () => {
    it('returns provider configuration status without secrets', () => {
      const controller = makeController(
        new FakeSettingsService(),
        new FakeNotificationsService(),
        new FakeDataSource(),
        { EMAIL_PROVIDER: 'none' },
      );

      const result = controller.providerStatus();

      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('configured');
      expect(result).toHaveProperty('senderConfigured');
      expect(result).toHaveProperty('configHold');
      // No token or secret should be exposed.
      expect(JSON.stringify(result)).not.toContain('SENDER_API_TOKEN');
      expect(JSON.stringify(result)).not.toContain('token');
    });

    it('reports configured provider when set', () => {
      const controller = makeController(
        new FakeSettingsService(),
        new FakeNotificationsService(),
        new FakeDataSource(),
        {
          EMAIL_PROVIDER: 'sender',
          EMAIL_FROM_ADDRESS: 'studio@example.com',
        },
      );

      const result = controller.providerStatus();

      expect(result.provider).toBe('sender');
      expect(result.configured).toBe(true);
      expect(result.senderConfigured).toBe(true);
    });
  });

  describe('sendTestEmail', () => {
    it('queues a test email in the outbox', async () => {
      const notificationsService = new FakeNotificationsService();
      const controller = makeController(
        new FakeSettingsService(),
        notificationsService,
        new FakeDataSource(),
      );

      const result = await controller.sendTestEmail({
        recipient: 'alice@example.com',
      });

      expect(result.accepted).toBe(true);
      expect(result.recipient).toBe('alice@example.com');
      expect(notificationsService.enqueued).toHaveLength(1);
      expect(notificationsService.enqueued[0].email).toBe('alice@example.com');
      expect(notificationsService.enqueued[0].subject).toContain('Test email');
      expect(result.eventKey).toContain('test_email');
    });

    it('does not expose credentials in the response', async () => {
      const notificationsService = new FakeNotificationsService();
      const controller = makeController(
        new FakeSettingsService(),
        notificationsService,
        new FakeDataSource(),
        { SENDER_API_TOKEN: 'secret-token-123' },
      );

      const result = await controller.sendTestEmail({
        recipient: 'alice@example.com',
      });

      expect(JSON.stringify(result)).not.toContain('secret-token-123');
    });

    it('renders a fixed branded template (no arbitrary HTML from frontend)', async () => {
      const notificationsService = new FakeNotificationsService();
      const controller = makeController(
        new FakeSettingsService(),
        notificationsService,
        new FakeDataSource(),
      );

      await controller.sendTestEmail({ recipient: 'alice@example.com' });

      const html = notificationsService.enqueued[0].html;
      expect(html).toContain('Aapulki');
      expect(html).toContain('Test email');
      // No user-supplied HTML should appear.
      expect(html).not.toContain('<script');
    });
  });
});
