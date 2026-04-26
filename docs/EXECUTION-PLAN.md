# Execution Plan — Agent Runbook

> This is a **phased, test-driven runbook** for the AI agent (or any engineer) implementing DevFeed. Each phase has: pre-conditions, work to do, **mandatory verification commands**, success criteria, and rollback. The agent MUST NOT advance to phase N+1 until phase N is green.
>
> Companion documents:
> - [`PLAN.md`](../PLAN.md) — high-level plan, schema, costs
> - [`docs/TESTING.md`](TESTING.md) — testing strategy + tooling
> - [`docs/CI-CD.md`](CI-CD.md) — CI workflows + deploy pipeline
> - [`docs/design/*`](design/) — design spec

## How to use this runbook

1. Each phase opens with a **goal** and **success criteria**.
2. Work items are checkboxes (`[ ]`).
3. **VERIFY** blocks are non-negotiable — the agent MUST run those commands and capture output before checking the box.
4. **TEST** blocks are the automated tests that must be added in this phase. They run as part of CI from this phase onward.
5. Each phase ends with a **gate** — a required state of the repo before moving on.

---

## Phase 0 — Pre-flight

**Goal:** Verify environment, set up baseline tooling, confirm we can ship.

- [ ] Confirm Node version: `node -v` → `>= 20.10`
- [ ] Confirm package manager: pnpm preferred (`pnpm -v` → `>= 9`)
- [ ] Confirm `git` configured (user.name, user.email)
- [ ] Confirm `gh` CLI installed and authenticated (for PR / CI work)
- [ ] Create GitHub repo `devfeed` (private to start), add it as `origin`
- [ ] Create Supabase project (free tier), capture project ref + anon key + service-role key
- [ ] Create Resend account, capture API key
- [ ] Create Vercel project, link to GitHub repo

**VERIFY**

```bash
node -v && pnpm -v && git --version && gh --version
gh auth status
```

**Gate:** all CLIs present, repo + Supabase + Vercel + Resend accounts created, secrets noted in a local password manager (NEVER committed — workspace `hardcoded-credentials-block` rule).

---

## Phase 1 — Scaffold

**Goal:** Boot a Next.js 15 app with our design tokens, shadcn/ui, light/dark theming, ESLint, Prettier, Vitest, Playwright. Empty home page renders without errors.

- [ ] `pnpm create next-app@latest devfeed --ts --tailwind --app --src-dir false --import-alias "@/*" --eslint`
- [ ] Move into `devfeed/` (the existing folder; merge with the docs already there)
- [ ] Install runtime deps: `pnpm add @supabase/supabase-js @supabase/ssr lucide-react clsx class-variance-authority tailwind-merge zod`
- [ ] Install UI deps: `pnpm dlx shadcn@latest init` then add baseline primitives: `button input card dialog sheet dropdown-menu tabs badge avatar table toast select switch checkbox radio-group skeleton tooltip form`
- [ ] Install dev deps: `pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @playwright/test @axe-core/playwright msw prettier prettier-plugin-tailwindcss eslint-config-prettier @types/node`
- [ ] Configure `tailwind.config.ts` to load CSS variables from `01-tokens.md` (color, radius, motion, spacing). Use `@theme inline` or `theme.extend.colors` keyed off CSS vars.
- [ ] Add `app/globals.css` with the `:root` and `[data-theme="dark"]` blocks from `docs/design/01-tokens.md`.
- [ ] Add `next-themes` for theme switching: `pnpm add next-themes`. Wrap layout in `<ThemeProvider>`.
- [ ] Implement minimal `app/layout.tsx` (HTML, body, ThemeProvider, font setup with Inter + JetBrains Mono via `next/font`).
- [ ] Implement minimal `app/page.tsx` showing "DevFeed" wordmark only.
- [ ] Add `components/ui/index.ts` re-exporting shadcn primitives.
- [ ] Configure Vitest (`vitest.config.ts`, `vitest.setup.ts`).
- [ ] Configure Playwright (`playwright.config.ts`, `tests/e2e/` folder, baseURL = `http://localhost:3000`).
- [ ] Add `.prettierrc` + `.prettierignore`.
- [ ] Add `.gitignore` extras: `.env.local`, `.next`, `coverage`, `playwright-report`, `test-results`, `.vercel`.
- [ ] Commit with message: `chore: scaffold Next.js 15 + Tailwind + shadcn + test rigs`.

**VERIFY**

