## Done

### Backend
- **Products:** `GET /products` (paginated, active only), `GET /products/:slug`
- **Database:** Products + orders migrations; `synchronize: false`; TypeORM data source + migration scripts
- **Orders:** `POST /orders` — guest checkout, UUID `orderReference`, DB prices only, stock lock + conditional decrement, snapshots on line items, `pending` / `unpaid`
- **Orders:** `GET /orders/:orderReference` — public summary only (no email/address/internal id)
- **Shared API:** Response envelope interceptor, global exception filter, `class-validator` on create order
- **Small fixes:** Trim/reject blank `customerName`; quantity limits (incl. merged lines); order entity `@Check` for statuses aligned with migration

### Frontend
- **App shell:** Layout, `/` → `/products`, Geist fonts
- **Catalogue:** `/products` — list, loading skeleton, API error state, cards link to detail
- **Product detail:** `/products/[slug]` — `fetchProduct`, loading, 404/API errors, image or placeholder, **Add to cart** button (placeholder only)
- **API client:** `fetchProducts`, `fetchProduct`, shared `ApiError` handling
- **Fonts:** Everything under `frontend/src/assets/fonts/`; `src/lib/fonts.ts` + `font-*` classes in `globals.css` (documented in `fontuse.md`)

### Verified (in past sessions)
- Product list/404 on API; order create + stock decrement; order GET; validation cases for name/quantity; product detail route was implemented (you stopped dev servers, so **you** may not have clicked through the UI lately)

---

## Not done (yet)

### Customer journey (from your plan)
| Step | Status |
|------|--------|
| Product list | Done |
| Product detail | Done (UI) |
| **Cart** (state, add/remove, totals) | Not started |
| **Checkout** form → `POST /orders` | Not started |
| **Thank-you** page → `GET /orders/:orderReference` | Not started |

### Frontend polish
- UI uses CSS modules + global `font-*` classes; Tailwind v4 is installed and wired in `globals.css` / `tailwind.config.js` but is not used for layout
- No checkout/order API helpers in `api.ts` (`createOrder`, `fetchOrder`)
- Add to cart does not persist anything
- Full visual redesign of catalogue/landing (intentionally deferred)
- You have not fully tried custom fonts in the UI (wired, not applied to components)

### Backend / production
- No payment integration
- No email/notifications
- No rate limiting on `POST /orders`
- No CORS config (needed when checkout runs from the browser)
- Little/no automated tests for orders (Vitest/Jest both in backend `package.json`)
- Order entity duplicate `@Column` + `@JoinColumn` on `order_id` / `product_id` was flagged in an audit as a possible TypeORM metadata issue — migrations/API worked in practice; not “fixed” as a separate task

### Ops / repo
- Next.js dev hit a **security upgrade** prompt (16.4.0); upgrade not applied
- Commit/push: you staged a large commit earlier; current git state not re-checked here
- No deployment/CI story in scope

### Google Login – Remaining Setup & Verification

**A. Google OAuth configuration**

1. Create or obtain a Google OAuth 2.0 Web Client ID in Google Cloud Console.
2. Add `http://localhost:3000` as an authorized JavaScript origin.
3. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `frontend/.env.local`.
4. Set the same `GOOGLE_CLIENT_ID` in `backend/.env`.
5. Configure `SESSION_SECRET` in `backend/.env` with a secure random secret.
6. Verify `FRONTEND_ORIGIN=http://localhost:3000` in `backend/.env`.
7. Verify `NEXT_PUBLIC_API_URL` points to the backend URL.
8. Restart both development servers.

**B. Google sign-in verification**

1. Open `http://localhost:3000/sign-in`.
2. Confirm the Google sign-in button renders.
3. Complete Google sign-in.
4. Confirm the user is redirected to `/products`.
5. Confirm the customer's display name appears in the header.
6. Refresh the page and verify the session persists.
7. Navigate between product pages and verify the header remains correct.

**C. Logout UI – implementation still pending**

1. Add a Log out control to the authenticated header.
2. Reuse the existing `POST /auth/logout` backend endpoint.
3. Fetch a CSRF token using the existing `/auth/csrf` endpoint.
4. Send the CSRF token in the `X-CSRF-Token` header with credentials included.
5. On successful logout, clear the local customer state.
6. Keep the user on the current page.
7. Verify the header displays Sign in afterward.

