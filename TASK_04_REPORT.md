# Task 04 — Aapulki Newsletter Consent, Double Opt-In & Unsubscribe — Final Report

## 1. Files inspected

- `backend/src/newsletter/entities/newsletter.entity.ts`
- `backend/src/newsletter/newsletter.service.ts` and `newsletter.service.spec.ts`
- `backend/src/newsletter/newsletter.controller.ts` and `newsletter.controller.spec.ts`
- `backend/src/newsletter/newsletter.module.ts`
- `backend/src/newsletter/dto/create-newsletter.dto.ts`
- `backend/src/migrations/1792800000000-CreateNewsletterSubscriptions.ts`
- `backend/src/notifications/notifications.service.ts`
- `backend/src/notifications/entities/email-outbox.entity.ts`
- `backend/src/notifications/notification-events.ts`
- `backend/src/notifications/templates/brand.ts` (existing email helpers)
- `backend/src/config/email-configuration.ts` (base URL helper)
- `backend/src/migrations/1793200000000-EmailOutbox.ts`
- `frontend/src/components/NewsletterBanner.tsx` and `NewsletterBanner.module.css`
- `frontend/src/lib/api/client.ts` and `frontend/src/lib/api/index.ts`
- `frontend/src/app/checkout/page.tsx` (App Router page convention reference)
- `frontend/src/app/layout.tsx`
- `frontend/next.config.js` (rewrites `/api/*` → backend)
- `frontend/package.json`

## 2. Files created or modified

### Backend (created)

- `backend/src/migrations/1793300000000-NewsletterConsent.ts` — migration adding consent/double-opt-in columns.
- `backend/src/newsletter/dto/confirm-newsletter.dto.ts` — confirmation request DTO.
- `backend/src/newsletter/dto/unsubscribe-newsletter.dto.ts` — unsubscribe request DTO.
- `backend/src/notifications/templates/newsletter-confirmation.ts` — branded double opt-in confirmation template.

### Backend (modified)

- `backend/src/newsletter/entities/newsletter.entity.ts` — extended entity with status/consent/confirmation/unsubscribe columns.
- `backend/src/newsletter/newsletter.service.ts` — consent lifecycle (create/confirm/unsubscribe/isSubscribed).
- `backend/src/newsletter/newsletter.controller.ts` — added `/newsletter/confirm` and `/newsletter/unsubscribe` endpoints.
- `backend/src/newsletter/newsletter.module.ts` — imports `NotificationsModule`.
- `backend/src/newsletter/dto/create-newsletter.dto.ts` — added required `consent: boolean`.
- `backend/src/newsletter/newsletter.service.spec.ts` — rewritten tests.
- `backend/src/newsletter/newsletter.controller.spec.ts` — updated for new endpoints.
- `backend/src/notifications/notifications.service.ts` — added `enqueueNewsletterConfirmation`.
- `backend/src/notifications/entities/email-outbox.entity.ts` — `newsletter_confirmation` event, `subscriber` recipient kind, nullable `orderId`.
- `backend/src/notifications/notification-events.ts` — `newsletterConfirmationEventKey`.
- `backend/src/migrations/1793200000000-EmailOutbox.ts` — nullable `order_id` column.

### Frontend (created)

- `frontend/src/lib/api/newsletter.ts` — API client helpers.
- `frontend/src/components/NewsletterConfirmView.tsx` — confirmation view (explicit action).
- `frontend/src/components/NewsletterUnsubscribeView.tsx` — unsubscribe view (explicit action).
- `frontend/src/app/newsletter/confirm/page.tsx` — App Router page.
- `frontend/src/app/newsletter/unsubscribe/page.tsx` — App Router page.

### Frontend (modified)

- `frontend/src/components/NewsletterBanner.tsx` — explicit consent checkbox, pending-confirmation success state, validation.
- `frontend/src/components/NewsletterBanner.module.css` — `.consent`, `.consentInput`, `.consentLabel` styles.

## 3. Database changes and migration

- Migration `1793300000000-NewsletterConsent.ts` adds to `newsletter_subscriptions`:
  - `status VARCHAR(32) NOT NULL DEFAULT 'pending_confirmation'`
  - `consent_at`, `confirmed_at`, `confirmation_token_expires_at`, `confirmation_sent_at`, `unsubscribed_at` (nullable timestamps)
  - `consent_source VARCHAR(64)`, `consent_text VARCHAR(255)` (nullable)
  - `confirmation_token_hash VARCHAR(64)`, `unsubscribe_token_hash VARCHAR(64)` (nullable)
- Existing rows keep their email and inherit the `pending_confirmation` status; no consent timestamps are backfilled.
- Migration `1793200000000-EmailOutbox.ts` altered: `order_id` is now nullable so non-order events (newsletter confirmation) can be queued; the entity's `@Check` constraints now include `newsletter_confirmation` and `subscriber`.
- Unique email constraint is preserved.

## 4. Subscription lifecycle

States: `pending_confirmation`, `subscribed`, `unsubscribed`.

