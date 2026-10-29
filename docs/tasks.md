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

---

**Short version:** Backend guest order **create + lookup** is in place. Frontend stops at **browse + product page**. **Cart → checkout → confirmation** and **payments/email/hardening** are still ahead.