**D. Logout verification**

1. Sign in with Google.
2. Click Log out.
3. Confirm the header returns to Sign in.
4. Refresh the page and confirm the session remains signed out.

---

**Short version:** Backend guest order **create + lookup** is in place. Frontend stops at **browse + product page**. **Cart → checkout → confirmation** and **payments/email/hardening** are still ahead.

---

## openCodeGo Deepseek v4.1 flash changes

Structure pass only — no new features.

### Backend
- Moved `auth/request-with-customer.ts` → `auth/types/request-with-customer.ts`
- Renamed `carts/dto/cart-response.ts` → `carts/dto/cart-response.dto.ts`
- Extracted `CartCookieAction` → `carts/types/cart-cookie-action.ts`
- Added `products/dto/list-products-query.dto.ts`; `GET /products` now validates `page` / `limit` through the DTO instead of inline pipes
- Deleted unused `newsletter/dto/update-newsletter.dto.ts`

### Frontend
- `app/` is now routes-only: moved `AccountFrame`, `ProfilePanel`, `OrdersView`, `ProcessStage` into `src/components/`
- Moved their styles too: `components/account.module.css`, `components/OrdersView.module.css`, `components/ProcessStage.module.css`
- Added `app/error.tsx` (Next.js 16 `retry` prop); restored `app/not-found.tsx` (tracked file was missing on disk)
- Added shared `components/StatusScreen.tsx` for the error layout

### Docs
- Corrected the stale "No Tailwind" note (Tailwind v4 is installed and configured)

---

## openCodeGo Deepseek v4.1 flash changes — Phase 1, Task 1: real shopping cart

Connected the customer-facing cart to the existing backend cart APIs. No backend changes.

### Frontend (new)
- `src/lib/api/cart.ts`: typed cart API helpers (`getCart`, `getCartCount`, `initializeCart`, `addCartItem`, `updateCartItem`, `removeCartItem`, `clearCart`) over the existing `lib/api/client.ts` `request()`
- `src/lib/cart/CartProvider.tsx`: React Context provider (no new state library — none existed) mounted in `app/layout.tsx`; holds the cart as single source of truth, derives the header count from it, guards against duplicate submissions (`pendingAction`), validates quantities client-side, exposes `refresh()`
- `src/components/CartView.tsx` + `CartView.module.css`: cart page UI — image, name, unit price with strikethrough on `priceChanged`, qty stepper (bounded by backend `stockQuantity`), line total, Remove, Clear bag, subtotal/total from backend only, empty/loading/error (+ Try again)/notice states, backend `attentionMessage` warnings
- `src/components/AddToCartButton.tsx` + `.module.css`: add-to-cart with quantity stepper and out-of-stock handling on the product page

### Frontend (modified)
- `src/components/SiteHeader.tsx`: hardcoded `Cart (₹0)` replaced with the live count from context
- `src/app/layout.tsx`: wraps the app in `CartProvider`
- `src/app/cart/page.tsx`: thin server wrapper rendering `<CartView />` (styles moved to `components/CartView.module.css`)
- `src/app/products/[slug]/page.tsx`: renders `<AddToCartButton productId={...} stockQuantity={...} />`
- `src/lib/api/product-format.ts` (new, client-safe) + `src/lib/api/catalogue.ts`: extracted pure format helpers (`formatInr`, `inrAmount`, `productImageUrl`, `productPath`) out of the server-only catalogue module (it imports `next/cache`); `CatalogueProduct` now includes `id` (needed by cart APIs)
- `src/components/AccountFrame.tsx`: cart `refresh()` after logout so the header count follows the owner change

### Notes
- All cart totals/warnings come from the backend (`unitPrice`, `seenUnitPrice`, `priceChanged`, `lineTotal`, `subtotal`, `requiresAttention`, `attentionMessage`); no client-side price math
- CSRF via the existing same-origin `/api` proxy + `lib/api/client.ts` double-submit handling, unchanged
- Guest cart persists through the existing httpOnly `gp_guest_cart` cookie (verified across full page reloads)

---

## openCodeGo Deepseek v4.1 flash changes — Phase 1, Task 2: guest-first checkout

