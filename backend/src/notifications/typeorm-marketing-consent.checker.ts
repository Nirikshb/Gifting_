import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Newsletter } from '../newsletter/entities/newsletter.entity';
import type { MarketingConsentChecker } from './marketing-consent.checker';

/**
 * Marketing consent checker backed by the `newsletter_subscriptions` table.
 *
 * Mirrors `NewsletterService`'s consent semantics exactly — the same
 * normalized-email lookup (`trim` + lowercase) and the same `subscribed` /
 * `unsubscribed` status comparisons — so dispatch-time enforcement matches the
 * double opt-in state recorded at signup time. It lives here, wired through
 * the `MARKETING_CONSENT_CHECKER` token, so NotificationsModule does not need
 * to import NewsletterModule (no module cycle).
 */
@Injectable()
export class TypeOrmMarketingConsentChecker implements MarketingConsentChecker {
  constructor(
    @InjectRepository(Newsletter)
    private readonly newsletters: Repository<Newsletter>,
  ) {}

  /** Only confirmed subscribers are eligible for marketing sends. */
  async isSubscribed(email: string): Promise<boolean> {
    const subscription = await this.newsletters.findOne({
      where: { email: this.normalizeEmail(email) },
    });
    return subscription?.status === 'subscribed';
  }

  /** Whether the address has unsubscribed (status `unsubscribed`). */
  async isUnsubscribed(email: string): Promise<boolean> {
    const subscription = await this.newsletters.findOne({
      where: { email: this.normalizeEmail(email) },
    });
    return subscription?.status === 'unsubscribed';
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
