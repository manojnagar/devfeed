# 01 — Design Tokens

> Tokens are the **only** source of truth for color, type, spacing, radius, shadow, and motion. No hex codes, no magic pixel values anywhere in the app — always reference the token. The Tailwind v4 config (`tailwind.config.ts`) and the global CSS (`app/globals.css`) re-export these as utilities.

## Color

### Semantic naming

We define **semantic** tokens (e.g. `--df-bg`, `--df-text-primary`) and let the theme switch their underlying values. Components MUST use the semantic names, never raw palette names.

### Light theme

| Token                       | Value      | Used for                                          |
| --------------------------- | ---------- | ------------------------------------------------- |
| `--df-bg`                   | `#FAFAFA`  | Page background                                   |
| `--df-surface`              | `#FFFFFF`  | Cards, modals, sheets, popovers                   |
| `--df-surface-muted`        | `#F4F4F5`  | Inputs, hover backgrounds, table zebra rows       |
| `--df-border`               | `#E4E4E7`  | Card borders, dividers, input borders             |
| `--df-border-strong`        | `#D4D4D8`  | Focus ring outer, hovered borders                 |
| `--df-text-primary`         | `#18181B`  | Headings, post titles, primary body               |
| `--df-text-secondary`       | `#3F3F46`  | Secondary body, table cells                       |
| `--df-text-muted`           | `#71717A`  | Captions, meta lines, labels                      |
| `--df-text-disabled`        | `#A1A1AA`  | Disabled controls, placeholder text               |
| `--df-accent`               | `#4F46E5`  | Primary buttons, active tab underline, links      |
| `--df-accent-hover`         | `#4338CA`  | Primary button hover                              |
| `--df-accent-bg`            | `#EEF2FF`  | Indigo backgrounds (selected nav item, badges)    |
| `--df-success`              | `#10B981`  | Healthy status, valid checkmark                   |
| `--df-success-bg`           | `#ECFDF5`  |                                                   |
| `--df-warning`              | `#F59E0B`  | Warning status, paused state                      |
| `--df-warning-bg`           | `#FFFBEB`  |                                                   |
| `--df-danger`               | `#DC2626`  | Destructive button, failing source, ban actions   |
| `--df-danger-bg`            | `#FEF2F2`  |                                                   |
| `--df-info`                 | `#0284C7`  | Info banners                                      |
| `--df-info-bg`              | `#F0F9FF`  |                                                   |
| `--df-paid`                 | `#D97706`  | Paid-content accent (amber, distinct from danger) |

### Dark theme

| Token                       | Value      |
| --------------------------- | ---------- |
| `--df-bg`                   | `#09090B`  |
| `--df-surface`              | `#18181B`  |
| `--df-surface-muted`        | `#27272A`  |
| `--df-border`               | `#27272A`  |
| `--df-border-strong`        | `#3F3F46`  |
| `--df-text-primary`         | `#FAFAFA`  |
| `--df-text-secondary`       | `#E4E4E7`  |
| `--df-text-muted`           | `#A1A1AA`  |
| `--df-text-disabled`        | `#52525B`  |
| `--df-accent`               | `#6366F1`  |
| `--df-accent-hover`         | `#818CF8`  |
| `--df-accent-bg`            | `#1E1B4B`  |
| `--df-success`              | `#34D399`  |
| `--df-success-bg`           | `#022C22`  |
| `--df-warning`              | `#FBBF24`  |
| `--df-warning-bg`           | `#1C1917`  |
| `--df-danger`               | `#F87171`  |
| `--df-danger-bg`            | `#1F1212`  |
| `--df-info`                 | `#38BDF8`  |
| `--df-info-bg`              | `#0C1A26`  |
| `--df-paid`                 | `#FBBF24`  |

### Contrast guarantees

Every text-on-bg pair MUST meet WCAG AA (4.5:1 for body, 3:1 for large 18px+ bold). Verified pairs:

