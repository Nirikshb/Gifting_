import { request } from "./client";

export const NEWSLETTER_STATUSES = [
  "pending_confirmation",
  "subscribed",
  "unsubscribed",
] as const;

export type NewsletterStatus = (typeof NEWSLETTER_STATUSES)[number];

export type NewsletterSubscription = {
  id: number;
  email: string;
  status: NewsletterStatus;
  consentAt: string | null;
  consentSource: string | null;
  consentText: string | null;
  confirmedAt: string | null;
  confirmationTokenHash: string | null;
  confirmationTokenExpiresAt: string | null;
  confirmationSentAt: string | null;
  unsubscribeTokenHash: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewsletterActionResult = {
  status: NewsletterStatus;
  email: string;
};

export function subscribeToNewsletter(
  email: string,
): Promise<NewsletterSubscription> {
  return request("POST", "/newsletter", { email, consent: true });
}

export function confirmNewsletterSubscription(
  email: string,
  token: string,
): Promise<NewsletterActionResult> {
  return request("POST", "/newsletter/confirm", { email, token });
}

export function unsubscribeNewsletter(
  email: string,
  token: string,
): Promise<NewsletterActionResult> {
  return request("POST", "/newsletter/unsubscribe", { email, token });
}
