import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';

describe('NewsletterController', () => {
  let controller: NewsletterController;
  const newsletterService = {
    create: vi.fn(),
  };

  beforeEach(async () => {
    newsletterService.create.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NewsletterController],
      providers: [
        {
          provide: NewsletterService,
          useValue: newsletterService,
        },
      ],
    }).compile();

    controller = module.get<NewsletterController>(NewsletterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the email to the service', () => {
    const dto = { email: 'jane@example.com' };
    newsletterService.create.mockReturnValue({ id: 1, email: dto.email });

    expect(controller.create(dto)).toEqual({ id: 1, email: dto.email });
    expect(newsletterService.create).toHaveBeenCalledWith(dto);
  });
});
