# Create Your Own Gift Box — Feature Spec

**Date:** 2026-11-13  
**Status:** Draft for review (not implemented)  
**Reference:** [Eazy Gyft Gift Box Builder](https://eazygyft.com/apps/qe/gbb/1659) (QeApps BYOB, builder id `1659`)  
**Product name in Aapulki:** Create Your Own (also called Build Your Hamper)

This document describes the customer-facing Create Your Own flow in depth. It is the source of truth for a later implementation plan. It is **not** a copy of Eazy Gyft branding, copy, or catalogue. It copies the **interaction model**.

---

## 1. Goal

A shopper builds one gift box in a single guided page:

1. Choose a box (packaging).
2. Fill the box with products from a curated list.
3. Choose a gift card (often free).
4. Write personalisation (from, to, message, email).
5. Preview the bundle, then add it to the existing Aapulki cart as **one hamper**, not as unrelated loose lines.

Success: the shopper understands progress, sees a live total, can go back, and cannot skip required choices.

---

## 2. Why this exists

The shop already has:

- Catalogue (`/shop`, `/products/[slug]`)
- Cart and checkout
- Marketing page `/gifting` for curated hampers

Create Your Own is a third buying path. The shopper does not hunt SKUs across the shop. They stay on one builder until the hamper is complete.

This is different from:

| Path | What the shopper does |
|------|------------------------|
| Shop | Buy one product at a time |
| Curated hamper | Buy a pre-packed box |
| Create Your Own | Assemble box + items + card + note, then cart |

---

## 3. Reference walkthrough (what the live builder actually does)

Observed on 2026-11-13 at `https://eazygyft.com/apps/qe/gbb/1659`.

### 3.1 Page chrome

- Site header and footer stay around the builder (not a full-screen overlay).
- Title: **Gift Box Builder**.
- Intro: create a gift box in simple steps, personalise with a gift message, pick from a hand-selected list, fill the box.
- Copy says “4 simple steps”; the UI has **5 steps**. Aapulki must not repeat that mismatch. Either say five steps, or hide a step.

### 3.2 Step indicator

Horizontal numbered stepper, always visible:

| # | Label | Role |
|---|--------|------|
| 1 | Select Boxes | Choose packaging SKU |
| 2 | Choose Products | Fill the box from a filtered catalogue |
| 3 | Select Card | Gift card / enclosure |
| 4 | Form Submission | Personalisation fields |
| 5 | Preview | Review, edit, add to cart |

Completed steps get a filled circle. The current step is also marked complete in the reference app (they do not use a distinct “current” style). Aapulki should use three states: **done**, **current**, **upcoming**.

The stepper is visual. The shopper advances with **Next** / **Back**, not by clicking a future step. Clicking a completed earlier step is optional; the reference mainly uses Back.

### 3.3 Sticky selection bar (present on every step)

Fixed to the bottom of the viewport:

- Thumbnails of selected items, each with quantity overlay (`x1`) and a red **X** to remove.
- Empty slot placeholders (blank squares) showing remaining capacity.
- Optional **Extra charge (Weight)** row (hidden until a weight surcharge applies).
- **Total** (live sum of selected SKUs).
- Discounted total can exist (hidden when unused).
- **Back** (hidden on step 1) and **Next**.
- On the last step, primary action moves to **Add to cart** in the preview panel; the sticky bar still shows Back/Next in the reference.

Toast / slide-out messages:

- `Item added`
- `Choose your item 1` when Next is pressed without a required product on that step

### 3.4 Step 1 — Select Boxes

**Heading:** Select Boxes  

**Layout:** Responsive card grid (two columns on desktop). Each card:

- Large photo of the closed gift box
- Title (`Pink Box`, `Black Box`, `Grey Box`)
- Price (`$30.00 USD` in the reference; Aapulki uses INR)
- **Add** button

**Rules observed:**

- Adding a box puts it in the sticky bar and updates Total immediately (`$0` → `$30`).
- The shopper can add more than one box in the reference (duplicate Pink Box appeared). For Aapulki, **default to one box per builder session**. Extra boxes are out of scope unless we later add “Add more boxes”.
- Next without a box is blocked (same family of “choose your item” errors).
- Box is a paid product, not a free container.

**Aapulki content for this step:** box styles (kraft, cream, festive wrap, etc.) from products tagged or categorised as `box` / `packaging`.

### 3.5 Step 2 — Choose Products (main content)

This is the core of Create Your Own.

**Heading:** Choose Products  

**Filters (left or above the grid):**

| Filter | Options in the reference | Purpose |
|--------|--------------------------|---------|
| Sort by price | High–Low, Low–High | Order the grid |
| Sort by title | Asc, Desc | Alphabetical |
| Sort by vendor | Brand names (Jo Malone, Lunya, …) | Brand facet |
| Sort by type | Product type (Candle, Socks, Diffuser, …) | Category facet |

Filters are multi-select style lists, not a single dropdown. They narrow the **same** product grid. They do not change the step.

**Product grid:** two columns on desktop. Each card:

- Image
- Title
- Price
- Primary action:
  - **Add** if the product has one variant
  - **Choose Option** if the product has variants (size, scent, colour)

**Add (simple SKU):**

1. Click Add.
2. Toast: Item added.
3. Thumbnail appears in the sticky bar.
4. Total increases by that price.
5. One empty slot fills.

**Choose Option (variants):**

1. Click Choose Option.
2. Modal overlay (dimmed background, close **X**).
3. Left: main image + thumbnail gallery.
4. Right: vendor/brand, title, price, option groups (e.g. Size: `S/M`, `M/L` as selectable chips), **Add**.
5. Shopper picks a variant, then Add.
6. Modal closes; line is added with that variant.

Quantity on the card in the reference is not a visible +/- until the item is in the tray. Quantity can increase by adding the same product again. Sticky overlay shows `xN`. Remove with X.

**Capacity:**

- Empty squares in the sticky bar show remaining slots (the reference showed about 8–10 visual slots).
- Next is blocked until the **minimum for this step** is met. Observed: Next with only the box failed with **Choose your item 1**. After at least one product was added, Next could proceed (further adds were allowed).
- Aapulki rule (explicit):
  - **Min products in box:** 1
  - **Max products in box:** 8 (excluding the box and the card)
  - Box = 1 slot of type `box`
  - Card = 1 slot of type `card`, not counted in the 8

**Stock:** do not offer inactive or zero-stock products. If stock hits 0 while building, disable Add and show “Out of stock”.

### 3.6 Step 3 — Select Card

**Heading:** Select Card  

**Layout:** Card grid, same visual language as boxes. Reference had one option:

- Image of card + envelope
- Badge **Free** on the image
- Title: Signature Eazy Gyft Card
- Price: Free (`$0.00` on preview)
- **Add**

**Rules:**

- Adding the card does not change Total when price is 0.
- Card appears in the sticky tray.
- Aapulki: at least one card option; one may be free “handwritten note card”. Paid premium cards are allowed later.
- **Required:** shopper must add a card before Next (matches “personalise with your gift message”). If we later allow “no card”, that is a separate flag.

### 3.7 Step 4 — Form Submission

**Heading:** Form Submission  

Single column form in a bordered panel:

| Field | Control | Required | Validation |
|-------|---------|----------|------------|
| From Full Name | text | yes | non-empty, trimmed |
| To Full Name | text | yes | non-empty, trimmed |
| Gift Card Message | textarea | yes | non-empty, trimmed |
| Email Address | email | yes | valid email |

Empty Next shows per-field errors in the form (reference copy: `Select the options From full name`, etc.). Aapulki copy should be clearer:

- “Enter the sender name.”
- “Enter the recipient name.”
- “Enter a gift message.”
- “Enter a valid email address.”

Email is the shopper’s email for this hamper note (not the shipping address). Shipping stays on checkout.

These values are stored on the hamper / order, not as extra SKUs.

### 3.8 Step 5 — Preview

**Heading:** Preview (plus a Back control at the top of the step)

**Left / main column:**

- Hero image of the chosen box
- Grouped list:
  - **Box** line: name, price, qty, **Edit** (returns to step 1), **Remove**
  - **Products:** image, name, variant title if any, price, qty, **X** remove
  - **Card:** image, name, price (₹0 if free), qty, **X** remove

**Right / below:**

- **Additional Information** table: Field / Value for the four form fields
- **Order Details:** Subtotal, Discount (hidden if 0), Total
- Primary **Add to cart**
- Hidden in the reference (do not build unless asked): Add More, Share Box

**Add to cart:**

- Builds one cart hamper that contains child lines (box, products, card) plus personalisation payload.
- Then go to `/cart` (Aapulki already has `CartView`).

Edit/Remove on preview must keep totals in sync. Removing the last required product should block Add to cart and/or send the shopper back to step 2.

---

## 4. Aapulki information architecture

### 4.1 Route

- Public URL: `/create-your-own`
- Entry points:
  - Header / shop nav: **Create Your Own**
  - `/gifting` CTA next to “Shop hampers”
  - Optional product-page link: “Build a hamper with this item” (phase 2)

### 4.2 Page sections (top to bottom)

1. **Intro** — title, short explanation, “5 steps”
2. **Stepper**
3. **Step body** (only the active step is visible)
4. **Sticky tray** — selection + total + Back/Next
5. Site footer (scrolls underneath the sticky bar; add bottom padding so content is not hidden)

### 4.3 Copy (Aapulki)

- Title: **Create Your Own**
- Subtitle: **Build a hamper in five steps. Choose the box, fill it, add a note, then preview.**
- Step labels:
  1. Select box
  2. Choose products
  3. Select card
  4. Gift message
  5. Preview

Do not use “Form Submission” in the customer UI. That is admin language.

---

## 5. Data model (new, additive)

Do not replace `products`. Extend them.

### 5.1 Product roles

A product used in the builder has a **builder role**:

| Role | Meaning | Typical price |
|------|---------|----------------|
| `box` | Outer packaging | paid |
| `fill` | Item that goes in the box | paid |
| `card` | Enclosure / note card | free or paid |

A product can also stay shop-only (`role` null) and never appear in the builder.

Suggested fields (names can match existing TypeORM style):

- `builderRole`: `'box' | 'fill' | 'card' | null`
- `builderSort`: integer
- `vendor` or reuse `category` for type facet
- Variants: **phase 1 can skip variants** if current `Product` has no variant table. Then every fill item is Add-only. Phase 2 adds variants when the catalogue needs them.

### 5.2 Builder session (client state)

Keep the in-progress hamper in frontend state (same cart store family if one exists), persisted in `sessionStorage` so refresh does not wipe it.

```
{
  step: 1 | 2 | 3 | 4 | 5,
  box: { productId, quantity: 1 } | null,
  items: [{ productId, quantity, variantId? }],
  card: { productId, quantity: 1 } | null,
  form: {
    fromFullName: string,
    toFullName: string,
    giftMessage: string,
    email: string
  }
}
```

Totals: sum of current catalogue prices from the API, never from the client’s stale typed price at checkout. Checkout already uses DB prices; the hamper must do the same.

### 5.3 Cart / order payload

When adding to cart, one parent line:

- Name: `Create Your Own hamper`
- Price: sum of children at add-time (server recomputes on order)
- Children: box, fills, card
- Personalisation JSON on the parent

Order create must snapshot child names and prices like existing order line snapshots.

---

## 6. Rules (normative)

1. One active box per session (quantity 1). Changing box replaces the previous box.
2. At least one fill product before leaving step 2.
3. At most 8 fill products (sum of quantities).
4. One card, required.
5. All four form fields required before step 5.
6. Next validates the current step only.
7. Back never wipes data.
8. Remove from tray is allowed; if that breaks a rule, Next/Add to cart fail with a specific message.
9. Totals are live on every add/remove.
10. Currency: INR, existing site format.
11. Inactive / out-of-stock products are omitted or disabled.
12. Guest shoppers can complete the builder; login is not required until account features need it (same as current guest checkout).

---

## 7. Validation and errors

| Situation | Message |
|-----------|---------|
| Next on step 1, no box | Choose a box to continue. |
| Next on step 2, no fills | Add at least one product to the box. |
| Add when max 8 reached | The box is full (8 items). Remove an item to add another. |
| Variant required, none chosen | Choose an option. |
| Next on step 3, no card | Choose a gift card. |
| Empty form fields | Field-specific messages in section 3.7 |
| Invalid email | Enter a valid email address. |
| Add to cart, stock lost | One or more items are no longer available. Update the box. |
| Add to cart success | Go to `/cart`. |

Use a short toast for add/remove. Use inline errors on the form. Do not use the reference phrasing “Select the options From full name”.

---

## 8. Frontend structure (fit this repo)

This frontend is **Next.js App Router + CSS modules**, not Nuxt. Follow nearby pages (`gifting/page.tsx`, `CartView`).

Suggested files (implementation later; listed so the spec is concrete):

- `frontend/src/app/create-your-own/page.tsx` — route + metadata
- `frontend/src/app/create-your-own/page.module.css`
- `frontend/src/components/CreateYourOwnBuilder.tsx` — client wizard
- `frontend/src/components/CreateYourOwnBuilder.module.css`
- Store/hook next to existing cart state (do not invent a second cart)

No new CSS methodology. Match existing modules.

---

## 9. Backend (minimal)

Phase 1:

- Filter `GET /products` (or a dedicated `GET /builder/catalog`) by `builderRole`
- No new checkout endpoint if cart can hold a structured hamper line that `POST /orders` already understands

Phase 2 if the current order DTO is flat product lines only:

- Extend create-order DTO with `hamper` + `personalisation`
- Server expands to snapshot lines and stock-decrements every child

If phase 1 cart only stores child product ids and checkout already posts a flat `items[]`, the builder can flatten to normal cart lines **plus** a note field. Prefer one grouped hamper in the cart UI even if the API is flat.

---

## 10. Acceptance scenarios (Gherkin)

```gherkin
Feature: Create Your Own hamper
  As a shopper
  I want to build a gift box in five steps
  So that I can add a personalised hamper to my cart

  Background:
    Given I am on "/create-your-own"
    And the builder catalogue has at least one box, one fill product, and one card

  Scenario: Happy path
    When I add a box
    Then the sticky total equals the box price
    When I go to the next step
    And I add one fill product
    Then the sticky total equals box price plus product price
    When I go to the next step
    And I add a card
    When I go to the next step
    And I fill from name, to name, gift message, and email
    And I go to the next step
    Then I see the box, products, card, and message on Preview
    When I add to cart
    Then I am on "/cart"
    And the cart contains the hamper contents

  Scenario: Cannot skip the box
    When I click Next on step 1 without a box
    Then I stay on step 1
    And I see "Choose a box to continue."

  Scenario: Cannot skip fill products
    Given I have selected a box
    When I click Next on step 2 with no products
    Then I stay on step 2
    And I see "Add at least one product to the box."

  Scenario: Form validation
    Given I have a box, at least one product, and a card
    When I click Next on the gift message step with empty fields
    Then each empty field shows an error
    And I stay on that step

  Scenario: Back keeps selections
    Given I have selected a box and a product
    When I go to step 3
    And I click Back
    Then I am on step 2
    And the product is still in the sticky tray

  Scenario: Remove from tray
    Given I have two fill products in the tray
    When I remove one
    Then the total decreases by that product price
    And one slot is empty again
```

---

## 11. Out of scope (phase 1)

- Share box / social link
- Multiple boxes in one session (“Add more”)
- Weight surcharge UI
- Subscription boxes
- Admin builder CMS (merchants configuring steps in a dashboard). Catalogue flags on products are enough.
- Copying Eazy Gyft images, names, or Shopify app embed
- Nuxt/Vue (this app is Next.js)

---

## 12. Mapping: reference → Aapulki

| Reference | Aapulki |
|-----------|---------|
| Gift Box Builder | Create Your Own |
| SELECT BOXES | Select box |
| CHOOSE PRODUCTS | Choose products (main grid + filters) |
| SELECT CARD | Select card |
| FORM SUBMISSION | Gift message |
| PREVIEW + Add to cart | Preview + existing `/cart` |
| USD, Shopify cart | INR, Nest orders + current cart |
| Vendors / product types | `category` + optional vendor field |
| Choose Option modal | Phase 2 unless variants exist |

---

## 13. Open decisions (pick before implementation)

1. **Max fill items:** 8 (spec default) vs merchant-configurable.
2. **Must the card be required?** Spec says yes.
3. **Cart shape:** grouped hamper vs flattened lines with a note.
4. **Filters on step 2:** price + category only for phase 1, or full vendor/type lists.

Default recommendation: 8 max, card required, grouped hamper in the cart UI, phase 1 filters = category + price sort.

---

## 14. Spec self-review

- No TBD placeholders left in rules.
- Five steps are consistent in intro, stepper, and scenarios.
- Create Your Own (step 2) is specified as the main content: filters, grid, add vs variant modal, capacity, min/max.
- Implementation is not started; this file is the design for review.
