# Aapulki Hamper Builder PRS — Review Response

**Responding to:** *Aapulki — Create Your Own Hamper (Product Requirements Specification)*
**Mode:** Reply only — no code written, no files changed in the product codebase.
**Basis:** Repository audit of the current Aapulki codebase (Next.js App Router frontend, NestJS + TypeORM/PostgreSQL backend), plus the existing Task 1–5 order-management work.

This response is kept **section-by-section, in the order the PRS asks**, ending with the mandatory constraint check (§18) and acceptance-criteria review (§19).

---

## §1 Product objective

**Agreed, with one scoping caution.** The objective is achievable, and the PRS is correct that this must be a new, independent journey that leaves existing shopping/checkout untouched.

Caution: this PRS is genuinely large — supplier procurement, packaging physics compatibility, layered preview, budgeting, drafts, sharing, admin approval workflows and SEO pages together are closer to a second product than a feature. The objective stands, but §17's phase split must be treated as a hard contract, not a suggestion.

---

## §2 Customer discovery

- **2.1 Eight recipient types:** Straightforward — a new `recipient_type` table (or enum + admin-managed table). Reuses existing admin CRUD patterns. ✅ Feasible.
- **2.2 Relationships:** Needs a `relationship` table with a FK to recipient type. "Dynamically managed through the admin panel" means new admin screens — the current admin shell only has Overview / Orders / Products (`frontend/src/components/AdminFrame.tsx`), so this is net-new admin UI. ✅ Feasible.
- **2.3 Occasions:** Same pattern as relationships, plus associations to products/recipients — a join table. Note the PRS says occasions are associated with products; the current `products` entity has no such association fields. Net-new.
- **2.4 Discovery questions:** Optional, skippable, non-blocking — correctly specified so it never gates the catalogue. Keep answers as loose JSON on the draft rather than a rigid schema; low risk.

**Open question for you:** are the eight recipient types *fixed forever* (§2.1 says "permanent") or admin-editable? §2.2–2.3 say relationships/occasions are dynamic, but 2.1 reads as hardcoded. Recommend: stored as data anyway, seeded with exactly these eight, so the UI is generic even if the set never changes.

---

## §3 Seasonal collections

Feasible: a `collection` table with schedule windows, banner fields, join tables for products/packaging/recipients/occasions, plus SEO metadata fields.

**Two flags:**

1. **Hybrid merchandising model** ("admin selects featured, system suggests, admin approves") requires a recommendation engine that does not exist. The current products API is pagination-only (`products.controller.ts` — `findAll(page, limit)`; no filtering, no search, no scoring). The "system suggests" half is net-new and should be deferred or reduced to simple rule-based suggestions (same category / same recipient type) in Phase 1.
2. Scheduled publish/expiry is easy (dates on a table) but must be enforced server-side in every public query, not just hidden in the UI.

---

## §4 Product catalogue and sourcing

- **4.1 Catalogue model:** The seven separated concepts (catalogue product / source records / inventory / procurement / reference price / selling price / cost) are correctly separated and are the right data model. This is the single biggest net-new domain in the PRS — the current `product` entity has none of supplier, source, procurement, or reference-price fields. Expect several new tables: `supplier`, `product_source`, `procurement_record`.
- **4.2 Categories:** Seed data + admin CRUD. "Food must be packaged, not fresh" is a validation rule — cheap to enforce at the entity level.
- **4.3 Filters:** Correctly scoped ("only relevant filters per category"). But note: **the products list API currently supports no filters at all** — every filter (category, price, recipient, occasion, dietary, dimensions) is net-new backend work.
- **4.4 Presentation:** Editorial/compact toggle is pure frontend. Undo-on-remove is a small state-management nicety — fine. Variant/personalisation detail panels are moderate frontend work.
- **4.5 Search:** **Flag — the PRS's own §18 constraint requires accuracy here.** The repo has **no search infrastructure**: no keyword search in the backend, no search param on `/shop` (only `page`), no search page. So "search should use catalogue search as its reliable foundation" means **building catalogue search from scratch** (Postgres full-text or trigram is enough; no new dependency needed). Intent-based natural-language search ("gifts under ₹500 for someone who loves coffee") is explicitly an enhancement — recommend **deferred to Phase 2**, since the PRS already says AI is not a dependency. This is the most underestimated item in §4.
- **4.6 Recommendations:** Depends on §3's suggestion engine — same deferral advice: simple rules first.
- **4.7 Product associations:** Correct design — one product, many join tables, presentation overrides stored on the join not the product. ✅
- **4.8 Predefined bundles:** Feasible. The pricing rule (sum by default, fixed price optional) and "each unit counts toward the 3-unit minimum" are clear and testable. Bundle-as-group-add reuses the normal item model — no separate cart type needed for bundles themselves.

