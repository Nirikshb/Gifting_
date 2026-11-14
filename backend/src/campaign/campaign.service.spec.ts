import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import { Campaign } from './entities/campaign.entity';
import { CampaignService } from './campaign.service';
import { AudienceService } from './audience.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Minimal notifications stub: the unit specs never exercise the send flow
 * (that requires a database transaction and is covered by the integration
 * suite), they only need a constructible service.
 */
class FakeNotificationsService {
  readonly scheduled: unknown[] = [];
  readonly promotionalDrafts: Array<Record<string, string>> = [];

  scheduleDispatch(): void {
    this.scheduled.push('dispatch');
  }

  dispatchPending(): Promise<void> {
    this.scheduled.push('dispatchPending');
    return Promise.resolve();
  }

  enqueuePromotional(_manager: unknown, draft: Record<string, string>) {
    void _manager;
    this.promotionalDrafts.push(draft);
    return Promise.resolve();
  }
}

function makeNotifications() {
  return new FakeNotificationsService() as unknown as NotificationsService;
}

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

class FakeRepository {
  rows: Campaign[] = [];
  nextId = 1;

  findOne = vi
    .fn()
    .mockImplementation((opts: { where: Record<string, unknown> }) => {
      const where = opts?.where ?? {};
      for (const row of this.rows) {
        let ok = true;
        for (const [key, value] of Object.entries(where)) {
          if ((row as unknown as Record<string, unknown>)[key] !== value) {
            ok = false;
            break;
          }
        }
        if (ok) {
          return Promise.resolve(row);
        }
      }
      return Promise.resolve(null);
    });

  findAndCount = vi
    .fn()
    .mockImplementation(
      (opts: {
        where?: Record<string, unknown>;
        order?: Record<string, string>;
        skip?: number;
        take?: number;
      }) => {
        let rows = [...this.rows];
        if (opts?.where) {
          for (const [key, value] of Object.entries(opts.where)) {
            rows = rows.filter(
              (row) =>
                (row as unknown as Record<string, unknown>)[key] === value,
            );
          }
        }
        const total = rows.length;
        const skip = opts?.skip ?? 0;
        const take = opts?.take ?? 25;
        const items = rows.slice(skip, skip + take);
        return Promise.resolve([items, total]);
      },
    );

  save = vi.fn().mockImplementation((input: unknown) => {
    const rowInput = input as Campaign;
    if (!rowInput.id) {
      const row: Campaign = { ...rowInput, id: this.nextId++ };
      this.rows.push(row);
      return Promise.resolve(row);
    }
    const idx = this.rows.findIndex((r) => r.id === rowInput.id);
    if (idx >= 0) {
      this.rows[idx] = { ...this.rows[idx], ...rowInput };
      return Promise.resolve(this.rows[idx]);
    }
    return Promise.resolve(rowInput);
  });

  create = vi.fn().mockImplementation((input: unknown) => input);

  update = vi
    .fn()
    .mockImplementation(
      (_where: Record<string, unknown>, values: Record<string, unknown>) => {
        let affected = 0;
        for (const row of this.rows) {
          let ok = true;
          for (const [key, value] of Object.entries(_where)) {
            if ((row as unknown as Record<string, unknown>)[key] !== value) {
              ok = false;
              break;
            }
          }
          if (!ok) continue;
          for (const [key, value] of Object.entries(values)) {
            (row as unknown as Record<string, unknown>)[key] = value;
          }
          affected++;
        }
        return Promise.resolve({ affected, raw: [] });
      },
    );
}

class FakeDataSource {
  repo = new FakeRepository();

  async transaction<T>(run: (manager: FakeManager) => Promise<T>): Promise<T> {
    const manager = new FakeManager(this.repo);
    return run(manager);
  }

  getRepository(_entity: unknown) {
    void _entity;
    return this.repo;
  }
}

class FakeManager {
  constructor(private readonly repo: FakeRepository) {}

  getRepository(_entity: unknown) {
    void _entity;
    return this.repo;
  }
}

