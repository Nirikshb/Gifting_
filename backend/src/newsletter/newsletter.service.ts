import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { ConfirmNewsletterDto } from './dto/confirm-newsletter.dto';
import { UnsubscribeNewsletterDto } from './dto/unsubscribe-newsletter.dto';
import { Newsletter } from './entities/newsletter.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { getEmailBaseUrl } from '../config/email-configuration';
import { newsletterConfirmationEventKey } from '../notifications/notification-events';
import { renderNewsletterConfirmationEmail } from '../notifications/templates/newsletter-confirmation';
import { MarketingConsentChecker } from '../notifications/marketing-consent.checker';

const NEWSLETTER_EMAIL_UNIQUE_CONSTRAINT =
  'newsletter_subscriptions_email_unique';

const CONSENT_TEXT = 'weekly-newsletter-double-opt-in:v1';
const CONFIRMATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const CONFIRMATION_RESEND_COOLDOWN_MS = 60 * 60 * 1000;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

@Injectable()
export class NewsletterService implements MarketingConsentChecker {
  constructor(
    @InjectRepository(Newsletter)
    private readonly newslettersRepository: Repository<Newsletter>,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateNewsletterDto): Promise<Newsletter> {
    if (!dto.consent) {
      throw new BadRequestException(
        'Marketing consent is required before subscribing.',
      );
    }

    const email = this.normalizeEmail(dto.email);
    const existing = await this.findByEmail(email);

    if (existing?.status === 'subscribed') {
      // Already opted in: nothing left to confirm or send.
      return existing;
    }

    if (existing?.status === 'pending_confirmation') {
      const lastSentAt = existing.confirmationSentAt ?? existing.createdAt;
      const cooldownElapsed =
        Date.now() - lastSentAt.getTime() >= CONFIRMATION_RESEND_COOLDOWN_MS;

      if (!cooldownElapsed) {
        // Duplicate request inside the resend cooldown: no new record, no new
        // confirmation email.
        return existing;
      }
    }

    // New address, or a previous unsubscribe: start the double opt-in again.
    return this.startPending(email, 'api');
  }

  async confirm(
    dto: ConfirmNewsletterDto,
  ): Promise<{ status: string; email: string }> {
    const email = this.normalizeEmail(dto.email);
    const subscription = await this.findByEmail(email);

    if (!subscription) {
      throw new NotFoundException('Newsletter subscription not found.');
    }

    if (subscription.status === 'subscribed') {
      return { status: subscription.status, email };
    }

    if (subscription.status !== 'pending_confirmation') {
      throw new BadRequestException(
        'This newsletter address is no longer awaiting confirmation.',
      );
    }

    const tokenHash = sha256(dto.token);
    if (
      !subscription.confirmationTokenHash ||
      subscription.confirmationTokenHash !== tokenHash
    ) {
      throw new BadRequestException('Invalid confirmation token.');
    }

    if (
      !subscription.confirmationTokenExpiresAt ||
      subscription.confirmationTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Confirmation token has expired.');
    }

    subscription.status = 'subscribed';
    subscription.confirmedAt = new Date();
    // Single use: the consumed token can never confirm twice.
    subscription.confirmationTokenHash = null;
    subscription.confirmationTokenExpiresAt = null;

    const saved = await this.saveSubscription(subscription);

    return { status: saved.status, email: saved.email };
  }

  async unsubscribe(
    dto: UnsubscribeNewsletterDto,
  ): Promise<{ status: string; email: string }> {
    const email = this.normalizeEmail(dto.email);
    const subscription = await this.findByEmail(email);

    if (!subscription) {
      throw new NotFoundException('Newsletter subscription not found.');
    }

    if (subscription.status === 'unsubscribed') {
      // Idempotent repeat: already off the list, nothing to change.
      return { status: subscription.status, email };
    }

    const tokenHash = sha256(dto.token);
    if (
      !subscription.unsubscribeTokenHash ||
      subscription.unsubscribeTokenHash !== tokenHash
    ) {
      throw new BadRequestException('Invalid unsubscribe token.');
    }

    subscription.status = 'unsubscribed';
    subscription.unsubscribedAt = new Date();
    subscription.unsubscribeTokenHash = null;

    const saved = await this.saveSubscription(subscription);

    return { status: saved.status, email: saved.email };
  }

  /** Only confirmed subscribers are eligible for marketing sends. */
  async isSubscribed(email: string): Promise<boolean> {
    const subscription = await this.findByEmail(email);
    return subscription?.status === 'subscribed';
  }

  /** Whether the address has unsubscribed (status `unsubscribed`). */
  async isUnsubscribed(email: string): Promise<boolean> {
    const subscription = await this.findByEmail(email);
    return subscription?.status === 'unsubscribed';
  }

  async findByEmail(email: string): Promise<Newsletter | null> {
    return this.newslettersRepository.findOne({
      where: { email: this.normalizeEmail(email) },
    });
  }

  private async startPending(
    email: string,
    consentSource: string,
  ): Promise<Newsletter> {
    const existing = await this.findByEmail(email);
    const now = new Date();
    const confirmationToken = generateToken();
    const unsubscribeToken = generateToken();
    const confirmationTokenHash = sha256(confirmationToken);

    const subscription: Newsletter = existing
      ? { ...existing }
      : this.newslettersRepository.create({
          email,
          status: 'pending_confirmation',
        });

    subscription.email = email;
    subscription.status = 'pending_confirmation';
    subscription.consentAt = now;
    subscription.consentSource = consentSource;
    subscription.consentText = CONSENT_TEXT;
    subscription.confirmedAt = null;
    subscription.confirmationTokenHash = confirmationTokenHash;
    subscription.confirmationTokenExpiresAt = new Date(
      now.getTime() + CONFIRMATION_TOKEN_TTL_MS,
    );
    subscription.confirmationSentAt = now;
    subscription.unsubscribeTokenHash = sha256(unsubscribeToken);
    subscription.unsubscribedAt = null;

    const saved = await this.saveSubscription(subscription);
    await this.sendConfirmationEmail(saved, confirmationToken);

    return saved;
  }

  private async sendConfirmationEmail(
    subscription: Newsletter,
    confirmationToken: string,
  ): Promise<void> {
    const baseUrl = getEmailBaseUrl(this.configService);
    const confirmationUrl = baseUrl
      ? `${baseUrl}/newsletter/confirm?email=${encodeURIComponent(subscription.email)}&token=${confirmationToken}`
      : '';

    const rendered = renderNewsletterConfirmationEmail({
      email: subscription.email,
      confirmationUrl,
    });

    await this.notificationsService.enqueueNewsletterConfirmation({
      eventKey: newsletterConfirmationEventKey(
        subscription.email,
        sha256(confirmationToken),
      ),
      email: subscription.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  private async saveSubscription(
    subscription: Newsletter,
  ): Promise<Newsletter> {
    try {
      return await this.newslettersRepository.save(subscription);
    } catch (error) {
      if (!this.isEmailUniqueViolation(error)) {
        throw error;
      }

      const raced = await this.findByEmail(subscription.email);
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

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