---

## §5 Product pricing and supplier rules

This section is the most operationally ambitious part of the PRS.

- **5.1 Price fields:** Three separate fields + "selling price must not be lower than reference price" — a simple CHECK constraint. ✅
- **5.2 Source price decreases:** Retain selling price — trivial (do nothing automatically). ✅
- **5.3 Source price increases:** Disable + flag for admin review, never silently change customer price — this is a **background job comparing recorded reference price against current source price**. Feasible, but only once supplier price feeds exist (see 5.6).
- **5.4 Supplier unavailability:** Exact-match source switching (brand/model/size/variant) is a real lookup problem. Correctly specified: **never silently substitute**. Requires the source table from 4.1 to carry structured variant attributes, not free text.
- **5.5 Procurement cost tolerance:** Admin-configurable tolerance (₹/% / per-category) + exception flagging. Feasible as an admin-config table. The hard rule — "never charge the customer extra without explicit approval" — should be enforced at the pricing service, not just policy.
- **5.6 Supplier integration:** Correctly staged — **manual entry first, APIs later**. Also correctly flags image/content licensing. This is the right call; do not build API feeds in Phase 1.

**Reality check:** §5 as a whole only becomes operable once §4.1's source tables exist. In Phase 1, 5.1–5.2 are implementable immediately; 5.3–5.5 can be built as admin-facing flags/workflows driven by **manually entered** source prices; 5.6 APIs are post-launch.

---

## §6 Hamper builder experience

- **6.1 Journey / 6.2 Navigation:** The 9-step journey is sound. "Hybrid guided with revisit" means wizard state must live in a resumable draft object (see §12) — this is the architectural linchpin: **the draft configuration is the source of truth, and every step reads/writes it.**
- **6.3 Three-unit minimum:** Simple, correctly specified (packaging excluded, multiples count, show remaining, disable Continue). Backend must re-validate — frontend disable is not enforcement. ✅ Easy.
- **6.4 Layered preview:** Correctly scoped as layered 2D, **not 3D**. "Automatic arrangement + optional manual positioning + reset" is the risky part — manual drag/rotate with physical compatibility rules re-asserted afterward is significant frontend work. **Recommendation: Phase 1 = automatic arrangement only + open/closed toggle; manual positioning → Phase 2.** The PRS's own priority list doesn't require manual positioning to launch.
- **6.5 Budget:** The warning choreography ("once, then one more update if the amount changes, then hide") is unusually precise — implement as a small state machine, trivial. Budget-not-a-blocker is correct. ✅
- **6.6 Multiple hampers:** Each hamper = one grouped cart line with its own nested configuration. Feasible, but it touches cart/checkout — the PRS also says "do not change existing shopping flows." **Key risk:** the current cart/checkout expects simple line items; grouped hamper items need a line-item type discriminator so the existing flow renders them without breaking plain products. This must be designed first (see §11).

---

## §7 Packaging

- **7.1 Two discovery paths:** Same catalogue, selection-preserving switch — fine.
- **7.2 Category set:** Fine as seed data.
- **7.3 Packaging compatibility:** This is a **real calculation engine**: product dimensions × usable internal clearance × weight limit × fragility × stacking. The hard/soft rule split (critical = block, soft = warn) is correct. Feasible only if **both products and packaging carry dimensions/weight in the DB** — which they currently do not. Data entry for dimensions becomes a prerequisite for this feature; compatibility cannot ship before the data exists.
- **7.4 Customisation:** Per-box option flags + cost/delivery impact fields. Feasible; moderate admin UI.
- **7.5 Packaging availability:** Mirrors §5.4 — preserve selection, exact-source match, admin approval, customer approval for substitutions. Consistent. ✅

---

## §8 Personalisation and gifting experience

