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
- No Tailwind (only CSS modules + global `font-*` classes)
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