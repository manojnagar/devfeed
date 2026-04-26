# 03 — Page Specifications

> One section per route. Each section documents: **path**, **auth**, **purpose**, **layout**, **sections in order**, **states (empty / loading / error)**, **edge cases**, and **mockup reference**.

## Route map

```
PUBLIC
  /                              Home feed
  /publishers/[slug]             Publisher detail (company / person)
  /tags/[slug]                   Tag detail
  /search                        Search results
  /suggest                       Unified suggest-a-publisher form (auth required)
  /login                         Login + signup (one screen, magic link + Google)
  /onboarding                    Post-signup 3-step onboarding
  /out/[postId]                  Server route: log read_event, 302 to canonical_url
  /404, /500, /offline           Errors + service-worker fallback

AUTHENTICATED
  /me                            Redirects to /me/digest
  /me/digest                     Email digest preferences
  /me/followed-publishers        Manage followed publishers
  /me/followed-tags              Manage followed tags
  /me/bookmarks                  Bookmarks (grouped, bulk actions)
  /me/notifications              In-app notification feed (suggestion approved, etc.)
  /me/account                    Profile, timezone, sign-out, delete-account
  /me/suggestions                Status of the user's own publisher suggestions

ADMIN (role=admin)
  /admin                         Redirects to /admin/overview
  /admin/overview                KPIs, recent admin actions, quick links
  /admin/sources                 Blog sources CRUD
  /admin/publishers              Publishers CRUD (filterable by type)
  /admin/tags                    Tags CRUD (rename, merge, color)
  /admin/users                   Users CRUD (search, role, ban)
  /admin/moderation              publisher_suggestions queue
  /admin/analytics               Detailed charts
  /admin/settings                Cron status, env diagnostics, feature flags
```

---

## Public

### `/` — Home feed

- **Auth:** none required. Personalized if signed in (re-orders by followed publishers/tags), otherwise shows global "Latest" + "Trending".
- **Purpose:** Primary discovery surface.
- **Layout:** TopNav · 12-col grid · 260px FilterSidebar (sticky left) · main column with tabs + post grid.
- **Sections in order:**
  1. Page title `Latest from engineering` (28px bold) — replaces with `Hi, Manoj — your feed today` when signed in.
  2. Tab bar: `Latest` / `Trending` / `For you` (last only when signed in). URL-driven: `?sort=latest|trending|foryou`.
  3. Optional `Featured` PostCard (1 max) — only on Trending tab when there's a clear winner (>2× next post's reads).
  4. PostCard grid (2 columns desktop, 1 mobile). 25 posts initial, infinite scroll up to 200, then "Load more" button to extend.
- **Filter sidebar (NEW with publisher unification):** Publisher Type (segmented), Publisher (checkbox list), Tag (chip cloud), Access (Free/Paid toggle), Time range (radio).
- **States:**
  - Empty (no posts match filters): EmptyState "No posts match your filters" + "Clear filters" CTA.
  - Loading: Skeleton sidebar + 5 skeleton cards.
  - Error: ErrorState "Something went wrong loading the feed" with retry button.
- **Edge cases:**
  - Anonymous user clicks bookmark → opens login modal with "Sign in to save this post" header and a redirect-back param.
  - All filters off in publisher type → falls back to "Showing all types".
- **Mockup:** `devfeed-01-home-light.png`, `devfeed-02-home-dark.png`, `devfeed-24-home-with-typefilter.png` (showing the new type filter + access badges).

---

### `/publishers/[slug]` — Publisher detail