Feasible. Card message / recipient name / sender name are simple fields on the hamper config. Premium options (engraving, printed photos) are per-product option flags with cost + lead-time impact — same mechanism as §7.4.

**8.1 Price hiding:** Correctly specified — prices hidden on physical packaging/paperwork by default, purchaser still gets digital confirmation/invoice. Note this interacts with the email templates (the purchaser's email must always show prices regardless of the gift-facing setting).

---

## §9 Pricing breakdown, tax and promotions

**This section contains two statements that are factually wrong about this repository, and §18 requires I flag them:**

- **§9.3 "Reuse existing tax and invoice infrastructure where possible"** — **there is no tax or invoice infrastructure in this repo.** Audit: zero matches for `tax|invoice|gst` across `backend/src`.
- **§9.4 "Reuse existing coupon infrastructure"** — **there is no coupon infrastructure.** Audit: zero matches for `coupon|discount|voucher` across `backend/src`.

So §9.3 and §9.4 are **net-new builds**, not reuse. Corrected scope:

1. **Assembly fee (§9.1):** New admin-configurable pricing rule (fixed/% / free-above-threshold / per-packaging overrides). Moderate, self-contained. ✅
2. **Shipping (§9.2):** Hybrid weight/dimension/location calculation — depends on §7's dimension data. Can start simplified (flat + free-above-threshold + pincode serviceability) and refine. **Do not promise courier-rate accuracy in Phase 1.**
3. **Taxes (§9.3):** No existing infrastructure → Phase 1 needs a minimal, honest version: admin-configured tax classification + rate, applied backend-side, shown as a line item. Full tax-engine complexity (GST slabs, place-of-supply, HSN codes) should be scoped explicitly before build — **this is an open question for you** (see below).
4. **Discounts (§9.4):** No existing infrastructure → Phase 1 minimal version: a single promo with validity + eligibility, **no stacking rules**. Stacking (priority, max-discount, exclusions) is Phase 2.

The PRS is right about the core principle regardless: **backend is the pricing source of truth; frontend totals are indicative.** ✅

**Open questions for you:**
- What tax regime applies (GST-inclusive pricing? GST extra? Which slabs?)? This changes the entire price-display design.
- Is invoicing required at launch, or is the order confirmation sufficient for Phase 1?

---

## §10 Delivery and fulfilment

- **10.1 Delivery estimates:** Correctly hedged — "only show feasible options," "do not guarantee a date before operational confirmation." Given procurement lead time exists (Aapulki sources items), estimates must be computed from **procurement lead time + assembly time + courier time**. Feasible as an admin-configured lead-time table; keep estimates ranges, not dates.
- **10.2 Replacement preferences:** Well specified. "Ask me first" (default) = a proposal/approval workflow; "allow replacements" = bounded rules engine. **Never auto-substitute, never charge more** — enforce server-side. This needs a per-hamper preference field + an admin-facing proposal queue. Moderate work; important for trust. ✅
- **10.3 Order tracking:** Statuses (procurement → assembly → packed → dispatched → OOD → delivered) map cleanly onto the existing order status infrastructure built in Task 5 — **the existing `orders` status flow + status-history + notification outbox is directly reusable here.** This is the strongest reuse opportunity in the whole PRS. Hamper-level (not just order-level) statuses need a sub-status per hamper item.

---

## §11 Cart and checkout

- Grouped cart item with expandable contents, edit/remove/duplicate — feasible, but as noted in §6.6 it requires a **line-item type discriminator** so hamper lines coexist with plain product lines without changing the existing flow. Design this first.
- "Editing returns to the exact builder route with a unique configuration id" — this is just deep-linking the builder with the draft id; the draft system (§12) must exist first.
- **"Reuse existing cart, checkout, payments. Do not create a separate payment system."** — Agreed and non-negotiable. The existing checkout + order-placement transaction (which already handles stock decrement, outbox writes, order history — Task 5) must remain the single path.
- Revalidate configuration/pricing/availability/compatibility server-side before checkout — correct, and matches the existing backend-validation pattern.

---

## §12 Drafts, templates and customer accounts

- **12.1 Auto-save:** Draft-as-single-JSON with save status is the right model; retry + recover-last-good is standard.
- **12.2 Guest (localStorage) vs account (server-side):** Correct split. Note: **server-side drafts need a `drafts` table keyed by customer**; guest drafts are frontend-only. No stock/price reservation — correctly specified.
- **12.3 Guest-to-account migration:** The "never silently overwrite / present review screen / detect duplicates" requirement is well specified and avoids the classic data-loss bug. Moderate frontend work.
- **12.4 Templates + recreate from past order:** Recreate = load order lines into a new draft and **revalidate everything** — matches §11.
- **12.5 My Hampers:** New account sub-section. The listed items (drafts, templates, previous orders, favourites, recently viewed) — note the repo has **no backend favourites/wishlist** (frontend has an `/account/wishlist` page but zero backend matches for `wishlist|favorite`), so favourites are net-new.
- **12.6 Favourites:** Same — new table + endpoints.

---

## §13 Sharing

Read-only share links + duplicate-into-builder + optional suggestions-with-approval + revocation — feasible as a token-based share record. Correctly excludes addresses/payment/order details from the payload. Real-time collaboration correctly deferred to "much later." ✅ No objections.

---

## §14 Admin and operations

- **Roles:** The repo already has authentication (email + Google) and RBAC/role checks — **"hamper manager" restricted role reuses existing auth/RBAC** with a new role value + route guards. ✅ Strong reuse.
- **14.1 Catalogue administration:** Large but pattern-consistent admin CRUD (products/packaging/sources/prices/rules/bundles/collections). The admin shell (`AdminFrame`) currently has 3 nav items — this section implies a substantial admin expansion (likely 6–10 new screens). **Scope it as its own workstream.**
- **14.2 Publishing & approvals + audit trail:** "Hamper managers submit, admins approve" is a publish-state machine + approval queue. The audit trail requirement is good — recommend one generic `audit_log` table (actor, entity, action, before/after, timestamp) used from day one rather than retrofitting.
- **14.3 Procurement & orders:** Admin queues for price-increase exceptions, alternate-source approvals, procurement tolerance, replacement proposals — all flow from §5/§10 flags. Feasible once those flags exist.

---

## §15 SEO, AEO and performance

Reasonable and standard. Repo status: `sitemap.ts` and `robots.ts` exist; product pages exist at `/products/[slug]`. So this is **extension, not greenfield**:

- ✅ Exists: sitemap, robots, metadata patterns, product pages.
- ⚠️ Needs building: crawlable recipient/relationship/collection pages (new routes), breadcrumb + Product/Offer + Organization/WebSite JSON-LD (repo currently has **no JSON-LD** — only a `robots: noindex` on detail/admin/checkout/cart pages), internal linking, FAQ content.
- Correctly avoids ranking promises and invented "AI markup." ✅
- Note: hamper-builder pages themselves are app-like; the crawlable surfaces should be the **recipient/occasion/collection landing pages**, not the interactive builder.

---

## §16 Responsive design and accessibility

Correct approach: **one business logic layer, two presentation modes** (desktop studio vs mobile wizard). The existing frontend already ships mobile breakpoints and this repo's conventions (semantic HTML, keyboard focus, reduced-motion handling — e.g. `prefers-reduced-motion` already in admin CSS) support the a11y list. ✅ No objections; budget real time for the mobile wizard, it's not a CSS afterthought.

---

## §17 Phase separation

**Agreed — and I'd tighten it further.** Recommended adjustments based on the audit:

**Phase 1 (must):** builder route, recipient types, relationships/occasions, catalogue + packaging data model, simple filters, three-unit minimum, grouped hamper cart, existing checkout integration, backend pricing, basic compatibility (after dimensions data exists), drafts, layered auto-preview, replacement preference (ask-first only), admin catalogue CRUD + approval + audit, order/fulfilment statuses reusing Task 5.

**Move to Phase 2 (PRS already defers most of these — I'd add):**
- Intent/AI search (PRS §4.5 already allows this)
- Manual preview positioning (§6.4)
- Discount stacking rules (§9.4)
- Full tax engine complexity (pending §9 answers)
- Recommendation engine beyond simple rules (§3/§4.6)
- Supplier API feeds (§5.6)
- Delivery-estimate refinement to per-courier accuracy (§10.1)

**Much later:** real-time collaboration (agreed).

---

## §18 Mandatory implementation constraints — compliance check

The PRS demands an audit-based implementation plan. **This response is that audit**, and here is the honest mapping. Where the PRS says "reuse," I verified rather than assumed:

| PRS claim | Repository reality |
|---|---|
| Reuse cart, checkout, payments | ✅ Exists — reuse as-is (single payment path) |
| Reuse authentication & RBAC | ✅ Exists (email + Google sign-in, roles) — add a role value |
| Reuse existing order statuses / notifications | ✅ Exists — Task 5 status flow + outbox is directly reusable for §10.3 |
| Reuse coupon infrastructure (§9.4) | ❌ **Does not exist** — net-new, minimal version for Phase 1 |
| Reuse tax/invoice infrastructure (§9.3) | ❌ **Does not exist** — net-new, needs regime decision first |
| "Catalogue search as reliable foundation" (§4.5) | ❌ **No search exists** — net-new (Postgres full-text, no new dependency) |
| Product filters (§4.3) | ❌ Products API is pagination-only — all filters net-new |
| Favourites (§12.6) | ❌ No backend wishlist/favourite code — net-new |
| Supplier/procurement/price fields (§4.1, §5) | ❌ None exist on the product entity — net-new domain |
| Dimensions/weights for compatibility (§7.3) | ❌ Not stored — data-entry prerequisite |
| Existing admin screens | ⚠️ Only Overview/Orders/Products — §14 implies 6–10 new screens |

**Constraint-by-constraint:** inspect repo ✅ (done here) · identify existing routes/APIs/entities ✅ · identify complete/partial/missing ✅ (table above) · map requirements to existing/new ✅ · reuse existing work ✅ (cart, checkout, auth, RBAC, order statuses, notifications outbox) · avoid duplicate logic ✅ (single pricing service, single draft model) · **do not change existing shopping flows** ✅ (grouped line-item discriminator, no checkout rewrite) · **no mock production integrations** ✅ (manual supplier entry, provider interface already honest about unconfigured state) · **no unneeded dependencies** ✅ (Postgres full-text search, no new search/AI library) · **implementation plan from actual repository** ✅ (this document).

---

## §19 Acceptance criteria — review

The criteria are testable and mostly correct. Notes on the ones with hidden dependencies:

- **Three-unit minimum enforced** — backend-enforced, not just UI. ✅ Testable.
- **Compatibility validated** — ⚠️ **blocked on dimensions data existing**; criteria should be reworded to "where dimension data is present" or dimension entry must be a Phase 1 prerequisite.
- **Selections survive navigation and refresh** — requires the draft model (§12) to be the builder's state store from day one.
- **Backend price validation** — must include the §5.1 rule (selling ≥ reference) and §9's server-side tax/fee calculation.
- **Budget warnings don't block** — trivial. ✅
- **No silent substitutions** — must be enforced server-side in both product (§5.4) and packaging (§7.5) paths. ✅ Testable.
- **Multiple hampers independently identifiable** — requires the grouped-line design (§11) before checkout work begins.
- **Existing journeys unaffected** — the strongest constraint: regression-test the current cart/checkout/order flow (which Task 5 already covers with 213 passing tests) on every builder PR.
- **SEO crawlable + structured data accurate** — new routes + JSON-LD; "accurate" means JSON-LD must match visible content (correctly required).

---

## Summary

1. **The PRS is well-formed and unusually disciplined** (skippable discovery, backend-truth pricing, no-silent-substitution, honest delivery estimates, real phase split). No section needs rewriting.
2. **Two factual corrections required** before it can be used as an implementation baseline: §9.3 and §9.4 claim existing tax/coupon infrastructure — **neither exists in this repo.** §4.5's "catalogue search foundation" also does not exist yet.
3. **Biggest underestimated items:** catalogue search, product filters, dimension/weight data entry (prerequisite for packaging compatibility), and the admin expansion (~6–10 new screens vs today's three).
4. **Biggest reuse wins:** cart/checkout/payments, auth + RBAC, and especially the Task 5 order-status flow + notification outbox for §10.3 fulfilment tracking.
5. **Open decisions from you:** (a) tax regime / whether invoicing is needed at launch; (b) manual preview positioning — defer to Phase 2?; (c) eight recipient types fixed or data-driven?; (d) confirm discount stacking and AI search are Phase 2.
6. **Next step:** once you answer (a)–(d), this response becomes the input to a repository-based implementation plan (constraint §18.10) — still no code until you approve that plan.

*No product code was written or modified in producing this response.*
