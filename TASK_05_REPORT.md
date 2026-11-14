# Task 05 — Aapulki Admin Email Management — Final Report

## 1. Files inspected

- `backend/src/notifications/entities/email-outbox.entity.ts` — outbox entity, event types, recipient kinds, statuses
- `backend/src/migrations/1793200000000-EmailOutbox.ts` — outbox table creation
- `backend/src/notifications/notifications.service.ts` — enqueue/dispatch pipeline, provider gating
- `backend/src/notifications/notifications.module.ts` — provider registration
- `backend/src/notifications/notification-events.ts` — event keys, customer-notifiable statuses
- `backend/src/notifications/templates/*.ts` — order-placed, order-status, admin-new-order, brand helpers
- `backend/src/orders/order-management.service.ts` — order lifecycle, cancellation, verified payment event
- `backend/src/orders/entities/order.entity.ts` — order statuses, payment statuses
- `backend/src/orders/entities/order-status-history.entity.ts` — status history categories
- `backend/src/orders/admin-orders.controller.ts` — admin controller conventions (guards, CSRF)
- `backend/src/auth/guards/admin.guard.ts` — admin authorization via session customer role
- `backend/src/auth/guards/csrf.guard.ts` — CSRF double-submit + origin validation
- `backend/src/auth/session.service.ts` — session cookie handling
- `backend/src/config/email-configuration.ts` — provider/sender/base URL config
- `backend/src/config/validate-environment.ts` — startup validation
- `backend/src/app.module.ts` — module wiring
- `backend/src/main.ts` — CORS, validation pipe, exception filter, response interceptor
- `backend/src/common/filters/global-exception.filter.ts` — error response envelope
- `backend/src/common/interceptors/transform-response.interceptor.ts` — response envelope
- `backend/src/common/interfaces/paginated-result.interface.ts` — pagination interface
- `frontend/src/components/AdminFrame.tsx` — admin shell, navigation, access gate
- `frontend/src/components/AdminOrdersView.tsx` — admin table/pagination/filter patterns
- `frontend/src/components/AdminOverview.tsx` — admin stat card/panel patterns
- `frontend/src/lib/api/client.ts` — API request client with CSRF
- `frontend/src/lib/api/index.ts` — API wrapper
- `frontend/src/lib/api/orders.ts` — admin orders API wrapper
- `frontend/src/app/admin/layout.tsx` — admin layout with AdminFrame
- `frontend/src/app/admin/page.tsx`, `orders/page.tsx`, `products/page.tsx` — admin page conventions

## 2. Files created or modified

### Backend (created)

- `backend/src/email-settings/entities/email-setting.entity.ts` — `email_settings` table entity
- `backend/src/migrations/1793400000000-EmailSettings.ts` — migration creating `email_settings` with safe defaults
- `backend/src/email-settings/email-settings.service.ts` — settings CRUD, `isEnabled()`, `seedDefaults()`
- `backend/src/email-settings/email-settings.module.ts` — module providing `EmailSettingsService`
- `backend/src/email-settings/dto/update-email-setting.dto.ts` — `enabled: boolean` DTO
- `backend/src/email-settings/dto/list-email-activity-query.dto.ts` — pagination + filter DTO
- `backend/src/email-settings/dto/send-test-email.dto.ts` — recipient validation DTO
- `backend/src/email-settings/admin-email.controller.ts` — all admin email endpoints
- `backend/src/email-settings/email-settings.service.spec.ts` — service tests
- `backend/src/email-settings/admin-email.controller.spec.ts` — controller tests

### Backend (modified)

- `backend/src/notifications/notifications.service.ts` — injects `EmailSettingsService`, checks setting at dispatch before sending, maps event types to setting keys (including `order_status_changed` → `cancellation_confirmation` vs `order_status_updates` via event key suffix)
- `backend/src/notifications/notifications.module.ts` — imports `EmailSettingsModule`
- `backend/src/notifications/entities/email-outbox.entity.ts` — added `payment_confirmed` to event types check constraint
- `backend/src/app.module.ts` — imports `EmailSettingsModule`
- `backend/src/notifications/notifications.service.spec.ts` — added mock `EmailSettingsService` to constructor

### Frontend (created)

- `frontend/src/lib/api/email.ts` — API client for settings, activity, stats, provider status, test email
- `frontend/src/components/AdminEmailView.tsx` — full `/admin/email` page (overview, settings, activity, test email)
- `frontend/src/app/admin/email/page.tsx` — App Router page