- **Auth:** none required.
- **Purpose:** Drill into one publisher's post stream.
- **Layout:** TopNav · breadcrumb (`Publishers / Netflix`) · `PublisherHeader` (variant by type) · tab bar · post grid.
- **Sections in order:**
  1. Breadcrumb.
  2. `PublisherHeader` — variant matches `publisher.type` (see [02-components: PublisherHeader](02-components.md#publisherheader)).
  3. Tab bar: `All posts` / `Most read` / `Recently added` (replaces filter sidebar — there's only one publisher).
  4. PostCard grid (2 cols desktop, 1 mobile). 24 per page; pagination at the bottom.
- **States:**
  - Empty: "No posts indexed yet" + "Check back soon" + (admin only) "Trigger fetch now" button.
  - Source-failing banner (top of page): if `last_fetched_at` was successful >7d ago, show an amber banner "We haven't been able to reach this feed since [date]. Posts may be stale."
- **Edge cases:**
  - Publisher with multiple sources (rare): header shows the canonical website; tab bar gains a "Sources (3)" link to a tooltip listing all source URLs.
- **Mockups:** `devfeed-04-company-page-light.png` (company variant), `devfeed-22-publisher-person-light.png` (person variant).

---

### `/tags/[slug]` — Tag detail

- **Auth:** none.
- **Purpose:** Drill into one topic across all publishers.
- **Layout:** TopNav · breadcrumb · tag header · related-tags strip · 2-col main with "Top publishers in this tag" sidebar + post grid.
- **Mockup:** `devfeed-05-tag-page-dark.png`.
- **States:** Empty → EmptyState "No posts under this tag yet · Suggest a publisher".

---

### `/search` — Search results

- **Auth:** none.
- **Purpose:** Full-text search across posts, plus discovery of publishers and tags.
- **Layout:** TopNav (with focused search) · facet bar · result grid.
- **Sections:**
  1. `Search results for "kubernetes"` heading + result count subtitle.
  2. Facet bar (chips): All · Posts (60) · Publishers (1) · Tags (2). URL-driven `?facet=posts|publishers|tags`.
  3. Result grid (PostCard for posts, PublisherCard for publishers, simple tag pill list for tags).
- **States:**
  - No results: EmptyState "No matches for X" with "Did you mean Y?" suggestion if Postgres trigram returns a close match (Levenshtein < 3).
- **Edge cases:** Query string is empty → render an "explore" page showing top tags, top publishers, and top posts of the week.
- **Mockup (planned):** `devfeed-12-search-light.png` (typeahead + dedicated page combined).

---

### `/suggest` — Unified suggest-a-publisher form

- **Auth:** required (to prevent spam).
- **Purpose:** Anyone signed in can suggest a publisher of any type. Admin moderates.
- **Layout:** TopNav · centered single column (max-w 720px) · header · info banner · form card · live preview floating card (right edge).
- **Sections:**
  1. Back-link `← All publishers`.
  2. Page title `Suggest a publisher` + sub `Know an engineering blog we should add?`.
  3. Info banner: "Your suggestion is private until reviewed. We aim to review within 48 hours. You'll get an email."
  4. **Form card** (white, 16px radius, 32px padding):
     - **Type selector** (NEW): radio cards horizontal — `Company` / `Person`. Toggling reveals/hides type-specific fields.
     - Common fields: Name, Website (auto-validated), Feed URL (auto-detect link button), Type of feed (RSS/Atom/Auto-detect/Scrape).
     - Person-only fields: Twitter handle, GitHub handle, Bio (textarea, optional).
     - Suggested tags (chip multi-select, min 1, max 5).
     - Justification (textarea, optional, max 500 chars).
  5. Footer: Cancel · Submit suggestion (primary).
- **Live preview card (right):** renders a `PublisherCard` of the type being suggested, updated as the user types.
- **Validation:**
  - Website must be `http(s)://` and not a private IP (SSRF guard).
  - Name not duplicate of an existing publisher (server-side check after blur on Name field; show inline warning with link to existing).
  - Rate limit (server-enforced): max 3 pending per user, max 10 total per user per week.
- **Submit success:** redirect to `/me/suggestions` with a toast `Submitted! We'll review within 48 hours.`
- **Mockup (planned):** `devfeed-20-suggest-publisher-light.png`.

---

### `/login` — Login + signup

- **Auth:** anonymous only; redirects signed-in users to `/`.
- **Purpose:** Email magic link + Google + GitHub OAuth. No passwords.
- **Layout:** Centered card 420px on a full-bleed background.
- **Sections:** logo, heading "Welcome back", sub, OAuth buttons (Google, GitHub), divider "OR", email input, "Send magic link" primary button, footer (Terms + Privacy).
- **States:**
  - Sent: replaces card with "Check your email" confirmation + resend button (60s cooldown).
  - Error: inline error in the form ("This email is blocked", "Too many attempts").
- **Mockup:** `devfeed-06-login-both-themes.png`.

---

### `/onboarding` — 3-step setup

- **Auth:** required, runs once after first sign-in. Skippable on each step.
- **Purpose:** Get user to a personalized feed in <60s.
- **Layout:** Centered, no sidebar, top progress bar with 3 dots.
- **Steps:**
  1. **Pick publishers** (min 3 to enable Continue, but Skip allowed). Grid of 12 popular publishers + search.
  2. **Pick tags**. Big chip cloud, no minimum.
  3. **Digest frequency**. Three large choice cards (Daily / Weekly / Off) + time + timezone.
- **On finish:** sets `profiles.onboarded_at`, redirects to `/`.
- **Edge cases:** if user closes mid-flow, next sign-in puts them back at the same step.
- **Mockup (planned):** `devfeed-15-onboarding-light.png`.

---

### `/out/[postId]` — Outbound redirect

- Server-only route. Logs `read_events` row (with hashed IP/UA + anonymous_id), then 302 redirects to the post's `canonical_url`.
- Rate-limited per anonymous_id (1/sec) to prevent log abuse.

---

### `/404`, `/500`, `/offline`

- All three: TopNav (faded) · centered illustration glyph · heading · 2-line description · primary CTA · secondary link.
- 404: "We couldn't find that page" + "Back to home".
- 500: "Something went wrong on our end" + "Try again" + status page link.
- Offline: "You're offline" + "View cached bookmarks" — only reachable when service worker is active and network fails.
- **Mockup (planned):** `devfeed-16-error-states.png`.

---

## Authenticated

### `/me/digest` — Email digest preferences

- **Auth:** required.
- **Layout:** TopNav · 240px settings sidebar (sticky) · 2-col main (form on left, "Recent digests" on right).
- **Cards:**
  1. Frequency (3-card radio).
  2. Schedule (Send time + Timezone).
  3. Content filter (Switches: Only from followed publishers; Only with followed tags; Include paid posts). Note (NEW): the paid-post toggle is explicit so users can opt out at the digest level.
  4. Followed publishers (chip grid + Add).
  5. Recent digests (mini table, last 4).
- **Footer:** Save changes (primary, sticky on mobile) + Send a test digest (link).
- **Mockup:** `devfeed-07-user-dashboard-dark.png`.

### `/me/followed-publishers`

- Table view: avatar, name, type badge, posts in last 30d, Following since, Unfollow button. Searchable. Sortable by recent activity.

### `/me/followed-tags`

- Chip grid view + Add. Each chip shows post count and Unfollow on hover.

### `/me/bookmarks`

- Toolbar: search, Group by (Company / Tag / Date), Bulk select, Export OPML.
- Grouped collapsible list. Bulk actions floating bottom bar when items selected.
- **Mockup (planned):** `devfeed-13-bookmarks-dark.png`.

### `/me/notifications`

- In-app feed (chronological). Notification types:
  - Suggestion approved / rejected / changes requested.
  - Followed publisher published a new post (optional, off by default).
  - Weekly digest summary.
- Each item is dismissible. "Mark all as read" header action.

### `/me/account`

- Profile (display name, avatar URL, timezone). Sign out. Delete account (red danger zone, requires typing email to confirm).

### `/me/suggestions` (NEW)

- List of the user's own `publisher_suggestions`, with status pill and review notes when present.
- For `changes_requested` items: an "Edit & resubmit" button that re-opens the `/suggest` form pre-filled.
- For `pending`: a small "We're reviewing this" subtitle.
- For `approved`: link to the created publisher page.

---

## Admin (role=admin)

### `/admin/overview`

- 4 KPI cards: Posts ingested (30d), Active sources, Total reads (30d), Daily active users.
- "Reads over time" area chart (30d, daily).
- "Top publishers by reads" bar chart.
- "Top posts (last 7 days)" table with sparklines.
- Source health summary (top 5 worst sources).
- Recent admin actions (audit log feed, last 10).
- **Mockup:** `devfeed-03-admin-analytics-light.png`.

### `/admin/sources`

- Table: Publisher · Feed URL (mono) · Type · Status (StatusPill) · Last fetched · Posts (30d, with sparkline) · Actions (edit / pause / delete).
- KPI strip above table: total / active / warnings / failing.
- Filters: search, Status, Type, Publisher.
- Right Sheet for Add/Edit form. (Mockup: `devfeed-09-admin-sources-dark.png`.)

### `/admin/publishers` (replaces `/admin/companies`)

- Grid view (default) or List view toggle.
- **Type filter (NEW):** All · Companies · People (segmented control above grid).
- Each card uses `PublisherCard`.
- Add Publisher Sheet: Type selector (Company / Person), then type-specific fields (same as `/suggest` but with admin-only fields like "Set as featured", "Override slug").
- **Mockup:** `devfeed-10-admin-companies-light.png` (shows the type filter and a mix of company + person publishers).

### `/admin/tags`

- Table: tag · slug · color (color picker) · post count · Actions.
- Bulk actions: Merge (selects 2+ tags, opens a "Merge into..." dropdown — moves all post associations and deletes the merged-from tags).

### `/admin/users`

- Table: User · Email · Role (dropdown) · Joined · Last seen · Bookmarks · Digest · Status · Actions.
- Right Sheet for user detail with tabs Overview / Activity / Bookmarks / Digests, plus a danger zone for Suspend / Delete.
- **Mockup (planned):** `devfeed-18-admin-users-light.png`.

### `/admin/moderation` (NEW)

- 2-column layout: 320px suggestion list (left) + detail/review pane (right).
- List shows newest first. Each card: status dot, suggested name, type badge, submitter, submission time. Selected card has indigo border.
- Detail pane:
  - Header: suggested name + type badge + status pill.
  - Metadata grid: submitter, submission time, suggested feed URL, **auto-validation result** (feed reachable, RSS valid, items found, latest post age).
  - Suggested tags as chips.
  - "Reason from submitter" quoted block.
  - "Live preview" using `PublisherCard` of the right type.
  - Admin notes textarea.
- Sticky action bar: Reject (outlined red) · Request changes (outlined amber) · Approve & add (filled indigo, with split-button "Approve and notify submitter" / "Approve silently").
- **Mockup (planned):** `devfeed-21-admin-moderation-dark.png`.

### `/admin/analytics`

- Same as Overview but expanded charts. New (with publisher unification):
  - **Posts ingested per day, stacked by publisher type** (company / person).
  - **Reads split by access label** (Free vs Paid) over time.
  - **Suggestion funnel:** submitted → approved | rejected, weekly trend.

### `/admin/settings`

- Cron status (last run / next run / health for each cron).
- Env diagnostics (which env vars are set, never their values).
- Feature flags (e.g. "Allow public suggestion submissions without auth", "Enable trending tab on home").

---

## Modal: PostDetailModal

Triggered from any PostCard title/summary click.

- 640px wide, max 80vh tall, scroll inside.
- Header (sticky): publisher avatar + name + relative time, "Read on [domain] ↗" outlined button, bookmark, close X.
- Body: title (26px bold), meta row (author · read time · date), tag chips, summary paragraph, **Highlights** (TL;DR bullets when available, extracted from RSS or generated lazily), divider, "Related posts" (3 compact PostCards).
- Footer (sticky): read-time, "Add to bookmarks", "Open original ↗".
- A11y: Esc closes; focus returns to triggering card.
- **Mockup (planned):** `devfeed-11-post-detail-modal-light.png`.

---

## Modal: Confirmation modals (destructive)

Three variants (all centered modals, 380px):

1. **Delete (publisher / source / tag)**: requires typing a confirm phrase (e.g. `DELETE NETFLIX`) to enable the destructive button. Red destructive button.
2. **Pause source / Unfollow / Soft action**: optional checkbox for cascading effects. Amber button.
3. **Ban user**: optional Reason textarea (internal note). Red button.

All variants share: red triangle icon, bold heading, 2-3 line description, Cancel + destructive button row.

**Mockup (planned):** `devfeed-19-confirmation-modals.png`.