```bash
pnpm install
pnpm dev          # in another shell — confirm http://localhost:3000 loads, no console errors
pnpm typecheck    # add script: "tsc --noEmit"
pnpm lint
pnpm build        # Next.js production build succeeds
```

**TEST (mandatory in this phase)**

- `tests/e2e/smoke.spec.ts` — Playwright: navigate `/`, expect status 200 and "DevFeed" wordmark visible in both light and dark themes (toggle via `?theme=dark` URL param or localStorage).
- `tests/unit/tokens.test.ts` — Vitest: import the tailwind config, assert that the semantic color tokens listed in `01-tokens.md` are all present.

**Gate:** `pnpm dev` shows the page, `pnpm test:unit && pnpm test:e2e && pnpm build` all green.

---

## Phase 2 — Supabase setup (schema + RLS + types)

**Goal:** Local Supabase running with `0001_init.sql` migration applied; generated TS types available; pgTAP smoke test for RLS.

- [ ] Install Supabase CLI: `brew install supabase/tap/supabase`
- [ ] `supabase init` inside `devfeed/`
- [ ] Write `supabase/migrations/0001_init.sql` per [`PLAN.md` §3](../PLAN.md#3-database-schema-supabase-postgres-with-rls). Include:
  - All four enums (`publisher_type`, `access_label`, `paywall_provider`, `suggestion_status`)
  - All tables in dependency order
  - All foreign keys with `on delete cascade` where appropriate
  - All indexes (incl. GIN full-text on posts)
  - All RLS policies — test with deny-by-default
  - Triggers: `profiles` row insert on `auth.users` insert; `updated_at` triggers
- [ ] Write `supabase/migrations/0002_views.sql` for materialized views (`trending_posts_7d`, `posts_per_day_by_type`, etc.)
- [ ] Write `supabase/seed.sql` for local-dev seed (5 publishers, 10 tags, 20 posts) — production seed handled by `seed/publishers.ts`.
- [ ] `supabase start` (Docker)
- [ ] `supabase db reset` to apply migrations + seed
- [ ] Generate TS types: `supabase gen types typescript --local > lib/supabase/types.gen.ts`
- [ ] Build `lib/supabase/server.ts` (server client w/ cookies), `lib/supabase/client.ts` (browser client), `lib/supabase/admin.ts` (service-role, server-only).
- [ ] Add `lib/supabase/admin.ts` import-time guard: throw if `SUPABASE_SERVICE_ROLE_KEY` is somehow imported in a client component.

**VERIFY**

```bash
supabase status                                # all containers up
supabase db reset                              # migrations + seed apply cleanly
psql "$LOCAL_DB_URL" -c "select count(*) from publishers;"  # > 0
```

**TEST (mandatory in this phase)**

- `supabase/tests/rls.sql` — pgTAP file asserting:
  - Anonymous role can SELECT from `publishers`, `posts`, `tags`, `post_tags`, `blog_sources` where `is_active=true`
  - Anonymous role CANNOT SELECT from `bookmarks`, `digest_preferences`, `publisher_suggestions`
  - Authenticated role can only see their own `bookmarks` (test with two users)
  - `service_role` can write to `audit_log`; `authenticated` cannot
- `tests/unit/lib/supabase.test.ts` — Vitest: assert `lib/supabase/admin.ts` throws if imported with a fake `'use client'` marker.
- Add `pnpm test:rls` script that runs `supabase test db`.

**Gate:** `pnpm test:rls` green; types regenerate without diff in CI; no schema drift.

---

## Phase 3 — Auth (Supabase Auth + Google + GitHub + magic link)

**Goal:** A user can sign up via magic link OR Google OAuth OR GitHub OAuth. First sign-in inserts a `profiles` row. Middleware protects `/me/*` and `/admin/*`.

- [ ] Configure Supabase Auth providers: enable email magic link, add Google + GitHub OAuth credentials (app + secret in Vercel + Supabase env, NEVER in code).
- [ ] Build `app/(auth)/login/page.tsx` per `03-pages.md → /login` and the mockup.
- [ ] Build `app/auth/callback/route.ts` that exchanges OAuth code for session.
- [ ] Build `app/auth/sign-out/route.ts`.
- [ ] Add Postgres trigger in `supabase/migrations/0003_profiles_trigger.sql` to insert a `profiles` row on `auth.users` insert.
- [ ] Build `lib/auth/requireUser.ts` (returns user or redirects to `/login?next=...`).
- [ ] Build `lib/auth/requireAdmin.ts` (returns user with admin role or 404s — never reveal admin existence).
- [ ] Add Next.js middleware (`middleware.ts`) refreshing session cookies and protecting routes.
- [ ] Promote one user to admin via SQL: document the snippet in `docs/RUNBOOK-OPS.md`.

**VERIFY (manual)**

- `pnpm dev`, sign in with magic link to a real email, check inbox.
- Sign in with Google, verify `profiles` row created.
- Visit `/me/digest` while signed out → redirected to `/login?next=/me/digest`.
- Visit `/admin/overview` as a non-admin user → 404.

**TEST**

- `tests/e2e/auth-magic-link.spec.ts` — Playwright with **MailHog** (or Mailpit) running in Docker beside Supabase to capture the magic link email; click it; assert session cookie present.
- `tests/e2e/auth-google.spec.ts` — Playwright with `@auth0/playwright-mocks` or a custom interceptor on the OAuth redirect to simulate Google's response.
- `tests/unit/lib/auth/requireAdmin.test.ts` — assert non-admin gets `notFound()`.
- pgTAP: trigger inserts `profiles` row on user insert; rolling back the user removes it (cascade).

**Gate:** All auth e2e tests pass; manual smoke covers all 3 providers.

---

## Phase 4 — Public feed (read-only)

**Goal:** Anonymous users can browse `/`, `/publishers/[slug]`, `/tags/[slug]`, `/search`. PostCard, PublisherHeader (2 variants), TopNav, FilterSidebar all working with seeded data.

- [ ] Build `components/post/PostCard.tsx` matching `02-components.md → PostCard` exactly. Include `AccessBadge` for paid posts.
- [ ] Build `components/publisher/PublisherCard.tsx` and `PublisherHeader.tsx` (2 variants — switch on `type`).
- [ ] Build `components/publisher/AccessBadge.tsx` per `02-components.md → Badge family`.
- [ ] Build `components/filters/FilterSidebar.tsx` (publisher-type segmented control, publisher checkbox list, tag chip cloud, access toggle, time range radio).
- [ ] Build `components/layout/TopNav.tsx` with theme toggle + search input (typeahead deferred to Phase 5).
- [ ] Build `app/(public)/page.tsx` — home feed with URL-driven filters per `03-pages.md → /`.
- [ ] Build `app/(public)/publishers/[slug]/page.tsx` — variant-aware detail page.
- [ ] Build `app/(public)/tags/[slug]/page.tsx` — tag detail.
- [ ] Build `app/(public)/search/page.tsx` — full-text via `to_tsvector` GIN index.
- [ ] Build `app/(public)/out/[postId]/route.ts` — `read_events` insert + 302 redirect.
- [ ] Build `lib/log.ts` — structured JSON logger with redaction of token/email patterns (per workspace `logging-security` rule).
- [ ] Build `lib/anon-id.ts` — first-party `df_anon` cookie management.
- [ ] Build SSRF guard `lib/net/safeFetch.ts` — DNS resolution + private-IP block.

**VERIFY (visual)**

- Compare `/` against `MOCKUPS.md → 01` and `02`. Layout, spacing, typography MUST match within 5% pixel diff.
- Compare `/publishers/netflix` against `MOCKUPS.md → 04`.
- Compare `/tags/distributed-systems` against `MOCKUPS.md → 05`.

**TEST**

- `tests/unit/components/PostCard.test.tsx` — render with all variants (default / compact / featured), with/without AccessBadge.
- `tests/unit/components/PublisherHeader.test.tsx` — two snapshot variants (company / person).
- `tests/unit/lib/anon-id.test.ts` — cookie set on first call, reused on subsequent.
- `tests/unit/lib/net/safeFetch.test.ts` — rejects `http://127.0.0.1`, `http://10.0.0.1`, `http://169.254.169.254` (AWS metadata IP), `file://...`.
- `tests/e2e/public-browse.spec.ts` — anonymous user visits `/`, filters by publisher + tag + time range, opens publisher page, opens tag page, performs a search, clicks "Open original" → assert 302 + `read_events` row inserted.
- `tests/e2e/a11y.spec.ts` — run `@axe-core/playwright` against every public page in both themes; fail on any AA violation.
- **Visual regression** — Playwright `toHaveScreenshot()` on `/`, `/publishers/netflix`, `/tags/distributed-systems` in both themes. Baselines committed.

**Gate:** All e2e + a11y + visual tests green; Lighthouse CI on `/` ≥ 90 in Performance / Accessibility / Best Practices / SEO.

---

## Phase 5 — Ingestion pipeline

**Goal:** RSS + scrape pipeline reliably ingests posts from real engineering blogs into the DB. Cron secured. Auto-tagger working. Paid-status detector working.

- [ ] Build `lib/ingest/rss.ts` (rss-parser wrapper).
- [ ] Build `lib/ingest/scrape.ts` (cheerio + readability fallback).
- [ ] Build `lib/ingest/canonicalize.ts` (lowercase host, strip UTM/gclid/hash).
- [ ] Build `lib/ingest/autoTag.ts` (keyword→tag dictionary; load from `seed/tags.ts`).
- [ ] Build `lib/ingest/detectAccess.ts` (Substack / Ghost / Medium / Patreon heuristics from `04-flows.md → Ingestion`).
- [ ] Build `app/api/cron/ingest/route.ts` with `Authorization: Bearer ${CRON_SECRET}` check + `p-limit(8)` orchestration.
- [ ] Build `vercel.json` with the cron config (every 4 hours).
- [ ] Build `seed/publishers.ts` (40 companies + 5 people per `PLAN.md §7`).
- [ ] Build `seed/tags.ts` (~80 tags).
- [ ] Run seed: `pnpm tsx seed/publishers.ts && pnpm tsx seed/tags.ts`.

**VERIFY**

```bash
# Trigger ingest locally
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ingest

# Then in psql:
select count(*) from posts;                # > 0
select count(distinct publisher_id) from posts;  # > 0
select count(*) from post_tags;            # > 0
```

**TEST**

- `tests/unit/lib/ingest/canonicalize.test.ts` — table-driven tests covering UTM strip, lowercase, hash strip, port normalization.
- `tests/unit/lib/ingest/autoTag.test.ts` — table-driven: given a title+summary, expect the tag set.
- `tests/unit/lib/ingest/detectAccess.test.ts` — table-driven across 8+ real Substack/Ghost/Medium fixtures.
- `tests/integration/ingest.test.ts` — Vitest spinning up the route handler with MSW mocking 3 RSS endpoints (1 healthy, 1 returning HTTP 500, 1 returning malformed XML); assert posts inserted, error counters incremented, no crash.
- `tests/e2e/cron-auth.spec.ts` — assert cron route returns 401 without secret, 200 with.

**Gate:** ≥ 30 of 47 starter publishers ingest at least 1 post on first run. Tag coverage ≥ 80% of posts (i.e. fewer than 20% are tagless).

---

## Phase 6 — User account (auth-required)

**Goal:** Bookmark, follow publishers/tags, manage digest preferences.

- [ ] Build `app/(account)/me/digest/page.tsx` per mockup #07 and `03-pages.md`.
- [ ] Build `app/(account)/me/followed-publishers/page.tsx`, `followed-tags/page.tsx`, `bookmarks/page.tsx`, `notifications/page.tsx`, `account/page.tsx`, `suggestions/page.tsx`.
- [ ] Build Server Actions in `app/(account)/me/actions.ts` for follow/unfollow, bookmark toggle, digest prefs save.
- [ ] Build `components/me/SettingsSidebar.tsx`.
- [ ] Implement bookmark gating modal (anonymous → login).

**TEST**

- `tests/unit/app/(account)/me/actions.test.ts` — every Server Action: validates input with zod, enforces RLS (via test user session).
- `tests/e2e/bookmark.spec.ts` — anonymous click bookmark → modal → sign in → bookmark persisted on return.
- `tests/e2e/follow.spec.ts` — sign in, follow Netflix, confirm `user_followed_publishers` row, unfollow within 5s "undo" window.
- `tests/e2e/digest-prefs.spec.ts` — change frequency to weekly, save, reload, prefs persisted.

**Gate:** All `/me/*` flows pass e2e in both themes.

---

## Phase 7 — Suggest + moderation flow

**Goal:** Any signed-in user can suggest a publisher (company / person). Admin can approve / reject / request changes. Submitter notified.

- [ ] Build `app/(public)/suggest/page.tsx` per mockup #20 and `03-pages.md → /suggest`. Type selector + dynamic field reveals.
- [ ] Build `lib/ingest/autodiscoverFeed.ts` (parse `<link rel="alternate" type="application/rss+xml">`).
- [ ] Build `app/api/suggest-validate/route.ts` background validator (called via `pg_notify` trigger or after-insert HTTP fan-out).
- [ ] Build `app/(admin)/admin/moderation/page.tsx` per mockup #21 and `03-pages.md → /admin/moderation`. List + detail pane + sticky action bar.
- [ ] Build Server Actions for approve / reject / request-changes — wrapped in single Postgres transaction per `04-flows.md`.
- [ ] Build email templates `lib/email/suggestion-status.tsx` (3 variants).
- [ ] Implement rate-limit middleware: max 3 pending / max 10 per week per user.
- [ ] Build `app/(account)/me/suggestions/page.tsx` listing the user's own.

**TEST**

- `tests/unit/lib/ingest/autodiscoverFeed.test.ts` — table-driven on real Atom/RSS link tags + edge cases (no link, multiple links, relative URL).
- `tests/integration/suggest-rate-limit.test.ts` — 4th pending suggestion blocked.
- `tests/e2e/suggest-and-approve.spec.ts` — full flow:
  1. User signs in
  2. User suggests a person publisher (with handle + bio fields)
  3. Admin signs in via second browser context
  4. Admin sees suggestion in `/admin/moderation` queue with auto-validation populated
  5. Admin clicks Approve
  6. Assert: `publishers` + `blog_sources` rows created in single txn (verify via DB query)
  7. Assert: submitter receives "approved" email (MailHog)
  8. User refreshes `/me/suggestions` → status pill shows Approved + link to publisher

**Gate:** Round-trip suggest-and-approve passes e2e; rejection email contains the admin's notes verbatim.

---

## Phase 8 — Admin (publishers, sources, tags, users)

**Goal:** Full CRUD for catalog + user moderation. All admin writes go through `audit_log`.

- [ ] Build `app/(admin)/admin/publishers/page.tsx` per mockup #10 (with type filter added). Add Sheet form.
- [ ] Build `app/(admin)/admin/sources/page.tsx` per mockup #09. Add Sheet form, "Trigger fetch now" action.
- [ ] Build `app/(admin)/admin/tags/page.tsx` with merge action.
- [ ] Build `app/(admin)/admin/users/page.tsx` per mockup #18 (planned). Role toggle, ban with confirm.
- [ ] All Server Actions write `audit_log` row in same transaction.
- [ ] Implement destructive-confirm modals (mockup #19).

**TEST**

- `tests/e2e/admin-publishers-crud.spec.ts` — create, edit, delete each of the 3 publisher types. Assert audit_log entries.
- `tests/e2e/admin-sources-crud.spec.ts` — same for sources, plus Trigger Fetch.
- `tests/e2e/admin-tags-merge.spec.ts` — merge two tags, assert post_tags reassigned, source tags deleted.
- `tests/e2e/admin-user-ban.spec.ts` — ban a user, attempt to sign in as them → blocked.
- pgTAP: every admin write produces an `audit_log` row.

**Gate:** All admin flows pass; no admin write goes to DB without an `audit_log` row.

---

## Phase 9 — Email digests

**Goal:** Daily + weekly digests reliably sent based on user prefs. Unsubscribe works. Throttle to <100/day.

- [ ] Build `lib/email/digest.tsx` with `react-email`.
- [ ] Build `app/api/cron/digest/route.ts` with daily slot logic.
- [ ] Build `app/api/digest/unsubscribe/route.ts` with signed JWT token.
- [ ] Add Resend domain verification step to `docs/RUNBOOK-OPS.md`.
- [ ] Wire up "Send a test digest" button in `/me/digest`.

**TEST**

- `tests/unit/lib/email/digest.snapshot.test.ts` — render the template with 0, 1, 5, 25 posts; snapshot HTML output.
- `tests/integration/cron-digest.test.ts` — mock Resend, run cron, assert correct user set is selected, `digest_log` rows created, throttle respected (skip users > 80 in a single run).
- `tests/e2e/unsubscribe.spec.ts` — visit signed unsubscribe link, prefs flip to `none`, page shows re-enable.

**Gate:** Test digest renders identically in Gmail web, Apple Mail, Outlook (manual visual check across 3 clients).

---

## Phase 10 — Analytics

**Goal:** `/admin/analytics` shows accurate, up-to-date charts. Materialized views refresh on schedule.

- [ ] Build SQL materialized views in `supabase/migrations/0002_views.sql`.
- [ ] Add `pg_cron` job to refresh views hourly (via Supabase dashboard).
- [ ] Build chart components with `recharts`: `ReadsOverTimeArea`, `TopPublishersBar`, `ReadsByAccessLine`, `SuggestionFunnel`.
- [ ] Build `/admin/overview` and `/admin/analytics` pages.

**TEST**

- `tests/unit/components/charts/*.test.tsx` — render with empty, sparse, and dense data.
- `tests/e2e/admin-analytics.spec.ts` — visit page, assert charts render, KPI numbers match a direct DB query.

**Gate:** Numbers on dashboard equal `select count(*)` from raw tables to within 1 hour of refresh delay.

---

## Phase 11 — Onboarding + polish

**Goal:** First-run experience is delightful. All empty / loading / error states implemented. Lighthouse green.

- [ ] Build `app/(account)/onboarding/page.tsx` 3-step flow per mockup #15.
- [ ] Implement skeletons (mockup #17) on every list page.
- [ ] Implement empty states (mockup #14) per `02-components.md → EmptyState`.
- [ ] Implement `app/not-found.tsx`, `app/error.tsx`, `app/offline.tsx` per mockup #16.
- [ ] Wire up service worker for offline cache of bookmarks list.
- [ ] Add `?` keyboard shortcut help dialog.

**TEST**

- `tests/e2e/onboarding.spec.ts` — first-time user goes through 3 steps; assert prefs persisted; assert returning to `/onboarding` after completion redirects to `/me/digest`.
- `tests/e2e/keyboard.spec.ts` — keyboard-only navigation per `05-accessibility.md → keyboard map`. All shortcuts work.
- `tests/e2e/offline.spec.ts` — install service worker, go offline, navigate to bookmarks, page renders cached.
- Lighthouse CI on `/`, `/publishers/netflix`, `/me/digest`, `/admin/overview` — all ≥ 90.

**Gate:** Full UAT walkthrough by a non-engineer completes in < 5 min without confusion.

---

## Phase 12 — Deploy

**Goal:** Production live on Vercel + Supabase + Resend, with custom domain (or `*.vercel.app`).

- [ ] Vercel: connect repo, set env vars (NEVER copy from local — generate fresh in production).
- [ ] Vercel: configure cron jobs in `vercel.json`.
- [ ] Supabase: create production project, run migrations via CI (`supabase db push`).
- [ ] Supabase: enable backups (daily); document restore procedure in `docs/RUNBOOK-OPS.md`.
- [ ] Supabase: configure OAuth redirect URIs to production URL.
- [ ] Resend: verify sending domain (DNS records).
- [ ] Domain: purchase + configure (Cloudflare Registrar recommended for cost + DNS in one).
- [ ] Run smoke tests against production URL.
- [ ] Set up [Plausible](https://plausible.io/) or [Umami](https://umami.is/) for first-party analytics (optional).
- [ ] Set up [Sentry](https://sentry.io/) free tier for error tracking (optional).

**VERIFY**

- All e2e tests run against production URL pass.
- Lighthouse CI on production passes.
- Magic link email arrives in real inbox within 30s.
- Cron job triggers in Vercel dashboard show next-run times.

**Gate:** First real user signs up, completes onboarding, receives a digest email, and visits the site again the next day.

---

## Cross-cutting acceptance criteria

These are checked at every phase, not just at the end:

| Concern              | Check                                                                  |
| -------------------- | ---------------------------------------------------------------------- |
| Secrets              | `pnpm dlx secretlint "**/*"` finds nothing                             |
| Hardcoded creds      | Workspace `hardcoded-credentials-block` rule passes                    |
| Dependency blocklist | `npm ls axios` does not show `1.14.1` or `0.30.4` (workspace rule)     |
| Bundle size          | First-load JS on `/` ≤ 130 KB gzipped                                  |
| Type safety          | `tsc --noEmit` clean; no `any` in `lib/`, `components/`, or `app/`     |
| Lint                 | ESLint passes with no warnings                                         |
| RLS                  | pgTAP RLS tests pass                                                   |
| A11y                 | axe-playwright passes on every page in both themes                     |
| Visual regression    | All snapshots match (or have been intentionally updated in the PR)     |
| Lighthouse           | All Big-4 scores ≥ 90 on key pages                                     |

## Definition of Done (per phase)

A phase is **done** when ALL of the following are true:

1. All checkboxes in the phase ticked.
2. All VERIFY commands run; output captured in PR description or commit body.
3. All TEST blocks added; tests passing locally AND in CI.
4. PR opened, reviewed (or self-reviewed against this runbook), merged.
5. CI green on the merge commit.
6. Cross-cutting criteria above still hold.

If any of these fails, **revert and fix** — do not move to the next phase with a broken gate.
