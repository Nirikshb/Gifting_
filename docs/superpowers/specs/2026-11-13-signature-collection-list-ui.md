# Signature collection list page — UI spec

**Date:** 2026-11-13  
**Status:** UI notes from live reference. Not implemented.  
**Reference:** [Eazy Gyft Signature collection](https://eazygyft.com/collections/signature)  
**Aapulki name:** Signature / Pre-curated hampers  
**Related:** [Create Your Own wizard](./2026-11-13-create-your-own-gift-box-design.md) (different path: shopper does not pick fill items)

This file is **one detailed section**: the **list page UI** only (not PDP, not checkout).

---

## Signature list page UI (in depth)

### What this page is

This is not Create Your Own. Each grid item is a **finished hamper** that Eazy Gyft already assembled. The shopper does not add Jo Malone or Lunya on this page. They buy a named set (example: Midnight Rose, $475). Inside the photo you still see third-party products. The **list SKU** is branded **Eazy Gyft**. The contents are sourced goods packed in their box.

Aapulki equivalent: a collection of pre-curated hampers. One product = one named box with a fixed contents list. Price is the hamper price in INR, not a sum the shopper builds.

Route to use later: `/signature` or a filtered `/shop` collection. Do not reuse the builder URL.

---

### Page stack (top to bottom)

1. Site header (logo, account, search, cart).
2. **Collection hero** (no photo banner on this page — text only).
3. **Toolbar** (density + sort + filter), full bleed, sticky feel under the header.
4. **Product grid**.
5. Site footer.

There is no left sidebar of filters on desktop. Filters open as a **right drawer**.

---

### Hero

Centered, generous white space.

| Element | Live copy / behaviour | Aapulki |
|---------|----------------------|---------|
| Eyebrow | `THOUGHTFUL GIFTS, BEAUTIFULLY WRAPPED` — small caps, letter-spacing, muted | Short line, e.g. `Hand-wrapped, ready to give` |
| Title | `SIGNATURE COLLECTION` — large serif, all caps, document title `OUR SIGNATURE COLLECTION` | `Signature collection` (sentence case is fine if the rest of Aapulki is not all-caps) |
| Body | One paragraph: curated boxes, premium selections, signature packaging, **every box includes a handwritten note** | Same idea. Do not copy their sentence. State that each hamper is pre-filled and wrapped. |

No CTA in the hero. The grid is the action.

---

### Toolbar

One horizontal bar, 1px borders, four zones:

| Zone | Control | Behaviour |
|------|---------|-----------|
| Left | Three density icons | Large grid (few columns, big images), default grid, compact/list-like (more columns / tighter). `aria-label`: Switch to larger / smaller / compact product images. |
| Middle | Empty flex spacer | Keeps sort/filter on the right |
| Right | **Sort by** ▾ | Opens a dropdown (not a full page). Options below. |
| Far right | **Filter** | Opens a right-hand drawer over a dimmed grid |

**Sort options (observed):**

- Featured  
- Most relevant  
- Best selling  
- Alphabetically, A–Z  
- Alphabetically, Z–A  
- Price, low to high  
- Price, high to low  
- Date, old to new  
- Date, new to old (selected in the session we opened)

Aapulki phase 1: Featured (manual order), Price low–high, Price high–low, Name A–Z. Skip “Most relevant” unless you have search ranking.

Count: **43 products** exists in the DOM (Shopify collection count). It is not a loud heading on the toolbar in the default Impact theme layout. Optional for Aapulki: show `23 hampers` near the toolbar.

---

### Filter drawer

Opens from the right. Pale pink panel on the reference (do not copy the pink; use Aapulki surfaces). Title `FILTERS` + close X.

Accordion groups:

| Group | Live values | Aapulki |
|-------|-------------|---------|
| Availability | In stock only | Same. Hide sold-out when on. |
| Price | Min $ / max $ | Min ₹ / max ₹ |
| Product type | Gyft Box (43) — all items are one type | `Hamper` only on this collection, or skip this facet if every item is a hamper |
| Brand | Eazy Gyft (43) — the **box brand**, not Jo Malone | `Aapulki`. Do not put Forest Essentials here on the **signature** list. Fill brands belong on the PDP contents list and on Create Your Own. |

Footer of drawer: full-width **View results**.

Some PDPs have colour options **Snow** / **Blush** (box colour). Those are product variants, not collection-level filters on the default facet list we opened. If Aapulki boxes come in kraft/ivory, add a **Box colour** facet later.

---

### Grid layout

- **Desktop:** 4 columns, even gutters, light grey card ground (`#f5f5f5` range). No card border. Image is the card.
- **Portrait photos** (`aspect-portrait`). Contents are shot as a **flat lay of the sourced products**, not only a closed box. That is how the shopper sees “what is inside” without opening the PDP.
- **Mobile:** 2 columns (theme `sizes` imply `/ 2` below 699px).
- Cards **reveal on scroll** (fade/slide in). Optional; do not block rendering on it.

Clicking the image goes to the product URL (`/products/midnight-rose`). The whole media is the hit target. There is **no Add to cart on the list card**.

---

### One card — anatomy

From top to bottom of `product-card`:

1. **Figure**
   - **Sold out badge** — top-left, small caps, light pill (`SOLD OUT`). Present only when stock is 0. In-stock cards have no badge.
   - **Primary image** — flat lay.
   - **Secondary image** — many cards have a hover swap (`product-card__image--secondary`), often a lifestyle or video poster. In-stock and sold-out both may have this.
2. **Info** (centered stack, below the image — easy to miss if you only look at the photo)
   - **Vendor** — small caps link `Eazy Gyft` (the hamper brand).
   - **Title** — hamper name, e.g. `Midnight Rose`, `The Blush Ritual`, `Crystal Rye Ritual`.
   - **Price** — e.g. `$475.00`. Theme marks it `Sale price` in a11y text even when it is the only price. Aapulki: show `₹` with existing `formatInr`. Show a compare-at price only if you truly discount.

No rating. No “quick add”. No contents bullet list on the card. The photo does that job.

**Sold out vs in stock (same grid):**

| | Sold out | In stock |
|---|----------|----------|
| Badge | Yes | No |
| Still listed | Yes — they do not hide sold-out by default | Yes |
| Clickable | Yes — PDP still opens | Yes |
| Price | Still shown | Shown |

Aapulki: keep sold-out visible unless “In stock only” is on. Grey the image slightly if you want; the reference does **not** grey the photo, only the badge.

---

### What the photos teach (important for India)

The list is selling **Eazy Gyft boxes**, but every thumbnail is a pile of **other brands** (Diptyque, Jo Malone, Lunya, Harrods tins, Alo, etc.). That matches the sourcing model: they did not manufacture the candle. They packed known products into a named ritual.

For Aapulki Signature:

- Shoot a flat lay of the **real units you will pack**.
- Do not use a closed box as the only list image if the value is the contents.
- Do not fake brands you cannot fulfil.
- The **product title** is your hamper name (`Diwali Ivory`, `New baby kraft`), not `Jo Malone set`.
- The **vendor line** is Aapulki.

---

### Interaction summary

| Shopper action | Result |
|----------------|--------|
| Scan hero | Understands these are ready-made boxes with a note |
| Change density | Bigger or smaller photos; same products |
| Sort | Reorders the 43 (or N) hampers |
| Filter → View results | Subset of the grid; drawer closes |
| Click card | PDP for that hamper (out of scope for this section) |
| Click sold-out card | Still PDP; purchase disabled there |

---

### Aapulki mapping (list only)

| Reference | Aapulki |
|-----------|---------|
| `/collections/signature` | `/signature` (preferred) or `/shop?collection=signature` |
| 4-column portrait grid | Match; `/shop` today is a generic catalogue — this collection should feel more editorial |
| Vendor Eazy Gyft | Aapulki |
| Product type Gyft Box | Hamper / Signature box |
| USD | INR |
| Filter drawer | Same pattern; do not add a permanent left rail |
| No ATC on card | Same — cart happens on PDP / existing cart |
| 43 mixed in-stock and sold-out | Show both; stock from `stock_quantity` |

Existing `/shop` can stay as “all products”. Signature is a **subset**: products that are complete hampers (`builderRole` null or a new `productKind: 'signature_hamper'`), not fill SKUs from Create Your Own.

Do not put Create Your Own fill items on this grid. Those SKUs belong in the builder. This grid is only named, pre-packed boxes.

---

### Out of scope for this section

- Product detail page (contents list, add to cart, box colour Snow/Blush).
- Checkout.
- Admin for creating a signature hamper.
- Copying their photography, names, or prices.
