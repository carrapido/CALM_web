---
status: done
---

# Admin shell

## Goal

Turn the client-facing shell from [App shell](app-shell.md) into the admin panel frame: admin navigation (Agenda, Pedidos, Catálogo), admin identity instead of the client badge, a navigation that also works on a phone (the PDF requires operating from a mobile device), and copy for a local Cancún shop instead of the Stitch atelier copy.

## Decisions

- **Mobile first:** the admin works from her phone. Below `md` the navigation is a fixed bottom tab bar (icon + text label, 64px tall targets); from `md` up the same `<nav>` becomes a left sidebar. One landmark, two layouts, CSS only.
- **Labels always visible:** icons never stand alone; low-tech users recognize words faster than glyphs (Nielsen #6, recognition rather than recall).
- **No client footer:** the marketing footer belongs to the client app, not to the admin panel.
- **Local copy:** the brand shows only the business name (no tagline, user feedback); identity shows "Administradora".
- **Current page:** black (`text-black` on the phone tab bar, `bg-black` in the sidebar) with a filled icon, so the state does not rely on color alone. The ochre pill was dropped (user feedback).

## Spec

1. With no hash, the Agenda page is shown and its navigation link is marked `aria-current="page"`.
2. Clicking a navigation link shows that page and moves `aria-current` to it.
3. Opening the app at `#/catalogo` shows the Catálogo page.
4. An unknown hash shows the Agenda page.
5. The admin navigation lists Agenda, Pedidos, Catálogo, in that order.

## Log

### 2026-10-25 — done

- **Outcome:** `src/app/layout/AdminShell.tsx` replaces the client header/footer: phone bottom tab bar and `md+` sidebar from one `<nav>`, sidebar `w-72`. Pages: Agenda (default), Pedidos, Catálogo, Horarios, still `PagePlaceholder`. 5/5 tests GREEN; `tsc`, `oxlint`, build clean. Approved by the user from screenshots at 1280px and 390px.
- **Pending checks:**
  - Admin login and logout depend on the API, whose technology the PDF has not decided yet.
  - The market research (deep-research workflow) is still running; review its UX findings before specifying Agenda.
- **Change 2026-10-25:** Horarios merged into Agenda (user decision); navigation now Agenda, Pedidos, Catálogo; the tab bar uses `grid-flow-col auto-cols-fr` so it adapts to the tab count. Non-current links use `text-outline` (4.48:1 on white, just under WCAG AA 4.5:1; user asked for dimmer tabs, darker token pending their answer).
- **Change 2026-10-25:** the top-bar profile was rejected by the user. Now: on phones the profile is the 4th bottom tab "Perfil"; on desktop it is the admin identity at the sidebar foot (as before), now a link to `#/perfil`. `navigation.ts` splits `SECTIONS` from `PROFILE_PAGE`. Perfil is a `PagePlaceholder` until its contents are decided. 6/6 tests GREEN.
- **Change 2026-10-25 (older admin):** base text 16px (`text-body-lg` on `<body>`), phone tab labels 14px (`text-label-lg`), non-current links back to `text-on-surface-variant` (9.30:1 on white), identity name `text-title-md`. User approved after learning the admin is an older person with little tech experience.
- **Next step:** [Agenda](agenda.md): day and week views of 30-minute slots in Cancún time, backed by an in-memory adapter behind a port until the API exists.
