# Create Your Own — Indian version (how to run the same model)

**Date:** 2026-11-13  
**Status:** Playbook (operations + catalogue). Not code.  
**Pairs with:** [2026-11-13-create-your-own-gift-box-design.md](./2026-11-13-create-your-own-gift-box-design.md)

The UI spec describes the five steps. This file describes **how you get the products**, because those fill items are not yours.

---

## 1. What you are copying

Eazy Gyft does not invent Jo Malone or Lunya. They:

1. Choose real products that already exist online.
2. Buy them through a legal supply path.
3. Put **the same product** (same brand, same name, same kind of item) into their box builder.
4. Charge the listed selling price of that item, plus their box, plus packing labour.

You do the same in India. You own the **box, wrap, card, curation, packing, and delivery**. You do **not** own the brand inside the box.

---

## 2. What you own vs what you list

| You own | You do not own |
|---------|----------------|
| Kraft / festive box, ribbon, tissue, wax seal | Forest Essentials cream, Jo Malone (if imported), Paper Boat, etc. |
| Handwritten / printed card | The brand’s trademark, photos, and formula |
| The Create Your Own experience | The manufacturer’s MRP sheet |
| Margin from assembly and convenience | Exclusive rights to sell unless a brand gives you a deal |

The shopper pays for:

- Each sourced SKU at **your sell price** (usually near Indian MRP / authorised web price)
- Your packaging SKU
- Optional paid card
- Shipping at checkout

They are not paying you as the maker of the candle. They are paying you to **put that candle in your hamper**.

---

## 3. The India rule: “same product” means authorised goods, not scraped listings

“Get the exact same products from online and add it here” is correct as a **catalogue idea**. It is not correct as “copy Amazon photos and hope”.

For each fill item you must be able to answer:

1. **What is the exact SKU?** Brand + product name + size (e.g. “Forest Essentials Delicate Facial Cleanser Mashobra Honey Lemon 200 ml”).
2. **Where do I buy it legally in India?** Distributor, brand B2B, authorised retailer bulk, or your own retail purchase for tiny volume.
3. **What is the Indian price?** MRP on the pack / brand’s Indian site / authorised store. Not a USD page converted by eye.
4. **Can I show their image?** Only with a licence, brand asset pack, or a photo **you took** of stock you hold. Do not hotlink another site’s images.

If you cannot buy it in India at a stable price, do not put it in the builder. Eazy Gyft can list Jo Malone because they operate in a market where that stock is normal. You list what **you can replenish in India**.

---

## 4. How to achieve the same thing, step by step

### Step A — Decide the box (this is yours)

This is Aapulki’s product. Examples:

- Small kraft hamper box
- Cream rigid box
- Festive wrap box

Price this as your SKU. This is step 1 of the builder.

### Step B — Build a “borrowed” fill catalogue

Pick **6–12 products per box size**, not the whole internet. Complementary items convert. Forty near-identical SKUs do not.

For India, think in **types**, then pick one real brand SKU per slot:

| Type (filter) | Example of “exact product from online” (illustrative) | Where India shoppers already know it |
|---------------|------------------------------------------------------|--------------------------------------|
| Tea / beverage | Vahdam / Karma Kettle / Twinings India pack | Brand site, Nykaa, Amazon.in |
| Sweet | Paper Boat preserve, Theobroma bite, local mithai tin | Brand / city retail |
| Skincare mini | Forest Essentials / Kama Ayurveda / Minimalist travel size | Nykaa, brand stores |
| Home scent | Niana / Iris / a candle brand you can wholesale | Brand B2B |
| Sock / textile | A bona fide Indian brand you can invoice | Brand wholesale |
| Bath | A soap or soak with GST invoice | Distributor |
| Nibble | Nuts, cookies with long shelf life | Distributor / brand |

You do not need the same Western brands as Eazy Gyft. You need the **same pattern**: shopper recognises the item as a real product that exists outside your site.

Start with brands that already sell B2B in India. Cold-email “wholesale” / “corporate gifting” on the brand site. Ask for:

- Dealer price list (ex-GST)
- MOQ
- Image pack
- Permission to sell in gift hampers

Until a dealer account exists, you may **buy retail in small quantity** to test the builder. That kills margin. Do not scale on retail-buy.

### Step C — One row per product in your system

Each fill item is a normal `products` row:

- `name`: the **public brand name** of the product (honest, not “inspired by”)
- `price`: your INR sell price
- `stock_quantity`: units you physically have (or have on a firm PO)
- `category`: type (Candle, Tea, Skincare, …) — this powers Choose Products filters
- `builderRole`: `fill`
- `image_url`: photo you are allowed to use
- Optional later: `vendor` = brand name (Jo Malone equivalent = Forest Essentials)

Box rows: `builderRole = box`.  
Card rows: `builderRole = card` (your card, often ₹0).

