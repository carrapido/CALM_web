---
status: done
---

# Estilo Apple: tokens y marco del panel

## Goal

Give the whole panel the canvas's Apple look in one pass by remapping the design tokens and restyling the shared pieces: tokens, shared atoms and molecules, and the admin shell. Page layouts (split views, detail panels, sheets) belong to features 7 to 10.

Design reference: every artboard of the "Calm Redesign" canvas shares the same sidebar, tab bar, buttons and type.

## Decisions

- **Remap tokens instead of rewriting classes.** Screens use about 20 token classes, mostly `text-on-surface`, `text-title-md` and `bg-surface-container-lowest`. Changing their values in `@theme` restyles every page consistently. Token names stay, so no page changes in this feature.
- **Palette from the mockups.** Values come from the computed styles of the mockup HTML: ground `#F2F4F7`, ink `#0F172A`, secondary text `#45464D`, cards `#FFFFFF`. Destructive red is `#C4001A`, which keeps 5.9:1 on white for 17px text.
- **Translucent fills for tinted controls.** `--color-fill` (ink at 6%) and `--color-fill-strong` (ink at 8%) work on both the gray ground and white cards, like Apple's system fill colors. `--color-separator` (ink at 8%) replaces hard borders between regions.
- **Font: Plus Jakarta Sans,** the mockups' typeface. Fallback is `-apple-system`, then `system-ui`.
- **Type scale for an older reader.** Body is 17px, Apple's default body size. Large titles are 800 weight with negative tracking (-0.025em at 40px); small labels get positive tracking (Apple, *The Details of UI Typography*, WWDC 2020).
- **Radii by remapping Tailwind's scale.** Every button and field already uses `rounded-lg` and every card `rounded-xl`, so `--radius-lg` becomes 14px and `--radius-xl` 16px (https://tailwindcss.com/docs/border-radius#customizing-your-theme). New radius tokens would have meant editing every page.
- **Unused Stitch tokens removed.** Thirty tokens (tertiary, inverse, fixed variants, small body sizes) had no class using them. Leaving them would keep the old palette's values beside the new one.
- **Buttons.**
  - Primary: solid ink, white text, bold.
  - Secondary: tinted fill, no border.
  - Danger: solid red.
  - All stay at least 56px tall, the older-admin constraint.
- **Fields keep a visible border.** The canvas draws borderless filled fields, but a filled field on white is about 1.1:1 against the card and fails WCAG 1.4.11 non-text contrast (3:1, https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). The existing 2px `--color-outline` border stays (`#767B85`, 4.4:1 on white) and keeps the field findable for the admin. macOS text fields also have a visible border, so this stays within Apple's language.
- **Materials.**
  - Only the phone tab bar is translucent: background at 82% plus `backdrop-filter: blur(24px) saturate(180%)` (https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter). Content scrolls under it, which is what a material is for.
  - The desktop sidebar is solid white. It sits beside the content, never over it, so a blur would only show the flat ground.
  - When the user asks for reduced transparency, the tab bar becomes solid. This uses a `reduced-transparency` custom variant (`@custom-variant`, https://tailwindcss.com/docs/adding-custom-styles#adding-custom-variants) over `prefers-reduced-transparency` (https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency).
  - The tab bar's classes carry `max-md:`. The custom variant is emitted after `md:`, so an unprefixed `reduced-transparency:bg-background` would beat `md:bg-transparent` and paint a gray block inside the sidebar.
- **Press feedback on pointer-down.** Buttons and links scale to 0.98 while pressed, which Apple calls response. The rule lives once in `@layer base` and uses the `scale` property (https://developer.mozilla.org/en-US/docs/Web/CSS/scale), so it never overrides a Tailwind `transform` utility. `prefers-reduced-motion` removes the scale and keeps the color change.
- **Focus.** A 3px blue focus ring (`#0B57D0`), outside the element and visible on both ink and white.
- **Navigation.**
  - Desktop: the current section is an ink pill with white text, as in the canvas.
  - Phone: a translucent tab bar where the current tab gets a filled pill (`fill-strong`) and the filled glyph. The current page is marked by shape, not only by color.
  - The `aria-label` "Navegación del panel" stays.
  - The phone header (the scissors and the brand in caps) scrolls away with the content, as in the canvas, instead of staying sticky. It gives the page its full height.
- **Page width.** `PageFrame` centers the content at a maximum of 1080px, the canvas's width. Long lines are hard to follow on a wide screen.
- **Icons stay Material Symbols.** The canvas used stroke SVGs drawn to resemble SF Symbols. Material Symbols Outlined is already wired in, and swapping the icon system changes no behavior. The brand glyph changes from `straighten` to `content_cut` (scissors), as in the canvas.

## Spec

No behavior changes: the 67 existing tests must stay GREEN. Nothing here has a runnable assertion (colors, type, materials), so the check is visual. Check both widths in the dev server:

1. At 1280px the sidebar is white beside the gray ground, and "Agenda" is an ink pill with white text.
2. At 390px the bottom tab bar is translucent, and the current tab has a filled pill and a filled glyph.
3. Buttons: primary is solid ink, secondary is a tinted fill without border, and both are at least 56px tall.
4. Body text is Plus Jakarta Sans at 17px, and page titles are 34px (phone) or 40px (desktop) at weight 800.
5. Fields keep a visible border, and an invalid field shows a red border.

## Log

### 2026-11-17

**Outcome.**
- Tokens remapped to the canvas palette, type scale and radii.
- Buttons, `ConfirmPanel`, `BrandMark`, `PageFrame` and `AdminShell` restyled.
- Global press feedback and focus ring added in `@layer base`.
- Plus Jakarta Sans replaces Hanken Grotesk.

**Checks.**
- `npx vitest run`: 67/67 GREEN.
- `oxlint` on the changed files: exit 0.
- `npm run build` (`tsc -b` and Vite): clean.

Visual check in the dev server, with computed styles:
- **Spec 1 (1280px):** white sidebar; "Agenda" is an ink pill, 50px, radius 14.
- **Spec 2 (390px):** the tab bar is 81px, `blur(24px) saturate(1.8)` at 82%; only the current tab has the filled glyph and the tint; `main` pads 96px.
- **Spec 3:** the secondary button is a 6% ink fill with no border, 56px, weight 700.
- **Spec 4:** body is Plus Jakarta Sans at 17px; the title is 40px/800 at -1px.
- **Spec 5:** fields keep the 2px border, and the empty "Nuevo servicio" form turns both fields red.

**Finding.** Material Symbols sizes never applied. Google's stylesheet sets `font-size: 24px` on `.material-symbols-outlined` outside any cascade layer, and unlayered CSS beats Tailwind's `@layer utilities`, so `text-[18px]` or `text-[24px]` on `<Icon>` does nothing. Every icon renders at 24px, measured. The brand badge therefore sizes its wrapper, not the glyph.

**Pending checks.**
- `prefers-reduced-transparency` and `prefers-reduced-motion` were checked in the built CSS only. The browser pane cannot emulate them; check them on a Mac with Reduce transparency and Reduce motion turned on.
- Cards still draw the old 2px ink border. They are page-level styles for features 7 to 10.

**Next step.** Feature 7, [Agenda del día con detalle de cita](agenda-apple.md): write its spec from the "Agenda · escritorio" and "Agenda · teléfono" artboards, then RED.
