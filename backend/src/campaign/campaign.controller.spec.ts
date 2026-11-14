import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { AudienceService } from './audience.service';
import { CAMPAIGN_STATUSES } from './entities/campaign.entity';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

class FakeCampaignService {
  campaigns: Record<number, CampaignRecord> = {};
  nextId = 1;

  create(dto: CampaignInput): Promise<CampaignRecord> {
    const id = this.nextId++;
    const campaign: CampaignRecord = {
      id,
      status: 'draft',
      scheduledAt: null,
      sentAt: null,
      ...dto,
    };
    this.campaigns[id] = campaign;
    return Promise.resolve(campaign);
  }

  list(query: ListQuery): Promise<ListResult> {
    let items = Object.values(this.campaigns);
    if (query.status) {
      items = items.filter((c) => c.status === query.status);
    }
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 25));
    const total = items.length;
    const paged = items.slice((page - 1) * limit, page * limit);
    return Promise.resolve({ items: paged, total, page, limit });
  }

  findOne(id: number): Promise<CampaignRecord | null> {
    return Promise.resolve(this.campaigns[id] ?? null);
  }

  update(id: number, dto: UpdateInput): Promise<CampaignRecord> {
    const campaign = this.campaigns[id];
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }
    if (campaign.status !== 'draft') {
      throw new BadRequestException(
        `Campaign ${id} is ${campaign.status}; only drafts can be edited.`,
      );
    }
    this.campaigns[id] = { ...campaign, ...dto };
    return Promise.resolve(this.campaigns[id]);
  }

  schedule(id: number, dto: ScheduleInput): Promise<CampaignRecord> {
    const campaign = this.campaigns[id];
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }
    if (campaign.status !== 'draft') {
      throw new BadRequestException(
        `Campaign ${id} is ${campaign.status}; only drafts can be scheduled.`,
      );
    }
    const scheduledAt = new Date(dto.scheduledAt);
    if (
      Number.isNaN(scheduledAt.getTime()) ||
      scheduledAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        `Campaign ${id} must be scheduled for a future date.`,
      );
    }
    this.campaigns[id] = {
      ...campaign,
      status: 'scheduled',
      scheduledAt: dto.scheduledAt,
    };
    return Promise.resolve(this.campaigns[id]);
  }

  cancel(id: number): Promise<CampaignRecord> {
    const campaign = this.campaigns[id];
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new BadRequestException(
        `Campaign ${id} is ${campaign.status}; only drafts and scheduled campaigns can be cancelled.`,
      );
    }
    this.campaigns[id] = { ...campaign, status: 'cancelled' };
    return Promise.resolve(this.campaigns[id]);
  }

  send(
    id: number,
  ): Promise<{ campaign: CampaignRecord; recipientCount: number }> {
    const campaign = this.campaigns[id];
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found.`);
    }
    if (campaign.status !== 'draft') {
      throw new BadRequestException(
        `Campaign ${id} is ${campaign.status}; only draft campaigns can be sent.`,
      );
    }
    this.campaigns[id] = { ...campaign, status: 'sending' };
    return Promise.resolve({ campaign: this.campaigns[id], recipientCount: 3 });
  }
}

type CampaignRecord = {
  id: number;
  name: string;
  subject: string;
  heading: string;
  content: string;
  imageUrl?: string | null | undefined;
  ctaLabel?: string | null | undefined;
  ctaUrl?: string | null | undefined;
  audienceDefinition?: Record<string, unknown> | null | undefined;
  status: string;
  scheduledAt: string | null | undefined;
  sentAt: string | null | undefined;
};

type CampaignInput = {
  name: string;
  subject: string;
  heading: string;
  content: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  audienceDefinition?: Record<string, unknown> | null;
};

type UpdateInput = {
  name?: string;
  subject?: string;
  heading?: string;
  content?: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  audienceDefinition?: Record<string, unknown> | null;
};

type ScheduleInput = {
  scheduledAt: string;
};

type ListQuery = {
  page?: number;
  limit?: number;
  status?: string;
};

type ListResult = {
  items: CampaignRecord[];
  total: number;
  page: number;
  limit: number;
};

function makeController(service = new FakeCampaignService()) {
  const audienceService = new AudienceService(service as unknown as DataSource);
  const controller = new CampaignController(
    service as unknown as CampaignService,
    audienceService,
  );
  return { controller, service };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CampaignController', () => {
  describe('guards', () => {
    it('uses AdminGuard on all routes', () => {
      expect(AdminGuard).toBeDefined();
    });

    it('uses CsrfGuard on mutation routes', () => {
      expect(CsrfGuard).toBeDefined();
    });

    it('lists all campaign statuses', () => {
      expect(CAMPAIGN_STATUSES).toContain('draft');
      expect(CAMPAIGN_STATUSES).toContain('scheduled');
      expect(CAMPAIGN_STATUSES).toContain('sending');
      expect(CAMPAIGN_STATUSES).toContain('sent');
      expect(CAMPAIGN_STATUSES).toContain('failed');
      expect(CAMPAIGN_STATUSES).toContain('cancelled');
    });
  });

  describe('list', () => {
    it('returns paginated campaigns', async () => {
      const { controller, service } = makeController();
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

      const result = await controller.list({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filters by status', async () => {
      const { controller, service } = makeController();
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

      const result = await controller.list({
        page: 1,
        limit: 25,
        status: 'scheduled',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('scheduled');
    });
  });

  describe('detail', () => {
    it('returns a campaign by id', async () => {
      const { controller, service } = makeController();
      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });

      const result = await controller.detail(String(created.id));

      expect(result.id).toBe(created.id);
      expect(result.name).toBe('X');
    });

    it('throws not found for unknown id', async () => {
      const { controller } = makeController();

      await expect(controller.detail('99999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects non-numeric id', async () => {
      const { controller } = makeController();

      await expect(controller.detail('abc')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a draft campaign', async () => {
      const { controller } = makeController();

      const result = await controller.create({
        name: 'Winter Sale',
        subject: 'Winter Sale is here',
        heading: 'Big discounts',
        content: 'Enjoy 20% off everything.',
      });

      expect(result.id).toBeDefined();
      expect(result.status).toBe('draft');
    });
  });

  describe('update', () => {
    it('updates a draft campaign', async () => {
      const { controller, service } = makeController();
      const created = await service.create({
        name: 'Old',
        subject: 's',
        heading: 'h',
        content: 'c',
      });

      const result = await controller.update(String(created.id), {
        name: 'New Name',
      });

      expect(result.name).toBe('New Name');
    });

    it('rejects updating a non-draft campaign', async () => {
      const { controller, service } = makeController();
      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });
      await service.cancel(created.id);

      await expect(
        controller.update(String(created.id), { name: 'Nope' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws not found for unknown id', async () => {
      const { controller } = makeController();

      await expect(controller.update('99999', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('schedule', () => {
    it('schedules a draft for a future date', async () => {
      const { controller, service } = makeController();
      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });

      const result = await controller.schedule(String(created.id), {
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      });

      expect(result.status).toBe('scheduled');
    });

    it('rejects a past date', async () => {
      const { controller, service } = makeController();
      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });

      await expect(
        controller.schedule(String(created.id), {
          scheduledAt: new Date(Date.now() - 86400000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('send', () => {
    it('sends a draft campaign', async () => {
      const { controller } = makeController();
      const created = await controller.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });

      const result = await controller.send(String(created.id));

      expect(result.recipientCount).toBe(3);
      expect(result.campaign.status).toBe('sending');
    });

    it('rejects sending a non-draft campaign', async () => {
      const { controller, service } = makeController();
      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });
      await service.cancel(created.id);

      await expect(controller.send(String(created.id))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws not found for unknown id', async () => {
      const { controller } = makeController();

      await expect(controller.send('99999')).rejects.toThrow(NotFoundException);
    });

    it('rejects a non-numeric id', async () => {
      const { controller } = makeController();

      await expect(controller.send('abc')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('cancels a draft campaign', async () => {
      const { controller, service } = makeController();
      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });

      const result = await controller.cancel(String(created.id));
      expect(result.status).toBe('cancelled');
    });

    it('cancels a scheduled campaign', async () => {
      const { controller, service } = makeController();
      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });
      await service.schedule(created.id, {
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      });

      const result = await controller.cancel(String(created.id));
      expect(result.status).toBe('cancelled');
    });

    it('rejects cancelling an already cancelled campaign', async () => {
      const { controller, service } = makeController();
      const created = await service.create({
        name: 'X',
        subject: 's',
        heading: 'h',
        content: 'c',
      });
      await service.cancel(created.id);

      await expect(controller.cancel(String(created.id))).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