The builder does not “search the internet”. It only shows **your** rows. You copied the product **into your warehouse and database**. You did not embed another website.

### Step D — Price like a reseller, in INR

Indian pricing stack:

1. **Landed cost** = what you pay the brand/distributor + GST you cannot offset wrongly + inbound freight.
2. **MRP** = printed Indian MRP (you generally cannot sell above MRP for packed goods).
3. **Your sell price** = between landed cost and MRP. Gift sites often sit **at or just under MRP** because convenience is the product.
4. **Box price** = your packaging + labour + margin. This is where Aapulki makes real money if fill SKUs are tight on MRP.

GST: hampers that mix goods can be messy (different HSN). Account for this with a CA before you scale. Do not invent a “hamper GST rate” in the app without advice.

Show rupees the way the rest of Aapulki already shows prices.

### Step E — Stock is physical, not a URL

Eazy Gyft’s “Add” only works because they hold or can fulfil that SKU.

Your rule:

- `stock_quantity` is units on your shelf (or allocated to you).
- When the shopper adds 1 tea tin, you will decrement 1 at order time (existing order stock lock).
- If Amazon has it but you do not, **do not list it**.

Replenish from the same supplier so the next order is the same exact product (same size, same variant).

### Step F — Pack exactly what you sold

The Create Your Own promise is: the preview list **is** what goes in the box.

Ops loop:

1. Order comes in with child SKUs + gift message.
2. Pick those units from bins.
3. Put them in the chosen Aapulki box.
4. Add the chosen card with the printed/written message.
5. Ship.

You are a **pack-out desk**, not a factory for those brands.

---

## 5. Suggested Indian builder mix (phase 1)

Keep the five UI steps from the other spec. Change only the **catalogue**.

**Step 1 — Boxes (yours)**  
3 options is enough (same as Pink / Black / Grey): e.g. Kraft, Ivory, Festive. Paid.

**Step 2 — Products (sourced)**  
About 8–12 fill SKUs:

- 2 teas / beverages  
- 2 sweets / pantry  
- 2 personal care  
- 2 home / candle  
- 1–2 textile or accessory  

Filters for India phase 1: **category + price sort**. Add **brand (vendor)** when you have 3+ brands.

**Step 3 — Card (yours)**  
One free Aapulki note card. Same as their free Signature card.

**Step 4 — Message**  
From, To, message, email. Unchanged.

**Step 5 — Preview + cart**  
Unchanged behaviour. Currency INR.

---

## 6. How this differs from “we make all products”

| If you manufactured everything | This model |
|--------------------------------|------------|
| You design the candle | You buy a brand candle |
| You set any price | You are bounded by Indian MRP and supply cost |
| Photos are always yours | Photos need permission or your own pack shots |
| Stock is your production | Stock is purchase orders to other companies |
| Brand risk is yours | Brand risk includes selling genuine vs fake |

Never list lookalikes as the real brand. If you cannot source Forest Essentials, list another real brand you **can** invoice, or a private-label item you actually make.

---

## 7. Practical India sourcing paths (best first)

1. **Brand wholesale / corporate gifting desk** — best invoices, image packs, stable SKUs.  
2. **Authorised distributor** — same, often statewide.  
3. **Cash-and-carry / Metro-style wholesale** — only if the barcode matches the consumer product.  
4. **Retail buy (Nykaa, Amazon.in, brand site)** — only for a prototype of 5–10 boxes. Margin will be poor.  
5. **Dropship from a marketplace into your box** — do not. Lead times and authenticity break the hamper promise.

Import of foreign luxury (Jo Malone India, etc.) is possible only if an Indian authorised channel exists. If it does not, skip that brand.

---

## 8. Legal and trust (short)

- Sell **genuine** units. Fake luxury in a hamper destroys the brand.  
- Do not scrape competitor product copy. Write your own one-line description.  
- Trademarks: you may say you are including “Brand X Product Y” if you are really selling that item. You may not imply Brand X endorses Aapulki unless they say so.  
- Keep supplier invoices. That is how you prove the goods are real.

This is not legal advice. Confirm GST and labelling for mixed hampers with a CA.

---

## 9. What you do in the product admin (when you build it)

For every sourced item:

1. Confirm supplier + landed cost + MRP.  
2. Photograph the unit you hold, or use licensed assets.  
3. Create product: role `fill`, INR price, stock, category, brand name in the title.  
4. Toggle it into Create Your Own.  
5. When stock hits 0, it disappears or Add disables — same as the reference.

Boxes and cards are created the same way with different roles.

---

## 10. Success check

You have achieved the “exact same thing” in India when:

- A shopper can add **recognisable third-party products** whose prices match what those products sell for in India.  
- You can fulfil every line from stock you purchased.  
- The box and card are Aapulki.  
- You are not pretending you manufactured the fill items.

The wizard file is the screen. This file is the stockroom.
