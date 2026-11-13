---
name: Frontend Data & State
description: Handle frontend-only data fetching, API integration, client/server state, and UI states for flows like cart, checkout, and orders in frontend/.
---

## Scope
- Frontend-only data and state work in `frontend/` (Next.js 16 App Router, React 19, TypeScript).
- Use for integrating with existing frontend API/helpers, managing client state, wiring forms/actions to UI behavior, and implementing loading/error/empty/success states.
- Primary areas: `frontend/src/lib/api/**`, `frontend/src/lib/cart/**`, `frontend/src/lib/analytics/**`, route handlers/pages in `frontend/src/app/**`, and components in `frontend/src/components/**`.
- Do not modify backend code unless the user explicitly asks.

## Project conventions
- Reuse existing API/client utilities and domain helpers before adding new fetch logic:
  - `frontend/src/lib/api/client.ts`, `catalogue.ts`, `cart.ts`, `orders.ts`, `product-format.ts`, `index.ts`
  - `frontend/src/lib/cart/CartProvider.tsx`, `frontend/src/lib/orders/format.ts`
- Follow established patterns for where data is fetched/rendered (server vs client) and how results/errors are surfaced in the UI.
- Keep TypeScript request/response shapes aligned with existing types and usage in the codebase.

## Workflow
1. **Trace the flow:** identify the entry UI (page/component), state owner/provider, and API/helper functions involved; read nearby implementations (cart, checkout, orders, product pages) for patterns.
2. **Check Next.js docs when unsure:** consult relevant guides in `frontend/node_modules/next/dist/docs/` before using unfamiliar Next.js 16 data fetching, caching, Server/Client Component, or route behavior.
3. **Implement with clear states:** handle loading, success, empty, and error cases explicitly; preserve user feedback and navigation behavior.
4. **Keep boundaries clean:** avoid unnecessary client components; isolate browser-only state/effects behind `"use client"` where required and pass serializable data across server/client boundaries.
5. **Verify:** suggest or run relevant frontend checks from `frontend/` when feasible (e.g. `npm run lint`, `npm run build`) and sanity-check the affected user flow.

## Implementation notes
- When changing cart/checkout/order flows, preserve existing analytics/event hooks and formatting helpers if present (e.g. `frontend/src/lib/analytics/**`, order format utilities).
- Prefer small, composable helpers consistent with current `lib/api` and `lib/cart` structure over ad-hoc inline fetch logic in multiple components.
- Handle edge cases the UI may encounter (missing data, unavailable products, failed requests, stale state) using patterns already present in the app.
- Do not expose secrets or add backend assumptions; work against the existing frontend API contract/helpers.