Cart-backed checkout. Line items come only from the caller's cart; prices, stock and totals are resolved from the database inside one transaction. Guests do not need an account or Google sign-in.

### Backend (new)
- `src/migrations/1792900000000-AddCheckoutFieldsToOrders.ts`: `orders.customer_id` (FK `customers`, ON DELETE SET NULL), `recipient_name`, `gift_message`, `subtotal_amount` (backfilled from `total_amount`, then NOT NULL), `shipping_amount`, `idempotency_key` (unique), `confirmation_token_hash`; checks `subtotal >= 0`, `shipping >= 0`, `subtotal + shipping = total`; index on `customer_id`. No new tables: recipient/address/gift are one-per-order snapshots, so columns are enough.
- `src/orders/dto/create-checkout.dto.ts` — validated checkout payload (trimmed strings, optional recipient/gift/idempotency key).
- `src/orders/dto/checkout-response.dto.ts` — checkout and confirmation response contracts.
- `src/orders/utils/shipping.ts` — single server-side shipping policy: ₹49 flat below ₹499, free at/above, ₹0 for an empty cart.
- `src/orders/utils/order-confirmation-token.ts` — 32-byte random token; only its SHA-256 hash is stored.
- Specs: `src/orders/utils/shipping.spec.ts`, `src/orders/utils/order-confirmation-token.spec.ts`, `src/orders/orders.service.spec.ts`.

### Backend (modified)
- `src/orders/orders.service.ts`: new `createCheckoutOrder()` (cart load + row locks, active/stock revalidation, DB prices, stock reservation via conditional `UPDATE ... stock_quantity >= :quantity`, snapshot `order_items`, totals and shipping server-side, customer association, cart clear in the same transaction, idempotency fast-path + in-transaction re-check + unique-violation fallback) and `findOrderConfirmation()` (reference + token hash). Legacy `createGuestOrder()` untouched except for the new subtotal/shipping columns.
- `src/orders/orders.controller.ts`: `POST /orders/checkout` (CSRF-guarded, clears the guest cart cookie on success) and `GET /orders/:orderReference/confirmation?token=…`. Public `GET /orders/:orderReference` unchanged.
- `src/orders/orders.module.ts`: imports `CartsModule`.
- `src/orders/entities/order.entity.ts`: new columns, relation and matching checks.
- `src/orders/utils/money.ts`: added `compareMoney`.
- `src/carts/carts.service.ts`: `loadCheckoutCart()` / `clearCheckoutCart()` reuse `resolveOwner()` + cart row locking; cart responses now include backend `shipping` and `total`.
- `src/carts/dto/cart-response.dto.ts`: `CartResponse` gains `shipping` and `total`.

### Frontend (new)
- `src/app/checkout/page.tsx` (noindex) and `src/app/orders/[reference]/page.tsx` (`instant = false`; reads `reference` + `token` from `params`/`searchParams`).
- `src/lib/api/orders.ts` — typed `createCheckoutOrder()` / `getOrderConfirmation()`.
- `src/components/CheckoutView.tsx` + `CheckoutView.module.css` — customer, recipient, delivery/pincode, gift message, order summary, shipping, submit; inline validation, loading/submitting/error states, empty-cart recovery, blocked/price-change notices, signed-in prefill from `GET /auth/me`, one idempotency key per attempt.
- `src/components/OrderConfirmation.tsx` + `OrderConfirmation.module.css` — reference, items and quantities, customer, delivery, gift message, subtotal/shipping/total, order and payment status, invalid-token state.

### Frontend (modified)
- `src/lib/api/cart.ts`: `Cart` gains `shipping`/`total`.
- `src/components/CartView.tsx` + `.module.css`: backend shipping/total, Checkout action, Continue shopping link.

### Behaviour and decisions
- Transaction: cart lock → product locks → validate active/stock → decrement stock → insert order + items → clear cart. Any failure rolls everything back.
- Payments are not integrated, so stock is reserved at order creation and every order is `pending`/`unpaid`; cancelling an unpaid order must restore stock in a later task.
- Idempotency: client sends a UUID; the unique key makes retries return the original order without a second reservation. A retry issues a fresh confirmation token (the lost response had the old one).
- Confirmation links are bearer links: full order data is only returned when the reference and token hash match.

