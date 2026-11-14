import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { vi } from 'vitest';
import { Newsletter } from './entities/newsletter.entity';
import { NewsletterService } from './newsletter.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('NewsletterService', () => {
  let service: NewsletterService;
  const newslettersRepository = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };
  const notificationsService = {
    enqueueNewsletterConfirmation: vi.fn(),
  };

  const confirmationToken = 'c'.repeat(64);
  const unsubscribeToken = 'b'.repeat(64);
  const confirmationTokenHash = createHash('sha256')
    .update(confirmationToken)
    .digest('hex');
  const unsubscribeTokenHash = createHash('sha256')
    .update(unsubscribeToken)
    .digest('hex');

  let pending: Newsletter;

  const makePending = (): Newsletter => ({
    id: 1,
    email: 'jane@example.com',
    status: 'pending_confirmation',
    consentAt: new Date('2026-01-01T00:00:00Z'),
    consentSource: 'api',
    consentText: 'weekly-newsletter-double-opt-in:v1',
    confirmedAt: null,
    confirmationTokenHash,
    confirmationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    confirmationSentAt: new Date('2026-01-01T00:00:00Z'),
    unsubscribeTokenHash,
    unsubscribedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    newslettersRepository.findOne.mockReset();
    newslettersRepository.create.mockReset();
    newslettersRepository.save.mockReset();
    notificationsService.enqueueNewsletterConfirmation.mockReset();

    pending = makePending();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterService,
        {
          provide: getRepositoryToken(Newsletter),
          useValue: newslettersRepository,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
        {
          provide: ConfigService,
          useValue: { get: () => 'http://localhost:4000' },
        },
      ],
    }).compile();

    service = module.get<NewsletterService>(NewsletterService);
  });

  describe('create', () => {
    it('refuses to subscribe without explicit consent', async () => {
      await expect(
        service.create({ email: 'jane@example.com', consent: false }),
      ).rejects.toThrow(BadRequestException);
      expect(
        notificationsService.enqueueNewsletterConfirmation,
      ).not.toHaveBeenCalled();
    });

    it('creates a pending confirmation and queues the confirmation email', async () => {
      newslettersRepository.findOne.mockResolvedValue(null);
      newslettersRepository.create.mockImplementation(
        (values: Record<string, unknown>) => ({ ...values }),
      );
      newslettersRepository.save.mockImplementation(
        (values: Record<string, unknown>) => ({ ...values, id: 1 }),
      );

      const result = await service.create({
        email: 'Jane@Example.com',
        consent: true,
      });

      expect(result.status).toBe('pending_confirmation');
      expect(
        notificationsService.enqueueNewsletterConfirmation,
      ).toHaveBeenCalledTimes(1);
      const enqueueInput = notificationsService.enqueueNewsletterConfirmation
        .mock.calls[0][0] as { email: string; eventKey: string };
      expect(enqueueInput.email).toBe('jane@example.com');
      expect(enqueueInput.eventKey).toContain(
        'newsletter_confirmation:jane@example.com:',
      );
    });

    it('does not send another confirmation while one is inside the resend cooldown', async () => {
      const throttled = { ...pending, confirmationSentAt: new Date() };
      newslettersRepository.findOne.mockResolvedValue(throttled);

      const result = await service.create({
        email: 'jane@example.com',
        consent: true,
      });

      expect(result).toEqual(throttled);
      expect(
        notificationsService.enqueueNewsletterConfirmation,
      ).not.toHaveBeenCalled();
    });

    it('sends a fresh confirmation once the resend cooldown elapsed', async () => {
      newslettersRepository.findOne.mockResolvedValue({
        ...pending,
        confirmationSentAt: new Date(Date.now() - 60 * 60 * 1000 - 1000),
      });
      newslettersRepository.create.mockImplementation(
        (values: Record<string, unknown>) => ({ ...values }),
      );
      newslettersRepository.save.mockImplementation(
        (values: Record<string, unknown>) => ({ ...values, id: 2 }),
      );

      const result = await service.create({
        email: 'jane@example.com',
        consent: true,
      });

      expect(result.status).toBe('pending_confirmation');
      expect(
        notificationsService.enqueueNewsletterConfirmation,
      ).toHaveBeenCalledTimes(1);
    });

    it('does not send a confirmation for an already subscribed address', async () => {
      newslettersRepository.findOne.mockResolvedValue({
        ...pending,
        status: 'subscribed',
        confirmedAt: new Date('2026-01-01T00:00:00Z'),
      });

      const result = await service.create({
        email: 'jane@example.com',
        consent: true,
      });

      expect(result.status).toBe('subscribed');
      expect(
        notificationsService.enqueueNewsletterConfirmation,
      ).not.toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    it('confirms a subscription with a valid, unexpired token', async () => {
      const confirmed = {
        ...pending,
        status: 'subscribed' as const,
        confirmedAt: new Date('2026-01-03T00:00:00Z'),
        confirmationTokenHash: null,
        confirmationTokenExpiresAt: null,
      };
      newslettersRepository.findOne.mockResolvedValue(pending);
      newslettersRepository.save.mockResolvedValue(confirmed);

      const result = await service.confirm({
        email: 'jane@example.com',
        token: confirmationToken,
      });

      expect(result).toEqual({
        status: 'subscribed',
        email: 'jane@example.com',
      });
      expect(newslettersRepository.save).toHaveBeenCalled();
      expect(
        notificationsService.enqueueNewsletterConfirmation,
      ).not.toHaveBeenCalled();
    });

    it('rejects an invalid confirmation token', async () => {
      newslettersRepository.findOne.mockResolvedValue(pending);

      await expect(
        service.confirm({ email: 'jane@example.com', token: 'wrong-token' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an expired confirmation token', async () => {
      newslettersRepository.findOne.mockResolvedValue({
        ...pending,
        confirmationTokenExpiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.confirm({
          email: 'jane@example.com',
          token: confirmationToken,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects confirmation for an address that is not pending', async () => {
      newslettersRepository.findOne.mockResolvedValue({
        ...pending,
        status: 'unsubscribed',
      });

      await expect(
        service.confirm({
          email: 'jane@example.com',
          token: confirmationToken,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns the subscription when it is already confirmed', async () => {
      newslettersRepository.findOne.mockResolvedValue({
        ...pending,
        status: 'subscribed',
        confirmedAt: new Date('2026-01-01T00:00:00Z'),
      });

      const result = await service.confirm({
        email: 'jane@example.com',
        token: confirmationToken,
      });

      expect(result.status).toBe('subscribed');
      expect(newslettersRepository.save).not.toHaveBeenCalled();
    });

    it('throws a not-found error for an unknown address', async () => {
      newslettersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.confirm({
          email: 'nobody@example.com',
          token: confirmationToken,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unsubscribe', () => {
    it('marks the subscription unsubscribed with a valid token', async () => {
      const unsubscribed = {
        ...pending,
        status: 'unsubscribed' as const,
        unsubscribedAt: new Date('2026-01-03T00:00:00Z'),
        unsubscribeTokenHash: null,
      };
      newslettersRepository.findOne.mockResolvedValue(pending);
      newslettersRepository.save.mockResolvedValue(unsubscribed);

      const result = await service.unsubscribe({
        email: 'jane@example.com',
        token: unsubscribeToken,
      });

      expect(result).toEqual({
        status: 'unsubscribed',
        email: 'jane@example.com',
      });
    });

    it('is idempotent for a repeat unsubscribe', async () => {
      newslettersRepository.findOne.mockResolvedValue({
        ...pending,
        status: 'unsubscribed',
        unsubscribedAt: new Date('2026-01-03T00:00:00Z'),
      });

      const result = await service.unsubscribe({
        email: 'jane@example.com',
        token: unsubscribeToken,
      });

      expect(result.status).toBe('unsubscribed');
      expect(newslettersRepository.save).not.toHaveBeenCalled();
    });

    it('rejects an invalid unsubscribe token', async () => {
      newslettersRepository.findOne.mockResolvedValue(pending);

      await expect(
        service.unsubscribe({
          email: 'jane@example.com',
          token: 'nope',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws a not-found error for an unknown address', async () => {
      newslettersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.unsubscribe({
          email: 'nobody@example.com',
          token: unsubscribeToken,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('marketing eligibility', () => {
    it('only reports confirmed subscribers', async () => {
      newslettersRepository.findOne.mockResolvedValue(pending);

      expect(await service.isSubscribed('jane@example.com')).toBe(false);

      newslettersRepository.findOne.mockResolvedValue({
        ...pending,
        status: 'subscribed',
      });

      expect(await service.isSubscribed('jane@example.com')).toBe(true);
    });
  });
});
