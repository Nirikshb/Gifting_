# Analytics

Google Analytics 4 records page visits and, later, shop events. Microsoft Clarity records sessions and heatmaps after the visitor allows it. Pages call functions from `@/lib/analytics`. They do not load either tool themselves.

## Environment

Set these in `frontend/.env.local`. Leave them unset until the properties exist. They are public ids, not secrets.

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_CLARITY_PROJECT_ID=
NEXT_PUBLIC_GA_CURRENCY=
```

`NEXT_PUBLIC_GA_CURRENCY` is an ISO 4217 code. The database has no currency. Commerce events do not send until this variable is set. Page views do not need it.

Restart `npm run dev` after changing them. The dev server runs on port 4000.

In the Clarity project, turn on consent mode. Then Clarity does not store its cookies before it receives the consent signal.

## Where the code lives

| Path | Role |
| --- | --- |
| `frontend/src/lib/analytics/index.ts` | The only import pages should use |
| `frontend/src/lib/analytics/events.ts` | Event names and payloads |
| `frontend/src/lib/analytics/PageViews.tsx` | Route listener for `page_view` |
| `frontend/src/lib/analytics/consent.ts` | Stored choice: `gp_analytics_consent` |
| `frontend/src/lib/analytics/providers/ga4.ts` | GA4 script and `gtag` |
| `frontend/src/lib/analytics/providers/clarity.ts` | Clarity script |
| `frontend/src/components/AnalyticsConsent.tsx` | Allow / leave off |
| `frontend/src/app/layout.tsx` | Mounts `Analytics` once |

## Consent

The first visit loads neither script. The visitor can use the site while the choice is still open.

Allow loads each script once. Ad storage stays denied. Analytics storage is granted only after Allow. Leave off stores `denied` and does not load the scripts. Turn off stores `denied`, tells GA4 that analytics storage is denied, and tells Clarity to stop. A script that is already in the page cannot be removed without a reload. The next load does not add it again.

The email field in the newsletter form has `data-clarity-mask="true"`. Checkout fields do not exist yet. When they do, mask every name, email, phone, and address field the same way. Do not put those values in an event.

This setup does not by itself make the site legally compliant.

## Page views

`PageViews` listens to the App Router path. It sends `page_view` for the first load and for later client navigations. The path is the pathname only. Query strings are not sent.

GA4 is configured with `send_page_view: false`, so GA4 does not also send its own page view. A second run of the same path, including React Strict Mode, does not send another hit.

`page_view` is not a page-level call. Do not add it to each page.

In development, GA4 config sets `debug_mode: true`. Production builds do not.

## Shop events

These functions are ready. No page calls them yet, because the shop does not render products, change a cart, or create an order.

```ts
import {
  trackViewItemList,
  trackViewItem,
  trackAddToCart,
  trackRemoveFromCart,
  trackViewCart,
  trackBeginCheckout,
  trackAddShippingInfo,
  trackPurchase,
} from "@/lib/analytics";
```

Call `trackAddToCart` only after the cart request succeeds. Call `trackRemoveFromCart` with the product and quantity you still have before the removal. Call `trackPurchase` only after `POST /orders` returns the created order. Do not call it when the visitor clicks submit.

`trackPurchase` uses `orderReference` as `transaction_id`. It uses `productSlug` as `item_id`, because the order response has no numeric product id. The same order reference is stored in `localStorage` under `gp_analytics_purchase_<orderReference>`, so a refresh does not send `purchase` again.

`value` for a cart event is `cart.subtotal`. `value` for a purchase is `order.totalAmount`. Prices must be numeric strings such as `"12.50"`.

`trackAddShippingInfo` sends the cart currency, value, and items. It has no shipping tier, because the order API has no shipping method. It must not receive a name, email, or address.

Visiting a future checkout route sends `page_view` only. `begin_checkout` and `purchase` are separate calls.

A missing id, a missing currency, a blocked script, or a provider error does not throw to the caller.

## How to check GA4

1. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` and restart the dev server.
2. Open the site, choose Allow, and move to another route.
3. In GA4, open Admin, then DebugView.
4. Confirm one `page_view` for the first page and one more after the route change.
5. Do not expect `add_to_cart`, `begin_checkout`, or `purchase`. Nothing in the shop calls them yet.

An event is not verified until it appears in DebugView.

## How to check Clarity

1. Set `NEXT_PUBLIC_CLARITY_PROJECT_ID`, enable consent mode, and restart the dev server.
2. Before Allow, the page should not request `https://www.clarity.ms/tag/`.
3. After Allow, Clarity can show a recording and a heatmap for that visit.
4. After Turn off and a reload, a new recording should not start.

A recording is not verified until it appears in the Clarity project.

## Add a new event later

1. Add the payload builder in `events.ts`.
2. Export the function from `index.ts`.
3. Call that function from the page after the real action succeeds.
4. Do not call `window.gtag` or `window.clarity` from the page.