### Verification
- Backend `npx tsc --noEmit`; `npx vitest run` → 7 files / 26 tests.
- Frontend `npx tsc --noEmit`; `npm run build` → 20 routes, `/orders/[reference]` partial prerender.
- Browser (dev DB): guest checkout ₹4.50 + ₹49 shipping = ₹53.50; confirmation reload with token; wrong/missing token → not found; cart cleared and header count 0; `/checkout` empty state; empty cart rejected by the API; invalid email/pincode blocked client-side; out-of-stock rejected by the API and disabled in the UI; changed price accepted at the new DB price; idempotent replay returned the same reference with no extra order; signed-in customer order stored `customer_id`; backend stopped → friendly "could not reach the server" error with the form preserved; temporary DB trigger on `orders` proved rollback (stock, cart and orders unchanged).









<!-- TO BE VERIFIED -->

Done. Guest-first checkout is implemented end to end and verified against the dev database.

## 1. Files created

**Backend**
- `backend/src/migrations/1792900000000-AddCheckoutFieldsToOrders.ts`
- `backend/src/orders/dto/create-checkout.dto.ts`
- `backend/src/orders/dto/checkout-response.dto.ts`
- `backend/src/orders/utils/shipping.ts` + `shipping.spec.ts`
- `backend/src/orders/utils/order-confirmation-token.ts` + `order-confirmation-token.spec.ts`
- `backend/src/orders/orders.service.spec.ts`

**Frontend**
- `frontend/src/app/checkout/page.tsx`
- `frontend/src/app/orders/[reference]/page.tsx`
- `frontend/src/lib/api/orders.ts`
- `frontend/src/components/CheckoutView.tsx` + `CheckoutView.module.css`
- `frontend/src/components/OrderConfirmation.tsx` + `OrderConfirmation.module.css`

## 2. Files modified
- Backend: `orders/orders.service.ts`, `orders/orders.controller.ts`, `orders/orders.module.ts`, `orders/entities/order.entity.ts`, `orders/utils/money.ts` (added `compareMoney`), `carts/carts.service.ts`, `carts/dto/cart-response.dto.ts`
- Frontend: `lib/api/cart.ts`, `components/CartView.tsx`, `components/CartView.module.css`
- Docs: `docs/tasks.md` (Task 2 change log)

## 3. Database migration
`AddCheckoutFieldsToOrders1792900000000` (applied to `gifting_dev`):
- `orders.customer_id` — FK to `customers`, `ON DELETE SET NULL` + index
- `orders.recipient_name`, `orders.gift_message`
- `orders.subtotal_amount` (backfilled from `total_amount`, then NOT NULL), `orders.shipping_amount`
- `orders.idempotency_key` (unique), `orders.confirmation_token_hash`
- Checks: subtotal ≥ 0, shipping ≥ 0, `subtotal + shipping = total`

No new tables. Recipient, address, gift message and amounts are one-per-order snapshots, so columns model them directly. Orders stay the single source of truth for purchase data.

## 4. API changes
- **New** `POST /orders/checkout` (CSRF-guarded). Accepts customer/recipient/delivery/gift/idempotency fields only — no product IDs, prices or totals. Resolves the caller's cart, revalidates active/stock, prices from the DB, snapshots items, computes subtotal + shipping + total, associates the signed-in customer when present, clears the cart in the same transaction, and returns the order plus a one-time confirmation token. Guest cart cookie is cleared on success.
- **New** `GET /orders/:orderReference/confirmation?token=…` — returns full details only when the token hashes to the stored value; otherwise 404.
- **Changed (additive)** cart responses now include backend `shipping` and `total`.
- Legacy `POST /orders` and `GET /orders/:reference` are unchanged (the public lookup still exposes only reference/status/totals/items — no email, address or gift message).

