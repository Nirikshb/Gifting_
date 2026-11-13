# Signature collection list page — UI spec

**Date:** 2026-11-13  
**Status:** Page overview from live reference. Not implemented.  
**Reference:** [Eazy Gyft Signature collection](https://eazygyft.com/collections/signature)  
**Aapulki name:** Signature / Pre-curated hampers  
**Related:** [Create Your Own wizard](./2026-11-13-create-your-own-gift-box-design.md) (different path: shopper does not pick fill items)

**Listing / product-grid UI:** do not use this file as the last word on cards, density, or what is visible under the photo. Use **[2026-11-13-signature-listing-grid-ui.md](./2026-11-13-signature-listing-grid-ui.md)** for that section.

This file is the **list page** at page level (what the collection is, hero, toolbar, filters, mapping). It is not the detailed product-section spec.

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
3. **Toolbar** (density + sort + filter), full bleed, sticky under the header.
4. **Product grid** — see the listing-grid extension for columns, captions, sold out, clicks.
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
| Left | Three density icons | Changes how the **product grid** looks. Exact columns and whether name/price show: **listing-grid UI extension**. |
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

Count: **43 products** exists in the DOM (Shopify collection count). Optional for Aapulki: show `23 hampers` near the toolbar.

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

Snow / Blush as box colour: see the listing-grid extension (variant on some cards, not a collection filter).

---

### Product grid

**Refer to [signature listing grid UI](./2026-11-13-signature-listing-grid-ui.md).** That file is the accurate description of default compact (image-only), medium/large (captions on), sold out, hover image, swatches, and click targets.

---

### Aapulki mapping (list page)

| Reference | Aapulki |
|-----------|---------|
| `/collections/signature` | `/signature` (preferred) or `/shop?collection=signature` |
| Product grid | Follow the listing-grid UI extension |
| Vendor Eazy Gyft | Aapulki |
| Product type Gyft Box | Hamper / Signature box |
| USD | INR |
| Filter drawer | Same pattern; do not add a permanent left rail |
| No ATC on card | Same — cart happens on PDP / existing cart |

Existing `/shop` can stay as “all products”. Signature is a **subset**: complete hampers, not Create Your Own fill SKUs.

---

### Out of scope for this file

- Product-grid pixel behaviour (use the listing-grid extension).
- Product detail page (contents list, add to cart).
- Checkout.
- Admin for creating a signature hamper.
- Copying their photography, names, or prices.
