import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';

describe('NewsletterController', () => {
  let controller: NewsletterController;
  const newsletterService = {
    create: vi.fn(),
    confirm: vi.fn(),
    unsubscribe: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    newsletterService.create.mockReset();
    newsletterService.confirm.mockReset();
    newsletterService.unsubscribe.mockReset();

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

  it('passes the subscription request to the service', () => {
    const dto = { email: 'jane@example.com', consent: true };
    newsletterService.create.mockReturnValue({ id: 1, email: dto.email });

    expect(controller.create(dto)).toEqual({ id: 1, email: dto.email });
    expect(newsletterService.create).toHaveBeenCalledWith(dto);
  });

  it('passes the confirmation request to the service', () => {
    const dto = { email: 'jane@example.com', token: 'a'.repeat(64) };
    newsletterService.confirm.mockReturnValue({
      status: 'subscribed',
      email: dto.email,
    });

    expect(controller.confirm(dto)).toEqual({
      status: 'subscribed',
      email: dto.email,
    });
    expect(newsletterService.confirm).toHaveBeenCalledWith(dto);
  });

  it('passes the unsubscribe request to the service', () => {
    const dto = { email: 'jane@example.com', token: 'b'.repeat(64) };
    newsletterService.unsubscribe.mockReturnValue({
      status: 'unsubscribed',
      email: dto.email,
    });

    expect(controller.unsubscribe(dto)).toEqual({
      status: 'unsubscribed',
      email: dto.email,
    });
    expect(newsletterService.unsubscribe).toHaveBeenCalledWith(dto);
  });
});
