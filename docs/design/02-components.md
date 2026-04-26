# 02 — Component Library

> Every interactive component below is documented with: **anatomy**, **variants**, **states**, **props**, **a11y**, and **where used**. Components are built on top of [shadcn/ui](https://ui.shadcn.com/) primitives — only deviations from shadcn defaults are called out.

## Index

1. [Button](#button)
2. [IconButton](#iconbutton)
3. [Input](#input)
4. [Textarea](#textarea)
5. [Select / Combobox](#select--combobox)
6. [Checkbox / Radio / Switch](#checkbox--radio--switch)
7. [Badge / Chip / StatusPill / AccessBadge](#badge-family)
8. [Avatar](#avatar)
9. [Card](#card)
10. [PostCard (composite)](#postcard)
11. [PublisherCard (composite)](#publishercard)
12. [PublisherHeader (composite)](#publisherheader)
13. [Tabs / SegmentedControl](#tabs--segmentedcontrol)
14. [Modal / Dialog](#modal--dialog)
15. [Sheet (right drawer)](#sheet)
16. [Toast](#toast)
17. [DropdownMenu](#dropdownmenu)
18. [Pagination](#pagination)
19. [Table](#table)
20. [Skeleton](#skeleton)
21. [EmptyState (composite)](#emptystate)
22. [TopNav (composite)](#topnav)
23. [Sidebar / FilterSidebar (composite)](#sidebar--filtersidebar)

---

## Button

**Variants:** `primary`, `secondary` (outlined), `ghost`, `destructive`, `link`.
**Sizes:** `sm` (28px), `md` (36px, default), `lg` (44px).

**Anatomy:** `[ optional left icon | label | optional right icon | optional loading spinner ]`. Internal padding `--df-sp-3` (sm), `--df-sp-4` (md), `--df-sp-5` (lg). Radius `--df-r-md`. Font weight 500.

**States:**

| State        | Primary                                   | Secondary                            |
| ------------ | ----------------------------------------- | ------------------------------------ |
| default      | bg `--df-accent`, text white              | bg transparent, border `--df-border-strong`, text `--df-text-primary` |
| hover        | bg `--df-accent-hover`                    | bg `--df-surface-muted`              |
| active       | bg `--df-accent-hover` + 2% darker        | bg darken 2%                         |
| focus-visible| `--df-elev-focus` ring                    | same                                 |
| disabled     | bg `--df-surface-muted`, text `--df-text-disabled`, no hover | text `--df-text-disabled`, border `--df-border` |
| loading      | spinner replaces left icon, label fades to 70%, button stays clickable=false | same |

**Props:**

```ts
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link'
  size?: 'sm' | 'md' | 'lg'
  leadingIcon?: LucideIcon
  trailingIcon?: LucideIcon
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  asChild?: boolean   // forwards to next.js Link, etc.
  children: ReactNode
}
```

**A11y:** Real `<button>` element. `aria-busy` when loading. Min touch target 36px on touch devices (sm uses 28px visual + 8px hit-area padding).

**Used on:** every page.

---

## IconButton

A square Button with no label, used for icon-only affordances (bookmark, theme toggle, "more" menu).

**Sizes:** `sm` (28×28), `md` (36×36), `lg` (44×44).
**A11y (mandatory):** `aria-label` is required. If pressed/toggled (e.g. Bookmark), use `aria-pressed`.

---

## Input

Single-line text input. Variants: default, with leading icon, with trailing icon, with inline action button.

**Anatomy:** `[ optional left icon | text | optional right slot ]`. Height 36px (sm), 40px (md, default), 48px (lg).

**States:** default, hover (border `--df-border-strong`), focus (`--df-elev-focus` ring + accent border), disabled, error (border `--df-danger`, helper text in `--df-danger`).

**Props:**

```ts
type InputProps = JSX.IntrinsicElements['input'] & {
  size?: 'sm' | 'md' | 'lg'
  leadingIcon?: LucideIcon
  trailingSlot?: ReactNode
  error?: string                 // when set, switches to error state and renders helper text
  helperText?: string
  label?: string                 // renders an above-input label, associated via htmlFor
}
```

**A11y:** Always include a visible `label` or `aria-label`. Errors announced via `aria-invalid` + `aria-describedby` pointing to the helper text id.

---

## Textarea

Same patterns as Input. Defaults to 3 rows, auto-grows up to 8 rows. Counter (e.g. "120 / 500") shown in `--df-text-muted` at the bottom-right when `maxLength` is set.

---

## Select / Combobox

We use [Radix Select](https://www.radix-ui.com/primitives/docs/components/select) for fixed lists, [downshift](https://github.com/downshift-js/downshift) (or shadcn's Combobox built on `cmdk`) for searchable lists (e.g. publisher search in admin).

Combobox specifically powers:
- Global search typeahead in `TopNav`
- Tag picker in `/suggest` and onboarding
- Publisher picker in admin source form

---

## Checkbox / Radio / Switch

- **Checkbox:** 16px square, `--df-r-sm`, indeterminate state supported (used in admin tables for "select all").
- **Radio:** 16px circle. Used in time-range filter, frequency picker, suggest form Type selector.
- **Switch:** 32×18 track. Used in `/me/digest` ("Only from publishers I follow", "Include paid posts").

All three follow the [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) for that pattern.

---

## Badge family

Multiple closely-related "small label" components — kept distinct so styling is consistent across the app.

### Badge (generic)

Tiny rectangular label. Variants: `neutral` (default), `accent`, `success`, `warning`, `danger`, `info`.

### Chip

Pill-shaped, larger than Badge. Used for **tags** in the filter sidebar and on post cards. Optional `removable` (renders trailing × button) — used in onboarding and `/me/followed-tags`.

### StatusPill

Used for source health and user status. Always renders a small dot + label.

| State        | Dot color           | Label color         | Background          |
| ------------ | ------------------- | ------------------- | ------------------- |
| Healthy      | `--df-success`      | `--df-success`      | `--df-success-bg`   |
| Warning      | `--df-warning`      | `--df-warning`      | `--df-warning-bg`   |
| Failing      | `--df-danger`       | `--df-danger`       | `--df-danger-bg`    |
| Active       | `--df-success`      | `--df-text-primary` | transparent         |
| Banned       | `--df-danger`       | `--df-danger`       | `--df-danger-bg`    |

### AccessBadge (NEW with publisher unification)

Indicates whether a post is `free` or `paid` (and which provider).

| `access_label`   | Visual                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| `free`           | `Free` — neutral chip in muted text. Often **not rendered** to reduce noise; only shown when post is in a paid context. |
| `paid`           | `Paid · Substack` — amber background `--df-paid` at 12% opacity, amber text, lock icon |
| `members_only`   | `Members only · Ghost` — same amber, key icon                           |
| `mixed`          | `Some paid` — neutral with amber lock icon                              |

A11y: each badge has a tooltip explaining the label fully.

---

## Avatar

Circular image with text fallback (initials on a hashed background color).

**Sizes:** `xs` 20, `sm` 24, `md` 32 (default), `lg` 48, `xl` 64.

For publishers, an Avatar shape can change:

- `type='company'` → square rounded (`--df-r-md`) with logo. Background is the company's brand color if known.
- `type='person'` → fully circular with photo or initials.

---

## Card

Generic surface used as the base for most composites. Padding `--df-sp-6` default. Border `1px solid --df-border` in dark, shadow `--df-elev-1` in light. Radius `--df-r-lg`.

Variants: `default`, `interactive` (adds hover state: subtle border + 1px translate-y), `nested` (no border, used inside drawers).

---

## PostCard

The most-used composite. Documented in detail because every pixel matters.

**Anatomy (top → bottom):**

```
┌──────────────────────────────────────────────────────────┐
│  [Avatar 28]  Publisher name · 4h ago      [type icon]   │  ← header row
│                                                          │
│  Post title in --df-text-lg, max 2 lines, ellipsis       │  ← title
│                                                          │
│  Two-line summary in --df-text-base, --df-text-muted     │  ← summary (optional)
│                                                          │
│  [Tag][Tag] [AccessBadge]               6m · [✦][⌂]      │  ← footer row
└──────────────────────────────────────────────────────────┘
```

- The `[type icon]` in the header right is a tiny 14px icon: `Building2` (company), `User` (person). Tooltip on hover.
- The footer right has: read-time, bookmark icon button (`Bookmark` / `BookmarkCheck`), and on logged-in user — an "open in modal" button (`Maximize2`). Anonymous users only see read-time + bookmark (which gates to login).
- `AccessBadge` is omitted entirely when the post is free (default), to reduce visual noise. It only appears for `paid`, `members_only`, `mixed`.

**Variants:**

- `default` — full card as above. Used on home feed, publisher detail, tag detail.
- `compact` — single-row variant (avatar + title + meta). Used in: bookmarks "list" view, search dropdown, related-posts in modal.
- `featured` — taller card with a 2-line title at `--df-text-xl` and a 3-line summary. Used at top of feed for "Trending today" (max 1 per page).

**Interactive states:**

- Hover on card: border becomes `--df-border-strong`, subtle 1px translate-y, cursor pointer.
- Click on card title or summary: opens `PostDetailModal`.
- Click on bookmark: toggles bookmark, with an inline toast confirmation.
- Click on tag chip: navigates to that tag page.
- Click on publisher name/avatar: navigates to publisher page.

**A11y:** entire card is wrapped in an `<article>`. Title is an `<h3>`. The card itself is NOT clickable as a whole — instead, individual targets (title, publisher, tags, bookmark) have their own `<button>`/`<a>` so screen readers can enumerate actions cleanly.

**Used on:** Home feed, publisher detail, tag detail, search results, bookmarks page, email digest.

---

## PublisherCard

Renders a publisher in card form (used in admin `/admin/publishers` grid, and as a "live preview" in `/suggest`).

Shape varies by `type` (see Avatar section above), and the metadata row below the name shows different fields:

- `company`: domain · post count · followers
- `person`: handle · post count · location

---

## PublisherHeader

Hero-style card on `/publishers/[slug]`. 32px padding. Two layouts:

### Company variant

```
[64×64 logo]   Company Name (28px bold)                        [Follow ▾]
               One-line description (14px muted)                12,408 followers
               
               [domain ↗]  [● RSS feed active]  [Last post 4h ago]  [247 posts indexed]
```

### Person variant

```
[64×64 avatar]  Person Name (28px bold)              [Follow ▾]
                One-line bio (14px muted)             1,204 followers
                
                [@handle on X ↗] [@handle on GH ↗]  [Personal site ↗]
                [● RSS feed active]  [Last post 6h ago]  [82 posts indexed]
```

---

## Tabs / SegmentedControl

- **Tabs**: text labels with an indigo underline on the active. Used in publisher detail (All posts / Most read / Recently added) and admin sub-nav.
- **SegmentedControl**: pill toggle group with full-width fill on the active item. Used in `/me/bookmarks` ("Group by: Company / Tag / Date") and the publisher-type filter (Companies / People) in the home sidebar.

---

## Modal / Dialog

Centered overlay. Backdrop `rgba(0,0,0,0.5)` in light, `rgba(0,0,0,0.7)` in dark. Closes on Esc and on backdrop click (configurable per modal). Focus trapped inside, focus returns to trigger on close.

**Sizes:** `sm` (380), `md` (480), `lg` (640, default for `PostDetailModal`), `xl` (800).

**Used for:** post detail modal, all destructive confirms.

---

## Sheet

Right-side drawer, 380px wide, used for admin add/edit forms. Slides in from the right. Same a11y patterns as Modal. The sheet is shown beside the underlying page (not centered) so the admin can still read the row they were editing.

---

## Toast

Bottom-right stack, max 3 visible at a time. Auto-dismiss after 4 seconds (or 6s for errors). Variants: `success`, `error`, `info`, `loading` (spinner replaces icon).

Used for: bookmark added, follow added, suggestion submitted, save success, ingest cron triggered manually, etc.

A11y: rendered into a `role="status"` live region (or `role="alert"` for errors).

---

## DropdownMenu

Built on Radix DropdownMenu. Used for: profile dropdown in TopNav, "more" (three-dot) on table rows, "Sort by" in lists, "Approve & notify" split-button in moderation.

---

## Pagination

`< 1 2 3 ... 47 >` style. Renders up to 7 page numbers with ellipses. Combined with a "Rows per page" select on the left in admin tables.

A11y: each page number is a `<button>` with `aria-current="page"` on the active one.

---

## Table

Built on shadcn Table primitives. Sticky header, optional zebra rows, sortable columns (click header to toggle direction), bulk-select column with indeterminate state, sticky last column for actions.

Used on: `/admin/sources`, `/admin/users`, `/admin/moderation` (detail panel uses a 2-column metadata grid, not a Table).

---

## Skeleton

Animated shimmer placeholders. We render skeletons for:

- The 4 KPI cards on `/admin/overview` while data fetches.
- 5 PostCard placeholders on `/`, `/publishers/[slug]`, `/tags/[slug]`.
- The chart areas on `/admin/analytics`.

A11y: wrapped in a `role="status"` with `aria-label="Loading content"`. Replaced with real content on resolve.

---

## EmptyState

Composite of: an 80px line-art icon, a 20px bold heading, a 2-line description, a primary CTA, and an optional secondary link. Used for: bookmarks empty, no followed publishers, no posts in tag, no search results, no pending suggestions.

The illustration set is custom line-art (lucide-style) — kept as inline SVG in `components/empty-states/`.

---

## TopNav

Sticky top bar, 64px tall. Layout:

`[ Logo ]  [ Search (centered, 480 max-w) ]  [ Theme toggle ] [ Sign in / Avatar ]`

- On scroll, gains a subtle `--df-border` bottom shadow.
- On mobile (`< --df-bp-md`), search collapses to an icon, and the avatar/menu becomes a hamburger.
- Logo: indigo chevron + "DevFeed" wordmark. Clicking returns to `/`.

---

## Sidebar / FilterSidebar

Sticky 260px column. Filter sections in this order:

1. **Publisher type** (NEW): SegmentedControl with two options — Companies, People — multi-select. Default: both on.
2. **Filter by publisher**: scrollable checkbox list (top 6 shown, "Show all 47" link below). Each row: 20px avatar + name. Search input above the list.
3. **Filter by tag**: chip cloud, multi-select.
4. **Access**: toggle pair "Free" + "Paid". Default: both on.
5. **Time range**: radio (24h / 7d / 30d / All time). Default: 7d.

On mobile, the sidebar becomes a Sheet that slides up from the bottom on tap of a "Filters" button. Includes a footer "Apply" button (the desktop version applies on each click).
