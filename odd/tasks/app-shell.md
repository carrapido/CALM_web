---
status: done
---

# App shell and design tokens

## Goal

Port the shared frame of the four Stitch screens to React + TypeScript + Tailwind v4: the design tokens, the site header with its navigation, the site footer, and switching between pages. Page bodies stay as placeholders until their own feature.

## Decisions

- **Build tooling:** Vite (dev server and bundler) and Vitest (tests) are dev dependencies only; runtime dependencies are React, React DOM and Tailwind.
- **Navigation without a router:** the current page lives in the URL hash (`#/mis-citas`), read with `useSyncExternalStore` over the `hashchange` event. The browser back button works and links are shareable, with no extra package and no server fallback config.
- **Canonical shell:** Stitch generated each screen independently, so header and footer differ slightly between them. The Inicio screen is the reference.
- **Tokens:** the Stitch `tailwind.config` (identical in all four screens) moves to a Tailwind v4 `@theme` block. Colors → `--color-*`, spacing → `--spacing-*`, type scale → `--text-*` with `--line-height`, `--letter-spacing` and `--font-weight` sub-properties. Hanken Grotesk becomes `--font-sans`, which replaces the twelve redundant `font-<role>` families. Radius needs no override: Tailwind v4 defaults (`rounded` 0.25rem, `lg` 0.5rem, `xl` 0.75rem) already match the screens.
- **No dead controls:** links and buttons without a destination (profile dropdown, legal links, "Carta de Tejidos") are rendered as text until a feature gives them one.

## Spec

1. With no hash, the Inicio page is shown and the header link "Inicio" is marked `aria-current="page"`.
2. Clicking a header link shows that page and moves `aria-current` to it.
3. Opening the app at `#/mis-prendas` shows the Mis Prendas page.
4. An unknown hash shows the Inicio page.
5. The footer "Navegación rápida" lists the same pages as the header.

Pages: Inicio, Servicios, Mis Prendas, Mis Citas, Agendar Cita. Servicios has no mockup.

## Log

### 2026-10-25 — done

- **Outcome:** Vite + React 19 + TS + Tailwind v4 project scaffolded. Stitch tokens live in `src/index.css` (`@theme`). Shell: `src/app/App.tsx` (container), `src/app/navigation.ts` (hash navigation), `src/app/layout/SiteHeader.tsx` and `SiteFooter.tsx` (presentational), atoms/molecules in `src/shared/ui/`. 5/5 spec tests GREEN; `npm run build`, `tsc` and `oxlint` clean. Header and footer checked against the Inicio screenshot at 1280px and 600px.
- **Pending checks:**
  - The header nav is hidden below `md` (as in the mockup); on mobile only the footer quick navigation reaches other pages. Needs a mobile menu decision.
  - Servicios has no mockup: decide whether it is its own page or the "Servicios de taller" section of Inicio.
  - Profile dropdown, legal links, policies and "Carta de Tejidos" render as text until they have a destination.
  - `public/favicon.svg` is still the Vite logo.
- **Next step:** [Inicio page](inicio.md). Replace `PagePlaceholder` for `inicio`; the dark "Código de cliente" strip belongs to that page, not the shell. Mockup uses `bg-gradient-to-t` (Tailwind v3), which is `bg-linear-to-t` in v4.
