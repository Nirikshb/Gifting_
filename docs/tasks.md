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