## 5. Architectural decisions
- **Cart as the only line-item source.** The frontend never sends products, prices or totals; the existing `POST /orders` (which trusts client line items) is deliberately not used by the cart.
- **One transaction:** cart row lock → product row locks → validation → conditional stock decrement (`UPDATE … WHERE stock_quantity >= :quantity`) → order + item inserts → cart clear. Any failure rolls back everything.
- **Shipping policy in one place** (`orders/utils/shipping.ts`): ₹0 empty, ₹49 below ₹499, free at/above — used by cart, checkout and orders.
- **Stock reserved at order creation** because payments are not integrated; all orders are `pending`/`unpaid`. Restoring stock on cancellation is a follow-up requirement.
- **Duplicate-safe checkout:** client-generated idempotency key with a unique constraint, fast path + in-transaction re-check + unique-violation (`23505`) fallback returning the original order. A replay issues a fresh confirmation token.
- **Guest confirmation without accounts:** 32-byte bearer token, only its SHA-256 hash stored, so a database read cannot reconstruct links. No dependence on `SESSION_SECRET` (unset in this environment).
- **No new dependencies.**

## 6. Tests performed
- Backend: `npx tsc --noEmit` clean; `npx vitest run` → **7 files / 26 tests passed** (shipping thresholds, token hashing, DB-price totals, customer association, empty cart, out-of-stock, inactive product, conditional-update failure, idempotent replay, confirmation token match/mismatch/missing).
- Frontend: `npx tsc --noEmit` clean; `npm run build` succeeds (20 routes; `/orders/[reference]` partial prerender with `instant = false` so the token query is read per request).

## 7. Browser verification (real dev DB)
- Guest checkout: item ₹4.50 + ₹49 shipping = ₹53.50, order created, confirmation rendered with real response data.
- Confirmation survives reload with the token; wrong or missing token → "Order not found".
- Cart cleared after success (header 0, `/checkout` shows the empty-bag recovery state).
- Empty cart rejected by the API (`400 Your cart is empty.`).
- Invalid email/pincode blocked client-side with inline errors and zero API calls.
- Out-of-stock: UI disables submission and the API rejects with `400 "…" is out of stock` while nothing is created.
- Price change: cart updated to the new DB price and the order stored ₹15.00 (not the seen ₹12.00), with the price-change note shown.
- Idempotent replay returned the same reference/total with no extra order or stock change.
- Signed-in path (temporary DB-created session): cart loaded for the customer, order stored `customer_id`, cart cleared, session cookie untouched.
- Backend stopped mid-form → friendly "We could not reach the server…" error, form preserved, no order.
- Rollback proven with a temporary trigger on `orders` (since removed): failed insert left stock, cart items and order counts unchanged.
- Test orders, carts and the temporary customer/session were removed and seed products restored (`4.50`/stock 5, `12.00`/stock 3). Dev servers stopped; temp scripts deleted.

## 8. Remaining limitations
- No payments: every order is `pending`/`unpaid`, and stock is reserved immediately. Cancelling an unpaid order does not yet restore stock (follow-up task).
- Confirmation links rotate on a retried checkout request; a client that already displayed the older link would need the newest token. The UI serializes submissions, so this only affects a genuine lost-response retry.
- Pincode validation is format-level only (`A-Za-z0-9`, 2–20 chars); no serviceability or address autocomplete.
- Confirmation token is carried in the URL query string, so it can appear in browser history; it is single-order scoped but long-lived until rotated.
- No order history for guests or customers on the account pages yet.
- Responsive rules exist for ≤980px and ≤640px, but browser verification was done at desktop width only (the browser tool has no viewport override).
- `docs/tasks.md` still contains pre-existing mojibake from an earlier session; left untouched to avoid unrelated churn.

---

## openCodeGo Deepseek v4.1 flash changes — Phase 1, Task 3: order lifecycle, history and admin management

Fulfilment and payment lifecycles, safe cancellation with one-time stock restoration, customer order history and a studio admin area. No payment provider is connected and no path marks an order paid from browser input.