Flow:
1. User submits email + explicit consent (`consent: true`).
2. `NewsletterService.create` validates consent (DTO `@IsBoolean()` + service guard).
3. If already `subscribed` → return, no email.
4. If `pending_confirmation` inside the 60-minute resend cooldown → return, no email.
5. Otherwise `startPending` upserts the record as `pending_confirmation`, stores consent metadata, generates a 24-hour single-use confirmation token (raw token hashed with SHA-256) and a separate unsubscribe token, records `confirmationSentAt`, and enqueues the confirmation email via the outbox.
6. User opens `/newsletter/confirm?email=...&token=...` and explicitly clicks "Confirm subscription" → `POST /newsletter/confirm` → status becomes `subscribed`, `confirmedAt` recorded, confirmation token invalidated (single-use).
7. Unsubscribe: `POST /newsletter/unsubscribe` with email + token → status `unsubscribed`, `unsubscribedAt` recorded, unsubscribe token invalidated.

## 5. Token security

- Tokens generated with `crypto.randomBytes(32).toString('hex')` (64 hex chars).
- Only SHA-256 hashes are stored (`confirmation_token_hash`, `unsubscribe_token_hash`).
- Tokens are purpose-specific: confirmation and unsubscribe tokens use distinct columns and distinct hash comparisons; they are not interchangeable.
- Confirmation tokens expire after 24 hours and are single-use (hash cleared on confirm).
- Unsubscribe tokens are single-use (hash cleared on unsubscribe).
- Tokens never appear in logs or API responses; only the email-link flow carries the raw token to the user.

## 6. Confirmation and unsubscribe flows

- Confirmation email is a branded, non-promotional consent-verification message rendered by `renderNewsletterConfirmationEmail`, queued through `NotificationsService.enqueueNewsletterConfirmation` into `EmailOutbox` with `eventType = 'newsletter_confirmation'`, `recipientKind = 'subscriber'`, `orderId = null`.
- Event key is `newsletter_confirmation:${email}:${confirmationTokenHash}`, giving outbox deduplication per token (a resend with a new token is a distinct event).
- The confirmation email is not a promotional campaign and does not consume the `promotional` one-time marketing allowance.
- Confirmation page requires an explicit user action (`handleConfirm` → POST); a plain GET never mutates state, protecting against email security scanners.
- Unsubscribe page likewise requires an explicit action; repeated unsubscribe is idempotent.
- Unsubscribed records are retained (not deleted) and `isSubscribed` returns `false` for them.

## 7. Frontend changes

- `NewsletterBanner` preserves visual design, modal timing/animation/accessibility, and loading/success/error handling; added explicit consent checkbox (`consent` state), explanation copy, consent-required validation, and a `pendingConfirmation` success state that suppresses the poof animation.
- New `/newsletter/confirm` and `/newsletter/unsubscribe` pages using Next.js App Router conventions, with `Suspense` around the `useSearchParams`-based views.
- New `frontend/src/lib/api/newsletter.ts` exposing `subscribeToNewsletter`, `confirmNewsletterSubscription`, `unsubscribeNewsletter`.
- Pages are marked `noindex, nofollow`.

## 8. Tests and results

- Backend: `npx tsc --noEmit -p tsconfig.json` — clean.
- Backend: `npx vitest run` — 20 files / 251 tests passed.
- Backend: `npx eslint` on touched files — clean (only pre-existing errors in unrelated files such as `auth-configuration.ts` and old migrations remain).
- Backend: `npx prettier --check` on touched files — clean.
- Frontend: `npx tsc --noEmit` — clean.
- Frontend: `npx eslint` on touched files — clean (only pre-existing `<img>` warnings remain).
- Frontend: `npx prettier --check` on touched files — clean.
- New/updated tests: consent required, invalid email, duplicate, reconfirmation, token hashing, invalid/expired/reused token, successful confirm, repeated confirm, unsubscribe, repeated unsubscribe, marketing suppression, outbox dedup, existing tests all green.

## 9. Unresolved issues

- No rate-limiting package exists in the project; public endpoints rely on the existing conventions (none added, per the explicit exclusion). If abuse protection is required, a later task should add it.
- No live Sender API calls were made; delivery was not exercised end-to-end.
- Token email links depend on `getEmailBaseUrl` (frontend origin) being configured; without it, `confirmationUrl` is empty.
- Frontend `npm run build` (next build) was not executed; only TypeScript, ESLint and Prettier checks ran.

## 10. Manual steps needed to test the flow

1. Apply migrations to the test database (existing convention): run `1793200000000-EmailOutbox` and `1793300000000-NewsletterConsent`.
2. Start backend and frontend; ensure `API_URL`/frontend origin env vars are set so the confirmation URL resolves.
3. Submit an email via the banner with the consent checkbox ticked → expect `pending_confirmation` and a queued `newsletter_confirmation` outbox row.
4. Open the confirmation link from the email → click "Confirm subscription" → expect status `subscribed`.
5. Re-open the same link and click again → expect an invalid-token error (single-use).
6. Use an expired token (wait 24h or shorten TTL) → expect expired-token error.
7. Click "Unsubscribe" on `/newsletter/unsubscribe?email=...&token=...` → expect status `unsubscribed`; repeat → idempotent.
8. Verify `isSubscribed` returns `false` for the unsubscribed address.
9. Submitting without consent → expect 400 with the consent-required message.
10. Confirm transactional emails (order placed, status changes) still enqueue and send unaffected.

## 11. Completion condition

A user can explicitly subscribe, confirm through email, and unsubscribe. Existing unverified subscribers remain pending. Transactional email behaviour remains unaffected. All backend (251/251) and frontend (tsc/eslint/prettier) checks pass.