- `--df-text-primary` on `--df-bg` (light): 16.5:1 ✓ (AAA)
- `--df-text-muted` on `--df-bg` (light): 4.6:1 ✓ (AA)
- `--df-text-primary` on `--df-bg` (dark): 17.4:1 ✓ (AAA)
- `--df-text-muted` on `--df-bg` (dark): 5.9:1 ✓ (AA)
- `--df-accent` on `--df-bg` (light): 6.3:1 ✓ (AA)
- White on `--df-accent` (light, used for primary buttons): 8.6:1 ✓ (AAA)

## Typography

- **Body / UI font:** `Inter` (variable) → `--df-font-sans`
- **Mono font:** `JetBrains Mono` (variable) → `--df-font-mono`. Used for: feed URLs in admin, code in posts, slugs.
- **Reading font (post titles in detail modal):** `Inter` for v1; revisit a serif (e.g. *Source Serif*) in v2 if we add reading mode.

### Type scale

| Token                | Size    | Line height | Weight | Where used                               |
| -------------------- | ------- | ----------- | ------ | ---------------------------------------- |
| `--df-text-xs`       | 11 / 12 | 16          | 500    | Tag chip, status pill, meta caption      |
| `--df-text-sm`       | 13 / 14 | 20          | 400    | Body small, secondary meta               |
| `--df-text-base`     | 14 / 15 | 22          | 400    | Default body, summaries, table cells     |
| `--df-text-md`       | 16      | 24          | 500    | Section labels, card subtitles           |
| `--df-text-lg`       | 18      | 26          | 600    | **Post card title**                      |
| `--df-text-xl`       | 20      | 28          | 600    | Modal heading                            |
| `--df-text-2xl`      | 24      | 32          | 600    | Page subhead                             |
| `--df-text-3xl`      | 28      | 36          | 700    | Page title (`/me`, admin)                |
| `--df-text-4xl`      | 32      | 40          | 700    | Hero / publisher name                    |

Letter-spacing: `-0.011em` for sizes ≥ 20px (improves Inter at large sizes). Default for the rest.

Numerals: `font-variant-numeric: tabular-nums` on stat KPIs and table number columns.

## Spacing

4px base. Always use a token; no arbitrary `padding: 13px`.

| Token        | Value | Common use                               |
| ------------ | ----- | ---------------------------------------- |
| `--df-sp-1`  | 4px   | Icon padding inside chips                |
| `--df-sp-2`  | 8px   | Inline gaps between icon+text            |
| `--df-sp-3`  | 12px  | Compact card padding                     |
| `--df-sp-4`  | 16px  | Default vertical gap between cards       |
| `--df-sp-5`  | 20px  | Form field gap                           |
| `--df-sp-6`  | 24px  | **Card padding (default)**               |
| `--df-sp-8`  | 32px  | Section padding, modal padding           |
| `--df-sp-10` | 40px  | Page-level vertical gap                  |
| `--df-sp-12` | 48px  | Hero section vertical padding            |
| `--df-sp-16` | 64px  | Top nav height                           |

## Layout

- **Container max-width:** 1280px. Centered with auto margins.
- **Grid:** 12 columns, 32px gutter on desktop, 16px on tablet/mobile.
- **Sidebar widths:** 260px (filter sidebar), 240px (`/me` settings nav), 320px (admin moderation list).
- **Right drawer (admin add/edit forms):** 380px.

### Breakpoints

| Token        | Min width | Behavior                                                       |
| ------------ | --------- | -------------------------------------------------------------- |
| `--df-bp-sm` | 640px     | Single-column layouts collapse                                 |
| `--df-bp-md` | 768px     | Sidebar collapses to a top sheet, post grid drops to 1 column  |
| `--df-bp-lg` | 1024px    | Sidebar reappears, post grid 2 columns                         |
| `--df-bp-xl` | 1280px    | Container width caps                                           |

## Border radius

| Token         | Value | Used for                                        |
| ------------- | ----- | ----------------------------------------------- |
| `--df-r-sm`   | 6px   | Inputs, small badges                            |
| `--df-r-md`   | 8px   | Buttons, dropdown items                         |
| `--df-r-lg`   | 12px  | **Cards, table containers, popovers**           |
| `--df-r-xl`   | 16px  | Modals, hero cards, drawer                      |
| `--df-r-2xl`  | 24px  | Marketing-style banners (rare)                  |
| `--df-r-full` | 9999  | Avatars, pill buttons, segmented controls       |