function makeService(dataSource?: DataSource) {
  const ds = dataSource ?? (new FakeDataSource() as unknown as DataSource);
  const audienceService = new AudienceService(ds);
  const service = new CampaignService(ds, audienceService, makeNotifications());
  return { service, dataSource: ds };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CampaignService', () => {
  describe('create', () => {
    it('creates a draft campaign', async () => {
      const { service } = makeService();

      const campaign = await service.create({
        name: 'Winter Sale',
        subject: 'Winter Sale is here',
        heading: 'Big discounts',
        content: 'Enjoy 20% off everything.',
      });

      expect(campaign.id).toBe(1);
      expect(campaign.name).toBe('Winter Sale');
      expect(campaign.status).toBe('draft');
      expect(campaign.scheduledAt).toBeNull();
      expect(campaign.sentAt).toBeNull();
    });
  });

  describe('list', () => {
    it('returns paginated campaigns', async () => {
      const { service } = makeService();

      await service.create({
        name: 'A',
        subject: 's',
        heading: 'h',
        content: 'c',
      });
      await service.create({
        name: 'B',
        subject: 's',
        heading: 'h',
        content: 'c',
      });

      const result = await service.list({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('filters by status', async () => {
      const { service } = makeService();

      await service.create({
        name: 'A',
        subject: 's',
        heading: 'h',
        content: 'c',
      });
      const scheduled = await service.create({
        name: 'B',
        subject: 's',
        heading: 'h',
        content: 'c',
      });
      await service.schedule(scheduled.id, {
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      });

      const result = await service.list({ status: 'scheduled' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('scheduled');
    });
  });

  describe('findOne', () => {
    it('returns a campaign by id', async () => {
      const { service } = makeService();

      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });

      const found = await service.findOne(created.id);
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('X');
    });

    it('returns null for an unknown id', async () => {
      const { service } = makeService();

      const found = await service.findOne(99999);
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('updates a draft campaign', async () => {
      const { service } = makeService();

      const created = await service.create({
        name: 'Old',
        subject: 's',
        heading: 'h',
        content: 'c',
      });

      const updated = await service.update(created.id, {
        name: 'New Name',
        content: 'new body',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.content).toBe('new body');
      expect(updated.status).toBe('draft');
    });

    it('rejects updating a non-draft campaign', async () => {
      const { service } = makeService();

      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });
      await service.schedule(created.id, {
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      });

      await expect(
        service.update(created.id, { name: 'Nope' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws not found for unknown id', async () => {
      const { service } = makeService();

      await expect(service.update(99999, { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('schedule', () => {
    it('schedules a draft for a future date', async () => {
      const { service } = makeService();

      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });

      const future = new Date(Date.now() + 86400000).toISOString();
      const scheduled = await service.schedule(created.id, {
        scheduledAt: future,
      });

      expect(scheduled.status).toBe('scheduled');
      expect(scheduled.scheduledAt).toBeInstanceOf(Date);
    });

    it('rejects scheduling a non-draft campaign', async () => {
      const { service } = makeService();

      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });
      await service.cancel(created.id);

      await expect(
        service.schedule(created.id, {
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a past date', async () => {
      const { service } = makeService();

      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });

      await expect(
        service.schedule(created.id, {
          scheduledAt: new Date(Date.now() - 86400000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws not found for unknown id', async () => {
      const { service } = makeService();

      await expect(
        service.schedule(99999, { scheduledAt: new Date().toISOString() }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('cancels a draft campaign', async () => {
      const { service } = makeService();

      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });

      const cancelled = await service.cancel(created.id);
      expect(cancelled.status).toBe('cancelled');
    });

    it('cancels a scheduled campaign', async () => {
      const { service } = makeService();

      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });
      await service.schedule(created.id, {
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      });

      const cancelled = await service.cancel(created.id);
      expect(cancelled.status).toBe('cancelled');
    });

    it('rejects cancelling an already cancelled campaign', async () => {
      const { service } = makeService();

      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });
      await service.cancel(created.id);

      await expect(service.cancel(created.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws not found for unknown id', async () => {
      const { service } = makeService();

      await expect(service.cancel(99999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('isValidTransition', () => {
    const audienceService = new AudienceService(
      new FakeDataSource() as unknown as DataSource,
    );
    const service = new CampaignService(
      new FakeDataSource() as unknown as DataSource,
      audienceService,
      makeNotifications(),
    );

    it('allows draft to scheduled', () => {
      expect(service.isValidTransition('draft', 'scheduled')).toBe(true);
    });

    it('allows draft to sending', () => {
      expect(service.isValidTransition('draft', 'sending')).toBe(true);
    });

    it('allows sending to sent and failed', () => {
      expect(service.isValidTransition('sending', 'sent')).toBe(true);
      expect(service.isValidTransition('sending', 'failed')).toBe(true);
    });

    it('treats scheduled to failed as not a normal transition', () => {
      expect(service.isValidTransition('scheduled', 'failed')).toBe(false);
    });

    it('allows draft to cancelled', () => {
      expect(service.isValidTransition('draft', 'cancelled')).toBe(true);
    });

    it('allows scheduled to cancelled', () => {
      expect(service.isValidTransition('scheduled', 'cancelled')).toBe(true);
    });

    it('allows scheduled to sending', () => {
      expect(service.isValidTransition('scheduled', 'sending')).toBe(true);
    });

    it('rejects scheduled to draft', () => {
      expect(service.isValidTransition('scheduled', 'draft')).toBe(false);
    });

    it('rejects sent to anything', () => {
      expect(service.isValidTransition('sent', 'scheduled')).toBe(false);
    });
  });
});
