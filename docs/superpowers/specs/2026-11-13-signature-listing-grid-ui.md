# Signature listing — product grid UI (extension)

**Date:** 2026-11-13  
**Status:** UI source of truth for the **listing product section**. Re-checked on the live grid.  
**Live page:** [Eazy Gyft Signature collection](https://eazygyft.com/collections/signature)  
**Parent (what the page is, hero, filters, mapping):** [2026-11-13-signature-collection-list-ui.md](./2026-11-13-signature-collection-list-ui.md)

When you implement or design the **listing product section**, use **this file**. Do not treat the parent spec’s first-pass card notes as the last word.

---

## Scope

This extension covers only:

- Density toolbar as it changes the grid
- Product grid columns
- What a card shows (and hides) on screen
- Sold out, hover image, swatches, click targets

It does not cover hero copy, filter drawer contents, PDP, or checkout.

---

## Default view (what you see on first load)

The collection is saved as:

```
collection-desktop-layout="compact"
collection-mobile-layout="medium"
```

On compact desktop:

- About **4 columns** at ~900–1100px width (theme can go to **5** at ≥1000px).
- Each cell is **photo only**.
- **Sold out** pill top-left if stock is 0.
- **Vendor, title, and price are not visible.**

They exist in the HTML (`.product-card__info`) but CSS hides them:

```css
.collection .product-list[collection-desktop-layout="compact"] .product-card__info {
  display: none;
}
```

Do not describe the default listing as “image, then name, then price.” That is wrong for compact.

---

## Density changes the product section

Three icons on the left of the toolbar. They set `collection-desktop-layout`.

| Icon | Layout | Columns (this viewport) | Under the photo |
|------|--------|-------------------------|-----------------|
| Compact (list default, `is-active` on first load) | `compact` | 4 | Hidden |
| Smaller images | `medium` | 3 | Vendor + title + price |
| Larger images | `large` | 2 | Vendor + title + price |

Compact is **not** a horizontal list row. It is more, smaller portraits, captions off.

Toolbar itself is `position: sticky` under the header.

---

## Card — on-screen vs in the DOM

### Always on screen (all densities)

- Portrait image (`aspect-portrait`), light grey ground, no card border.
- **Sold out** badge only when sold out. In-stock cards have no badge. Photo is not greyed.
- Many cards have a **second image** for hover (`product-card__image--secondary`). Not all (example: Crystal Rye Ritual had none).

### In the DOM always; on screen only in large/medium

Centered under the image:

1. **Vendor** — `Eazy Gyft` (small caps). Link to `/collections/vendors?q=Eazy%20Gyft`. This is the hamper brand, not the fill brand.
2. **Title** — hamper name (`Midnight Rose`, `The Blush Ritual`, …). Link to `/products/{handle}`.
3. **Price** — `$475.00`. Markup is `<sale-price>` with screen-reader text `Sale price`. Sampled cards had **no compare-at / strikethrough**. Not a visible “on sale” flag.
4. **Colour swatches** — rare. Example: `Swing in Style: A Female Golfer's Luxury Gift Set` has Color **Snow** / **Blush**. Most cards have none. Hidden in compact with the rest of the info.

No rating. No Add to cart on the card. No contents bullet list. The photo does the “what’s inside” job.

---

## Click targets

| Control | Goes to |
|---------|---------|
| Image (`a.product-card__media`) | PDP `/products/{handle}` |
| Title | Same PDP |
| Vendor | Vendor collection, not the PDP |
| Card root `<product-card>` | Not a single wrapping link |

Sold-out cards stay in the grid and still open the PDP.

---

## Photos (product section, not marketing)

Most tiles are a **flat lay of sourced third-party products**. Some are a simpler still-life (one bottle, glasses). Do not write “every tile is a pile of brands” or “every tile is a closed box.”

---

## Aapulki — product section only

1. **Pick a default density.** Compact = editorial, no INR on the grid. Medium = name + price visible. Do not mix “4 columns” with “always show price” unless you write custom CSS. Their compact rule hides info.
2. Show **Sold out** on the image. Keep the card in the list unless “In stock only” is on.
3. Card image → hamper PDP. No ATC on the listing card.
4. Vendor line, if shown: **Aapulki**. Fill brands belong in the photo and on the PDP, not as the list vendor.
5. Price: `formatInr`. Do not copy the fake “Sale price” label unless it is a real discount.
6. Swatches only if a hamper has box-colour variants.

---

## What was wrong in the first listing notes

| First note | After re-check |
|------------|----------------|
| 4 columns with title and price under every card | Default compact: 4 columns, **no** title/price |
| Sale price means a discount | Only a11y text; no compare-at on sampled cards |
| Snow/Blush are collection filters | Variants on **some** cards; hidden in compact |
| Every photo is a brand pile | Most are; some are simple still-lifes |
| Whole card is the link | Image and title are separate links |

Parent spec may still speak at a high level. If the parent and this file disagree on the **product grid**, **this file wins**.
