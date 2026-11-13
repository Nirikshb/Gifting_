---
name: Frontend Next.js UI
description: Build and update frontend-only UI in this repo's Next.js 16 App Router app (pages, layouts, components, routing, and UX states) under frontend/.
---

## Scope
- Frontend-only work in `frontend/` (Next.js 16, React 19, TypeScript).
- Use for creating/updating routes in `frontend/src/app`, shared UI in `frontend/src/components`, and UI helpers in `frontend/src/lib` when they directly support the UI.
- Do not modify backend code unless the user explicitly asks.

## Project conventions
- App Router structure: routes/layouts/pages live in `frontend/src/app/**` (e.g. `page.tsx`, `layout.tsx`, route segments like `products/[slug]/page.tsx`).
- Reusable UI components live in `frontend/src/components/` and often pair with CSS modules (`*.module.css`).
- Prefer existing patterns in nearby files for naming, file placement, props, and composition before introducing new abstractions.
- Keep TypeScript types accurate; reuse existing types/utilities where present.

## Workflow
1. **Inspect first:** read the target route/component and nearby related files (layout, styles, data helpers, similar components) to match established patterns.
2. **Check Next.js docs when unsure:** this project uses Next.js with breaking changes from older versions. Before writing unfamiliar Next.js code, consult relevant guides in `frontend/node_modules/next/dist/docs/` (resolved relative to `frontend/`).
3. **Implement minimally:** make the smallest coherent UI change that fits existing structure (Server vs Client Components, route boundaries, metadata, loading/error/not-found patterns as applicable).
4. **Preserve behavior:** avoid regressions to navigation, params, layouts, and shared UI. Reuse existing components/styles where appropriate.
5. **Verify:** run or suggest relevant frontend checks from `frontend/` when feasible (e.g. `npm run lint`, `npm run build`) and note any environment-related limitations.

## Implementation notes
- Add `"use client"` only when required (state, effects, event handlers, browser APIs, client-only libraries).
- Keep server/client boundaries clean; pass serializable props across them.
- Follow existing accessibility basics in the codebase (semantic elements, labels, keyboard/focus behavior) when touching interactive UI.
- When creating new UI, colocate route-specific styles/components consistently with surrounding code (e.g. `page.module.css` next to `page.tsx`, or shared components in `frontend/src/components/`).