### Backend (new)
- `src/migrations/1793000000000-OrderLifecycle.ts` — `customers.role` (`customer`/`admin`, default `customer`); `orders.paid_at`, `cancelled_at`, `stock_restored_at`, `payment_reference`; expanded order/payment status checks; `order_status_history` table (category `fulfilment`/`payment`, from/to status, note, actor type/id, timestamps, FK cascade, `(order_id, created_at, id)` index); backfills a system history row for every existing order.
- `src/orders/entities/order-status-history.entity.ts` — audit rows used by the customer and admin timelines.
- `src/orders/utils/order-lifecycle.ts` (+ spec) — single transition table and cancellation policy (`customerCanCancelOrder`, `adminCanCancelOrder`, `allowedTransitionsFor`), plus transition validation that rejects unknown, identical and backward moves.
- `src/orders/order-management.service.ts` (+ spec) — customer list/detail/cancel, admin list/stats/detail/status/cancel, transaction + `pessimistic_write` order lock, one-time restock via `stock_restored_at`, history recording, and `applyVerifiedPaymentEvent`.
- `src/orders/admin-orders.controller.ts` — `/admin/orders` list, `stats`, detail, `PATCH :ref/status`, `POST :ref/cancel`; `AdminGuard` at controller level, `CsrfGuard` on writes.
- `src/auth/guards/admin.guard.ts` (+ spec) — layers on `SessionGuard`; 401 unauthenticated, 403 non-admin.
- `src/orders/dto/cancel-order.dto.ts`, `list-orders-query.dto.ts` (customer + admin variants), `update-order-status.dto.ts`, `order-management-response.dto.ts`.
- `src/orders/payments/payment-gateway.ts` (+ barrel) — `PaymentGateway` interface, `PAYMENT_GATEWAY` token, `UnconfiguredPaymentGateway` that throws 503.

### Backend (modified)
- `src/auth/auth.module.ts`, `auth.service.ts`, `config/auth-configuration.ts` — `role` in `/auth/me`; optional `ADMIN_EMAILS` promotion at Google sign-in; no second auth system.
- `src/customers/entities/customer.entity.ts` — `role` column, documented as an extension of session identity.
- `src/orders/entities/order.entity.ts` — lifecycle columns, history relation, expanded status checks.
- `src/orders/orders.controller.ts` — customer routes `GET /orders/mine`, `GET /orders/mine/:ref`, `POST /orders/mine/:ref/cancel`, declared before the parameterised public routes; checkout and confirmation behaviour unchanged.
- `src/orders/orders.module.ts`, `src/data-source.ts` — new entity/service/controller registration.
- `src/orders/orders.service.ts` + spec — checkout untouched; spec extended to cover the new entity shape.

### Frontend (new)
- `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/admin/orders/page.tsx`, `src/app/admin/orders/[reference]/page.tsx`.
- `src/app/account/orders/[reference]/page.tsx` (`instant = false`).
- `src/components/AdminFrame.tsx` + `admin.module.css` — studio shell: cream sidebar, access gate (sign in / studio only / error), role-aware profile block; storefront `SiteHeader` hidden under `/admin`.
- `src/components/AdminOverview.tsx` — real stat cards (total, pending, in fulfilment, delivered, paid revenue, unpaid) with progress bars and five recent orders. No fabricated sparklines.
- `src/components/AdminOrdersView.tsx` — tracker table with status chips, payment filter, debounced search (reference/customer/email/recipient), pagination, empty/error states.
- `src/components/AdminOrderDetail.tsx` — items, totals, customer/recipient/gift, history timeline, payment and stock-restoration metadata, forward-only status form, cancellation with optional reason and refund-due warning.
- `src/components/CustomerOrderDetail.tsx` + `.module.css` — customer detail, badges, delivery, totals, timeline, cancel panel with reason and duplicate-safe error handling.
- `src/components/orders/OrderBadges.tsx`, `OrderTimeline.tsx` + CSS modules — shared status pills and history rendering.
- `src/lib/orders/format.ts` — money/date/shipping labels, status tones, initials, notes, type guards.
- `src/components/OrdersView.tsx` rewritten (real API, filter chips, pagination, skeletons, empty/error states); `.module.css` rewritten.
- `src/components/OrderConfirmation.tsx` + CSS rewritten as a ticket-style receipt (rounded card, dashed perforations, notches, metadata, drawn barcode); handles cancelled orders and keeps working without a session.

### Frontend (modified)
- `src/lib/api/orders.ts` — full customer/admin types and calls (`listMyOrders`, `getMyOrder`, `cancelMyOrder`, `listAdminOrders`, `getAdminOrderStats`, `getAdminOrder`, `updateAdminOrderStatus`, `cancelAdminOrder`), shared order/payment status constants.
- `src/components/SiteHeader.tsx` — no storefront header on `/admin` or `/admin/*`.

