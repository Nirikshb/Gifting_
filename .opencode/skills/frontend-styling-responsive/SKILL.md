---
name: Frontend Styling & Responsive
description: Implement and refine frontend-only styling in this repo using Tailwind CSS v4, CSS modules, and responsive layout patterns under frontend/.
---

## Scope
- Frontend-only styling work in `frontend/` (Tailwind CSS v4, CSS modules, global styles, responsive behavior).
- Use for visual polish, layout fixes, responsive adjustments, typography/spacing, and component styling in `frontend/src/app`, `frontend/src/components`, and related style files.
- Do not modify backend code unless the user explicitly asks.

## Project conventions
- This project uses **Tailwind CSS v4** (`@tailwindcss/postcss`, `tailwindcss`) and **CSS modules** (`*.module.css`) alongside `frontend/src/app/globals.css`.
- Match the existing styling approach of the area you edit: some UI uses CSS modules/class composition, some may use utility classes—stay consistent within the touched component/route.
- Reuse existing design tokens, class patterns, spacing/layout conventions, and component structure found nearby before adding new global rules.

## Workflow
1. **Inspect existing styles:** read the component/page and its associated `.module.css`, nearby components, and `frontend/src/app/globals.css`/layout styles to understand current patterns.
2. **Choose the right layer:** prefer local/component-scoped styles (module or component-level utilities) over broad global changes; update globals only when the change is truly shared.
3. **Implement responsively:** ensure layouts work across common breakpoints and content sizes (wrapping, overflow, stacking, readable line lengths, tap targets where relevant).
4. **Protect states:** verify hover/focus/active/disabled/loading/empty/error states as applicable and keep contrast/readability intact.
5. **Verify:** suggest or run relevant frontend checks from `frontend/` when feasible (e.g. `npm run lint`, `npm run build`) and visually sanity-check affected breakpoints if possible.

## Implementation notes
- Avoid unnecessary specificity and duplicate selectors; prefer extending existing classes/patterns.
- Preserve semantic HTML while styling; do not trade accessibility for visuals (focus visibility, color contrast, label alignment).
- Be careful with Tailwind v4-specific syntax/config differences from older Tailwind versions; follow patterns already used in this repo.
- When adjusting shared components, check downstream usages in `frontend/src/` to avoid unintended regressions.