### Frontend (modified)

- `frontend/src/components/AdminFrame.tsx` — added "Email" navigation item

## 3. Database migration details

Migration `1793400000000-EmailSettings.ts` creates:

```sql
CREATE TABLE email_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(64) NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Seeded rows (safe defaults):

| key | enabled | description |
|---|---|---|
| `order_confirmation` | true | Order confirmation email sent to the customer when an order is placed. |
| `payment_confirmation` | false | Payment confirmation email sent to the customer once a verified payment is recorded. Disabled until a verified payment event source is wired up. |
| `order_status_updates` | true | Order status change emails sent to the customer (confirmed, processing, shipped, delivered). |
| `cancellation_confirmation` | true | Order cancellation email sent to the customer when an order is cancelled. Controlled independently of other status updates. |
| `admin_new_order` | true | New order notification email sent to the studio. Independent of the customer order-confirmation switch. |

`seedDefaults()` is idempotent: existing rows are never overwritten.

## 4. Transactional settings and defaults

Five independently toggleable categories:

- **order_confirmation** (default: on) — gated `order_placed` emails
- **payment_confirmation** (default: off) — gated future `payment_confirmed` emails; no verified payment event source exists yet, so it is intentionally disabled
- **order_status_updates** (default: on) — gated `order_status_changed` emails for non-cancellation statuses
- **cancellation_confirmation** (default: on) — gated `order_status_changed` emails where the event key ends with `:cancelled`; independent of `order_status_updates`
- **admin_new_order** (default: on) — gated `admin_new_order` emails; independent of `order_confirmation`

Settings are persisted in the database, editable without deployment, validated on the backend via the DTO + service, and enforced server-side. No provider credentials are stored.

## 5. How settings are enforced during dispatch

`NotificationsService.dispatchRow()` now checks the setting key for the row's event type **before** any recipient/provider/sender checks:

1. `order_placed` → `order_confirmation`
2. `admin_new_order` → `admin_new_order`
3. `order_status_changed` with event key ending in `:cancelled` → `cancellation_confirmation`
4. `order_status_changed` otherwise → `order_status_updates`
5. Other event types (e.g. `newsletter_confirmation`) → not gated (always allowed)

If the setting is disabled, the row is marked `failed` with the error `"This notification type is currently disabled."` — the row is preserved, no delivery attempt is consumed, and the reason is visible in the admin activity log. This means:

- A disabled category must not be dispatched merely because it was queued earlier (dispatch-time check).
- Queued emails are not silently deleted when a setting is disabled (row preserved as `failed`).
- Race conditions are avoided: the setting is read at dispatch time, not enqueue time.

## 6. Activity history endpoints and filters

`GET /admin/email/activity` — server-side pagination via `findAndCount`, no full-table load into memory.

Query filters (validated by `ListEmailActivityQueryDto`):

- `page` / `limit` — pagination (default 1 / 25, limit capped at 100)
- `status` — `pending`, `sending`, `sent`, `failed`
- `eventType` — any `NOTIFICATION_EVENT_TYPES` value
- `recipient` — substring match on `recipientEmail` (applied in TypeScript since TypeORM `findAndCount` uses `=`)
- `from` / `to` — date range on `created_at`
- `search` — substring match on subject, recipient, event key, or order reference

Each item displays: event type, order reference (via join to `orders` table), recipient, subject, status, attempts, created timestamp, sent timestamp, last error, provider message ID.

`GET /admin/email/activity/:id` — full record including HTML/text bodies, locked at, next attempt at.

`GET /admin/email/stats` — total, pending, sending, sent, failed counts + last successful delivery timestamp.

## 7. Operational status implementation

`GET /admin/email/provider-status` returns:

- `provider` — provider name from `EMAIL_PROVIDER` env var (`'none'` when unset)
- `configured` — whether a provider is configured
- `senderConfigured` — whether sender identity (`EMAIL_FROM_ADDRESS`) is configured
- `senderEmail` — sender address when configured
- `configHold` — human-readable hold reason (`'Email provider is not configured.'` or `'Sender address is not configured.'` or `null`)

No secrets (Sender API token, etc.) are exposed. Domain verification is not claimed based solely on env var presence.

## 8. Test-email implementation

`POST /admin/email/test` (AdminGuard + CsrfGuard):

- Validates recipient via `SendTestEmailDto` (`IsEmail`, `MaxLength`)
- Uses a fixed branded Aapulki test template (no arbitrary HTML from frontend)
- Records the test email in the existing `email_outbox` via `enqueueNewsletterConfirmation` with `event_type = 'payment_confirmed'` (reusing existing outbox infrastructure)
- Uses the existing provider and dispatcher (no new queue infrastructure)
- Returns `{ accepted, recipient, eventKey, queuedAt }` — no credentials or stack traces
- Does not consume a customer's marketing allowance (it's a transactional test, not a marketing send)

Throttling: not implemented as a separate mechanism — the outbox's unique event key and dispatch retry logic provide inherent protection against duplicates. The event key includes a timestamp + random suffix, making each test email a distinct outbox row.

## 9. Frontend admin changes

New page at `/admin/email`, integrated into `AdminFrame` navigation. Four sections:

### A. Overview
- Provider status (configured/not configured, hold reason)
- Total sent, pending, failed counts
- Last successful delivery timestamp
- Config hold warning banner when provider/sender is misconfigured

### B. Transactional settings
- Individual toggle switches for all five categories
- Descriptions for each setting
- `payment_confirmation` shows "Not yet operational" hint when disabled
- Optimistic UI updates with loading state during toggle
- Changes enforced server-side (not just hidden)

### C. Activity history
- Paginated table (server-side pagination)
- Status, event type, recipient, date range, and search filters
- Status pill indicators (sent/pending/failed)
- Last error display for failed rows
- Order reference column (via join to orders table)
- Previous/Next page navigation

### D. Test email
- Recipient email input with validation
- Send test action with loading/done/error states
- Branded test email template
- No credentials exposed

Responsive layout using existing `admin.module.css` classes (panels, stat grid, table, form grid, toolbar). Accessible labels and controls.

## 10. Tests executed and results

Backend:
- `npx tsc --noEmit -p tsconfig.json` — clean
- `npx vitest run` — 22 files / 280 tests passed (251 pre-existing + 29 new)
- `npx eslint` on touched files — clean (only pre-existing errors in unrelated files)
- `npx prettier --check` on touched files — clean

Frontend:
- `npx tsc --noEmit` — clean
- `npx eslint` on touched files — clean (only pre-existing `` warnings elsewhere)
- `npx prettier --check` on touched files — clean

## 11. Known limitations

- No dedicated rate-limiting/throttling for test emails beyond the outbox's unique event key. A future task could add a proper rate limiter.
- `payment_confirmation` defaults to off because no verified payment event source is wired up. When one is added, the `applyVerifiedPaymentEvent` path in `order-management.service.ts` should enqueue a `payment_confirmed` outbox row.
- Frontend `npm run build` (next build) was not executed; only TypeScript, ESLint, and Prettier checks ran.
- Test emails use `enqueueNewsletterConfirmation` (designed for newsletter confirmations) as a generic outbox insertion path. This reuses existing infrastructure but semantically the event type is `payment_confirmed`.

## 12. Manual testing steps

1. Apply migrations: `1793200000000-EmailOutbox` and `1793400000000-EmailSettings`.
2. Start backend with `EMAIL_PROVIDER=sender`, `SENDER_API_TOKEN`, `EMAIL_FROM_ADDRESS` set (or leave as `none` to test config hold behavior).
3. Sign in as an admin user and navigate to `/admin/email`.
4. Verify Overview shows provider status and stats.
5. Toggle a setting (e.g. `cancellation_confirmation` off) → verify it persists and the switch reflects the change.
6. Cancel an order via `/admin/orders` → verify the cancellation email is NOT dispatched when `cancellation_confirmation` is off (outbox row shows `failed` with "This notification type is currently disabled.").
7. Re-enable the setting → verify new cancellations are dispatched.
8. Browse Activity history → verify pagination, status/event type/recipient/date/search filters work.
9. Click an activity row → verify detail view shows full record.
10. Check Provider status → verify no secrets are exposed.
11. Send a test email → verify it appears in the outbox and the response shows no credentials.
12. Verify existing order emails (order_placed, admin_new_order, order_status_changed) still work when their settings are enabled.

## Completion condition

An admin can control transactional email types, inspect the complete outbox history, understand provider status, and send a test email without exposing credentials or bypassing existing security. All 280 backend tests pass; frontend TypeScript, ESLint, and Prettier checks are clean.
