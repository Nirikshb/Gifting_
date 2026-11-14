/**
 * Abstraction for checking newsletter marketing consent and unsubscribe state.
 *
 * Injected into `NotificationsService` through the `MARKETING_CONSENT_CHECKER`
 * injection token so a module does not need to import the newsletter module
 * (and vice versa): NotificationsModule provides a `TypeOrmMarketingConsentChecker`
 * implementation that reads the same `newsletter_subscriptions` table with the
 * same normalized-email semantics.
 */
export const MARKETING_CONSENT_CHECKER = 'MarketingConsentChecker';

export interface MarketingConsentChecker {
  /** Whether the address has confirmed newsletter consent (status `subscribed`). */
  isSubscribed(email: string): Promise<boolean>;
  /** Whether the address has unsubscribed (status `unsubscribed`). */
  isUnsubscribed(email: string): Promise<boolean>;
}