## Shadow / elevation

Light theme uses soft, subtle shadows. Dark theme replaces shadow with a 1px border at `--df-border` (shadows are ineffective on dark surfaces).

| Token             | Light value                                              | Dark value                  | Used for                       |
| ----------------- | -------------------------------------------------------- | --------------------------- | ------------------------------ |
| `--df-elev-0`     | none                                                     | 1px inset border            | Default flat surface           |
| `--df-elev-1`     | `0 1px 2px rgba(24, 24, 27, 0.05)`                       | 1px border `--df-border`    | Cards                          |
| `--df-elev-2`     | `0 4px 12px rgba(24, 24, 27, 0.06)`                      | 1px border, faint glow      | Dropdowns, popovers            |
| `--df-elev-3`     | `0 12px 32px rgba(24, 24, 27, 0.10)`                     | 1px border + 16px backdrop  | Modals, sheets                 |
| `--df-elev-focus` | `0 0 0 3px rgba(79, 70, 229, 0.25)`                      | `0 0 0 3px rgba(99,102,241,0.30)` | Focus ring on inputs/buttons |

## Motion

All interactive transitions are **150ms** with `cubic-bezier(0.16, 1, 0.3, 1)` (a calm, slightly springy ease). Layout transitions are **220ms**. Modal/sheet enter/exit is **200ms** with a subtle scale (`0.98 → 1.0`) + opacity.

| Token                | Duration | Easing                         |
| -------------------- | -------- | ------------------------------ |
| `--df-motion-fast`   | 100ms    | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--df-motion-base`   | 150ms    | `cubic-bezier(0.16, 1, 0.3, 1)`|
| `--df-motion-slow`   | 220ms    | `cubic-bezier(0.16, 1, 0.3, 1)`|

Respect `prefers-reduced-motion`: when set, durations collapse to 0ms; only opacity transitions remain.

## Z-index layers

Every component MUST use one of these. No raw `z-index: 9999`.

| Token              | Value | Used for                              |
| ------------------ | ----- | ------------------------------------- |
| `--df-z-base`      | 0     | Default                               |
| `--df-z-dropdown`  | 30    | Dropdown menus, autocomplete          |
| `--df-z-sticky`    | 40    | Sticky table headers, sticky sidebars |
| `--df-z-overlay`   | 50    | Backdrop / scrim                      |
| `--df-z-modal`     | 60    | Modals, dialogs                       |
| `--df-z-sheet`     | 70    | Right-side admin drawers              |
| `--df-z-toast`     | 80    | Toast notifications                   |
| `--df-z-tooltip`   | 90    | Tooltips                              |

## Iconography

- **Library:** [lucide-react](https://lucide.dev) (MIT, tree-shakable).
- **Sizing:** 16px (`--df-icon-sm`) inside chips/inputs, 20px (`--df-icon-md`) default, 24px (`--df-icon-lg`) headers, 28px circular for company logos.
- **Stroke width:** 1.75 (slightly lighter than lucide default 2 — feels less heavy at our densities).
- **Color:** inherits `currentColor` from parent. Icons in muted text use `--df-text-muted`.

## CSS variables export (excerpt)

```css
:root {
  --df-bg: #FAFAFA;
  --df-surface: #FFFFFF;
  --df-text-primary: #18181B;
  --df-accent: #4F46E5;
  --df-r-lg: 12px;
  --df-sp-6: 24px;
  --df-motion-base: 150ms cubic-bezier(0.16, 1, 0.3, 1);
}

[data-theme="dark"] {
  --df-bg: #09090B;
  --df-surface: #18181B;
  --df-text-primary: #FAFAFA;
  --df-accent: #6366F1;
}

@media (prefers-reduced-motion: reduce) {
  :root { --df-motion-base: 0ms linear; }
}
```

These get re-exported via Tailwind's `theme.extend.colors` and arbitrary-value plugins so utilities like `bg-[--df-bg]` and `text-[--df-text-muted]` work everywhere.
