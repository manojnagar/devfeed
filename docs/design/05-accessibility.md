# 05 — Accessibility Specification

> Target: **WCAG 2.2 Level AA** across the entire app. Every component in [02-components.md](02-components.md) and every page in [03-pages.md](03-pages.md) is reviewed against this checklist before merging. Treat any AA failure as a release blocker.

## 1. Color & contrast

- Body text MUST meet 4.5:1 against its background. Large text (18px bold or 24px+) MUST meet 3:1.
- All token pairs in [01-tokens.md](01-tokens.md) are pre-verified — never combine an arbitrary color with text.
- Indicators of state (status pills, errors, success) MUST NOT rely on color alone. Pair with an icon (✓, ⚠, ✕) and a text label.
- Focus rings MUST be visible against every background. We use a 3px outer ring at 25–30% accent opacity, which passes against both light and dark surfaces.

## 2. Focus & keyboard

### Global keyboard map

| Key                        | Behavior                                              |
| -------------------------- | ----------------------------------------------------- |
| `Tab` / `Shift+Tab`        | Move focus forward / backward                         |
| `Enter` / `Space`          | Activate focused button or link                       |
| `Esc`                      | Close modal, sheet, dropdown                          |
| `/`                        | Focus the global search input                         |
| `g h`                      | Go to home (`/`)                                      |
| `g b`                      | Go to bookmarks (signed-in users only)                |
| `g s`                      | Open `/suggest`                                       |
| `?`                        | Open keyboard shortcuts help dialog                   |
| `Cmd/Ctrl + k`             | Open command palette (typeahead search) — same as `/` |

### Focused-card shortcuts

When a `PostCard` has focus (via Tab):

| Key       | Behavior                                                       |
| --------- | -------------------------------------------------------------- |
| `b`       | Toggle bookmark                                                |
| `Enter`   | Open `PostDetailModal`                                         |
| `o`       | Open original article in new tab                               |
| `j` / `k` | Move focus to next / previous card                             |

All shortcuts MUST be discoverable via the `?` help dialog. We avoid single-letter shortcuts that conflict with browser/OS defaults.

### Focus indicators

- Every focusable element MUST have a visible focus indicator using `--df-elev-focus`.
- `:focus-visible` is preferred over `:focus` so mouse users don't see rings while keyboard users do.
- Custom components built on Radix inherit Radix's focus-trap behavior (modals, dropdowns).

## 3. Screen reader semantics

### Landmarks

Every page MUST have:

- `<header>` containing TopNav.
- `<nav>` for the FilterSidebar / settings sidebar / admin sub-nav.
- `<main>` for the primary content area.
- `<footer>` (optional, only on marketing pages).

### Headings

- One `<h1>` per page (the page title).
- Section titles use `<h2>`.
- Card titles inside lists use `<h3>`.
- Never skip levels (no `<h4>` after `<h2>`).

### Live regions

- Toasts: `role="status" aria-live="polite"` for success/info, `role="alert" aria-live="assertive"` for errors.
- Loading states that replace content (e.g. infinite scroll appending posts): announce via a visually-hidden live region "Loaded N more posts."
- Form submit success/error: focus moves to the heading of the new state (e.g. "Check your email") or to the inline error message.

### Labels

- Every form input MUST have either a visible `<label>` or an `aria-label`.
- Icon-only buttons MUST have `aria-label` matching the visible tooltip.
- `aria-describedby` for inputs that have helper text or error text.
- `aria-invalid="true"` on inputs in error state.

### Custom components

- `Switch`: `role="switch"` + `aria-checked`.
- `Tabs`: `role="tablist"` / `role="tab"` / `role="tabpanel"` with proper `aria-controls` linking.
- `Dropdown` / `Combobox`: implement the [WAI-ARIA Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) — type-ahead, arrow-key navigation, `aria-activedescendant`.
- `Modal`: `role="dialog" aria-modal="true" aria-labelledby="..."`. Focus trapped, Esc closes, focus returns to trigger.

## 4. Motion & reduced-motion

- Honor `prefers-reduced-motion`. When set, all token-based motion durations collapse to 0ms; opacity transitions remain (so things still fade in instead of popping).
- No auto-playing video or carousel. The "Featured" card on the home feed is static.
- Skeletons use a slow shimmer (1.5s loop) so they're not distracting; pause shimmer when reduced-motion is set.

## 5. Touch targets & pointer

- Min touch target on touch devices: 44×44 px (WCAG 2.5.5). Achieved via internal padding even when the visible button is smaller (e.g. icon buttons in tables expand their hit area).
- Hover states are decorative only — every hover-revealed action MUST also be reachable by tab.
- No `:hover`-only context menus. Use a visible "More" (three-dot) button instead.

## 6. Forms

- Required fields marked with `*` and `aria-required="true"`.
- Error messages appear below the field and are announced via `aria-describedby`.
- On submit failure, focus moves to the first invalid field.
- Long forms (e.g. `/suggest`) save draft in `localStorage` so a reload doesn't lose work.
- Autocomplete attributes (`autocomplete="email"`, etc.) on auth and profile fields.

## 7. Tables

- Every column header has `<th scope="col">`. Row headers (when used in admin tables) use `<th scope="row">`.
- Sort buttons inside headers are real `<button>` elements with `aria-sort` reflecting current sort state ("ascending" / "descending" / "none").
- Bulk-select checkbox in the header has indeterminate state when some (but not all) rows are selected. Announces "Select all N rows" / "Deselect all".
- Empty tables show an EmptyState row, not just a blank.

## 8. Images & media

- Every `<img>` has meaningful `alt`. Decorative images use `alt=""`.
- Publisher logos: `alt="Netflix logo"` (not "logo" — meaningful).
- Avatars with text fallback don't need an alt repeating the initials (the text is visible).
- We never use background-image for content.

## 9. Internationalization seed (v2)

- All copy lives in `lib/i18n/en.ts` with stable keys, even though v1 ships English-only. This makes adding locales in v2 mechanical.
- Date/time rendered with `Intl.RelativeTimeFormat` and `Intl.DateTimeFormat` — never hand-rolled.
- Numbers via `Intl.NumberFormat` with the user's locale.

## 10. Testing approach

| Tool                         | Used for                                                |
| ---------------------------- | ------------------------------------------------------- |
| `@axe-core/react` (dev only) | Catch a11y violations during dev, fail the console      |
| `axe-core` in Playwright     | One a11y assertion per page in e2e suite                |
| Manual VoiceOver pass        | Each new page before merge (macOS Safari)               |
| Manual NVDA pass             | Each major release (Windows Firefox)                    |
| Keyboard-only smoke test     | Each PR: complete sign-in, suggest a publisher, bookmark a post, navigate admin moderation queue using only keyboard |

A11y failures are treated as bugs, not nice-to-haves. The PR template includes a checkbox: *"I tested this with the keyboard and a screen reader"* — required to merge UI changes.
