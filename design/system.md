# CALM design system

Synced from `src/index.css` (Tailwind v4 `@theme`), `src/utils/button-classes.ts`, `src/components/SegmentedControl.tsx` and `src/components/PageFrame.tsx`. Apple-style tokens from the "Calm Redesign" canvas (`odd/tasks/apple-shell.md`).

## Colors

| Token | Value | Usage | Source |
| --- | --- | --- | --- |
| `--color-background` | `#f2f4f7` | Page ground (gray) | `src/index.css` |
| `--color-surface-container-lowest` | `#ffffff` | Cards, selected segment | `src/index.css` |
| `--color-surface-container-low` | `#f7f8fa` | Subtle surface | `src/index.css` |
| `--color-surface-container` | `#eceef2` | Surface | `src/index.css` |
| `--color-surface-container-high` | `#e6e9ee` | Surface | `src/index.css` |
| `--color-surface-container-highest` | `#dde1e7` | Surface | `src/index.css` |
| `--color-on-surface` | `#0f172a` | Body ink | `src/index.css` |
| `--color-on-surface-variant` | `#45464d` | Secondary ink | `src/index.css` |
| `--color-outline` | `#767b85` | Field borders | `src/index.css` |
| `--color-outline-variant` | `#c9cdd4` | Soft borders | `src/index.css` |
| `--color-fill` | `rgb(15 23 42 / 0.06)` | Secondary buttons, segmented track | `src/index.css` |
| `--color-fill-strong` | `rgb(15 23 42 / 0.08)` | Hover fill | `src/index.css` |
| `--color-separator` | `rgb(15 23 42 / 0.08)` | Hairlines | `src/index.css` |
| `--color-focus` | `#0b57d0` | Focus ring | `src/index.css` |
| `--color-now` | `#d70015` | "Ahora" line, today | `src/index.css` |
| `--color-primary` | `#0f172a` | Primary button | `src/index.css` |
| `--color-on-primary` | `#ffffff` | Text on primary | `src/index.css` |
| `--color-primary-container` | `#1e293b` | Primary hover | `src/index.css` |
| `--color-secondary-container` | `#fff4d6` | Warm tint | `src/index.css` |
| `--color-on-secondary-fixed` | `#6b4a00` | Ink on warm tint | `src/index.css` |
| `--color-success-container` | `#e3f5e9` | "Listo para recoger" chip | `src/index.css` |
| `--color-on-success-container` | `#0b5b2a` | Ink on success | `src/index.css` |
| `--color-error` | `#c4001a` | Destructive | `src/index.css` |
| `--color-on-error` | `#ffffff` | Text on error | `src/index.css` |
| `--color-error-container` | `#fdecec` | Error tint | `src/index.css` |
| `--color-on-error-container` | `#9b0014` | Ink on error tint | `src/index.css` |

## Typography

Font stack: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif` (`src/index.css`).

| Token | Value | Source |
| --- | --- | --- |
| `--text-display-lg` | `40px / 42px, -0.025em, 800` | `src/index.css` |
| `--text-display-lg-mobile` | `34px / 38px, -0.02em, 800` | `src/index.css` |
| `--text-headline-lg` | `24px / 30px, -0.015em, 800` | `src/index.css` |
| `--text-headline-md` | `20px / 26px, -0.01em, 700` | `src/index.css` |
| `--text-headline-sm` | `17px / 24px, -0.005em, 700` | `src/index.css` |
| `--text-title-md` | `17px / 22px, 0, 600` | `src/index.css` |
| `--text-body-lg` | `17px / 24px, 0, 400` | `src/index.css` |
| `--text-body-md` | `15px / 20px, 0, 400` | `src/index.css` |
| `--text-label-lg` | `14px / 18px, 0.01em, 700` | `src/index.css` |
| `--text-label-technical` | `12px / 16px, 0.08em, 800` | `src/index.css` |

## Spacing

| Token | Value | Source |
| --- | --- | --- |
| `--spacing-space-xs` | `0.25rem` | `src/index.css` |
| `--spacing-space-sm` | `0.5rem` | `src/index.css` |
| `--spacing-space-md` | `1rem` | `src/index.css` |
| `--spacing-space-lg` | `1.5rem` | `src/index.css` |
| `--spacing-space-xl` | `2rem` | `src/index.css` |
| `--spacing-margin` | `1rem` | `src/index.css` |
| `--spacing-margin-desktop` | `2rem` | `src/index.css` |

## Radius

| Token | Value | Usage | Source |
| --- | --- | --- | --- |
| `--radius-lg` | `0.875rem` | Buttons, fields | `src/index.css` |
| `--radius-xl` | `1rem` | Cards | `src/index.css` |

## Shadows

| Token | Value | Source |
| --- | --- | --- |
| `--shadow-card` | `0 1px 2px rgb(15 23 42 / 0.05), 0 8px 24px rgb(15 23 42 / 0.06)` | `src/index.css` |

## Components

- **Button** (`button-classes.ts`): min height 56px, `rounded-lg`, `title-md` bold. Variants: primary (ink fill, white text), secondary (`fill`), danger (`error`), subtleDanger (white, red words).
- **SegmentedControl** (`SegmentedControl.tsx`): `fill` track, radius 13px, padding 3px; segments min height 48px, radius 10px, `body-md`; selected is white, extrabold, shadow `0 1px 3px rgb(15 23 42 / 0.14)`; `role=group` + `aria-pressed`.
- **PageFrame** (`PageFrame.tsx`): content max 1080px centered; h1 `display-lg` (mobile `display-lg-mobile`) with an action beside it.
- **Focus**: 3px `--color-focus` outline, 2px offset. **Press**: scale 0.98, off with reduced motion.
- **Rules** (`odd/tasks/apple-shell.md`, `pedidos-apple.md`, `agenda-apple.md`): state is carried by words, not color alone; green only for "Listo para recoger" and "Cliente en camino"; confirmations inline, never modal; list beside detail from 768px, detail as its own screen below.