### Lifecycle rules
- Fulfilment is forward-only: `pending → confirmed → processing → shipped → delivered`; `pending`/`confirmed`/`processing → cancelled`; `delivered` and `cancelled` are terminal. Same-status and backward moves are `400`.
- Payment status is separate: `unpaid`, `pending`, `paid`, `failed`, `refunded`. No route accepts payment status from the client.
- Customer cancellation allowed only when payment is `unpaid` and status is `pending` or `confirmed`.
- Admin cancellation allowed for `pending`/`confirmed`/`processing` regardless of payment. A paid order stays `paid`; the response and UI surface `refundDue: true` instead of fabricating a refund.

### Inventory behaviour
- Cancellation runs in a transaction that locks the order row (`pessimistic_write`), so concurrent cancels serialize.
- Stock is restored once, guarded by `orders.stock_restored_at`; a duplicate cancellation returns `400` without touching inventory or history.
- Restock uses quantity increments on each snapshot line; deleted products (`product_id` null) are skipped.
- No reservation-expiry mechanism was invented; stock stays reserved until cancellation.

### Security
- Admin access reuses the existing session (`customers.role` + `AdminGuard`); no second login. Promotion: `ADMIN_EMAILS` at Google sign-in, or manual SQL.
- All writes require CSRF double-submit plus the configured `Origin`; customer reads and writes are scoped by `customer_id` (foreign references return `404`).
- Guest confirmation links continue to use the reference + token hash and are unaffected by sign-in or cancellation.

### Payment abstraction
- `PaymentGateway` + `PAYMENT_GATEWAY` is the future Razorpay boundary. `UnconfiguredPaymentGateway` fails closed with `503`.
- The only internal marker is `applyVerifiedPaymentEvent`, which requires `verified: true`, `INR`, a matching amount and a provider reference. No HTTP route marks an order paid.

### Verification
- Backend `npx tsc --noEmit -p tsconfig.json` clean; `npx vitest run` → **10 files / 52 tests passed** (transition table, cancellation policy, admin guard, order management).
- Frontend `npx tsc --noEmit` clean; `npm run build` → **24 routes**, new admin/account routes compiled. Targeted ESLint on all new/touched files is clean; repo-wide lint still reports only pre-existing issues (`SiteHeader` placeholder social anchors, `CartProvider` set-state-in-effect).
- Migration applied to `gifting_dev`; real API verification (80/80 checks on temporary fixture data) covered auth/roles, admin gating, ownership 404s, pagination/filters/search, guest confirmation regression, transition validation, CSRF/origin rejection, customer/admin cancellation, refundDue, duplicate cancellation, concurrent cancellation (one success, one `400`), stock restored exactly once and no duplicate history.
- Browser verification (in-app browser, dev DB; screenshots unavailable because the desktop window is not visible — checks done via snapshots/evaluate): unauthenticated `/admin` → "Sign in required"; customer role → "Studio access only"; admin → overview with correct counts/revenue/recent rows; `/admin/orders` 12 of 14 with page 2, status chip, search (`guest` → 1) and payment filter (`paid` → 3); admin detail showed correct customer/recipient/items/totals/history and allowed transition; UI status update `1002 confirmed → processing` with note; admin cancellations of `1010`/`1011` succeeded with stock-restored notice and recorded reason; customer `/account/orders` showed 8 cards / 12 total / pagination and correct badges; customer detail `/account/orders/AAP-T3-1001` cancelled with reason → notice, cancelled badge, timeline entry and cancel section removal; guest ticket `/orders/AAP-T3-1001?token=…` still rendered (cancelled heading, reference, barcode).
- Temporary verification fixtures, scripts and the cookie route were removed; dev DB cleaned (14 fixture orders, 3 customers, 3 products) and both dev servers stopped.

### Remaining limitations
- No real payment provider, refunds, emails or notifications; `refunded` exists in the schema but nothing sets it.
- No admin UI for payment status changes or customer management; role promotion is env/SQL only.
- Stock restoration does not create a ledger row beyond `stock_restored_at` and the history entry.
- Dashboard figures are live counts, not time-series analytics.
- Responsive rules exist, but browser verification was desktop-width only.