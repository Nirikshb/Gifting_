import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { vi } from 'vitest';
import { Newsletter } from './entities/newsletter.entity';
import { NewsletterService } from './newsletter.service';

describe('NewsletterService', () => {
  let service: NewsletterService;
  const newslettersRepository = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  const subscription: Newsletter = {
    id: 1,
    email: 'jane@example.com',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    newslettersRepository.findOne.mockReset();
    newslettersRepository.create.mockReset();
    newslettersRepository.save.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterService,
        {
          provide: getRepositoryToken(Newsletter),
          useValue: newslettersRepository,
        },
      ],
    }).compile();

    service = module.get<NewsletterService>(NewsletterService);
  });

  describe('create', () => {
    it('saves a new email', async () => {
      newslettersRepository.findOne.mockResolvedValue(null);
      newslettersRepository.create.mockReturnValue({
        email: 'jane@example.com',
      });
      newslettersRepository.save.mockResolvedValue(subscription);

      const result = await service.create({ email: 'jane@example.com' });

      expect(newslettersRepository.create).toHaveBeenCalledWith({
        email: 'jane@example.com',
      });
      expect(newslettersRepository.save).toHaveBeenCalledWith({
        email: 'jane@example.com',
      });
      expect(result).toEqual(subscription);
    });

    it('returns the existing row when the email is already saved', async () => {
      newslettersRepository.findOne.mockResolvedValue(subscription);

      const result = await service.create({ email: 'jane@example.com' });

      expect(newslettersRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual(subscription);
    });

    it('returns the saved row when two requests insert the same email', async () => {
      newslettersRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(subscription);
      newslettersRepository.create.mockReturnValue({
        email: 'jane@example.com',
      });
      newslettersRepository.save.mockRejectedValue(
        new QueryFailedError('', [], {
          code: '23505',
          constraint: 'newsletter_subscriptions_email_unique',
        } as unknown as Error),
      );

      const result = await service.create({ email: 'jane@example.com' });

      expect(result).toEqual(subscription);
    });
  });
});
