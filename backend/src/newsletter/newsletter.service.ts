import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { Newsletter } from './entities/newsletter.entity';

const NEWSLETTER_EMAIL_UNIQUE_CONSTRAINT =
  'newsletter_subscriptions_email_unique';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectRepository(Newsletter)
    private readonly newslettersRepository: Repository<Newsletter>,
  ) {}

  async create(dto: CreateNewsletterDto): Promise<Newsletter> {
    const existing = await this.newslettersRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      return existing;
    }

    try {
      const subscription = this.newslettersRepository.create({
        email: dto.email,
      });
      return await this.newslettersRepository.save(subscription);
    } catch (error) {
      if (!this.isEmailUniqueViolation(error)) {
        throw error;
      }

      const raced = await this.newslettersRepository.findOne({
        where: { email: dto.email },
      });

      if (!raced) {
        throw error;
      }

      return raced;
    }
  }

  private isEmailUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };

    return (
      driverError?.code === '23505' &&
      driverError.constraint === NEWSLETTER_EMAIL_UNIQUE_CONSTRAINT
    );
  }
}
