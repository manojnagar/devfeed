# DevFeed

A free, ad-free aggregator for engineering blogs from companies and individual creators — in one place, filterable, with optional email digests.

> **Status:** working application. The Next.js 15 app builds, all unit tests pass, and a full smoke tour (public, account, admin, cron) is green against the dev server. Production deploy is wired for Vercel; the in-memory adapter is used by default so the site runs with **zero external services**. Switching to Supabase + Resend is a single env change.

## Quick start

```bash
cd devfeed
cp .env.example .env.local          # already present in this checkout
npm install
npm run dev
```

Then:

| URL | Notes |
| --- | ----- |
| <http://localhost:3000/> | Public feed (135 seeded posts, 45 publishers) |
| <http://localhost:3000/login> | Click **Continue as demo user** or **demo admin** |
| <http://localhost:3000/me/digest> | Account preferences (after signing in) |
| <http://localhost:3000/admin/overview> | Admin console (after signing in as demo admin) |

The dev seed includes 40 company blogs + 5 individual creators + 40 tags. Hitting the cron endpoint (`/api/cron/ingest`) with `Authorization: Bearer $CRON_SECRET` pulls real posts from those publishers' RSS feeds.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server on :3000 |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run typecheck` | TypeScript only, no emit |
| `npm run lint` | ESLint via `next lint` |
| `npm test` | Vitest run (78 tests) |
| `npm run test:e2e` | Playwright (boots dev server on :3100) |
| `npm run seed:dev` | Print summary of the in-memory seed graph |
| `npm run ingest:dev` | Run a single ingest pass against the seeded sources |

Two convenience smoke scripts also exist:

```bash
node scripts/smoke.mjs       # hits all routes anonymously
node scripts/smoke-auth.mjs  # repeats with demo-user + demo-admin cookies
```

## Architecture (one screen)

```
app/                  Next.js 15 App Router
  (public)/           anonymous browsing  (/, /publishers, /tags, /search, /about, /suggest, /login)
  (account)/me/       authed surface       (bookmarks, follows, digest, account, suggestions)
  (admin)/admin/      admin console         (overview, publishers, sources, tags, users, moderation, analytics, audit)
  api/cron/{ingest,digest}/route.ts        (Vercel Cron · Bearer auth)
  api/digest/unsubscribe/route.ts          (HMAC-signed one-click unsubscribe)
  out/[postId]/route.ts                    (read-tracking 302 to canonical URL)
  robots.ts, sitemap.ts                    (SEO basics)
components/           shared UI primitives + domain components (PostCard, PublisherCard, ...)
lib/
  data/               repository pattern + in-memory adapter (dev/test) + Supabase adapter (prod stub)
  auth/               adapter (stub | supabase) + requireUser/requireAdmin
  email/              adapter (console | resend) + react-email-style templates
  digest/             selection algorithm + run loop + signed unsubscribe token
  ingest/             RSS/Atom parser + safeFetch + canonicalize + auto-tag + access detector
  schemas.ts          Zod input schemas shared across actions
tests/
  unit/               Vitest (78 tests passing)
  e2e/                Playwright specs (public, account, admin)
docs/                 design spec + diagrams + setup + execution plan
scripts/              dev seed/ingest runners + smoke scripts
```

See [`docs/diagrams/`](docs/diagrams/README.md) for Mermaid diagrams of every flow.

## Verified status

| Area | Result |
| --- | --- |
| TypeScript | clean (`tsc --noEmit`) |
| ESLint | clean (`next lint`) |
| Unit tests | 78 / 78 pass (Vitest) |
| Production build | successful, all 32 routes compiled |
| Smoke (anon, user, admin) | green — see `scripts/smoke*.mjs` |
| Cron · ingest | pulled 531 posts from 41 publisher feeds in a single pass |
| Cron · digest | runs without errors (no users due in seed) |

## Deploying to Vercel

1. Push `devfeed/` as the project root in your Vercel import.
2. Set environment variables (Production):
   - `STORAGE_ADAPTER=supabase`
   - `AUTH_ADAPTER=supabase`
   - `EMAIL_ADAPTER=resend`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `CRON_SECRET` and `UNSUBSCRIBE_SECRET` (long random strings)
   - `NEXT_PUBLIC_SITE_URL=https://your-domain.tld`
3. Vercel reads `vercel.json` and schedules `/api/cron/ingest` every 30 min and `/api/cron/digest` every hour.
4. Run the SQL migrations in `lib/data/sql/` against your Supabase project.

## Quick links

- Engineering plan → [`PLAN.md`](PLAN.md)
- Design spec entry → [`docs/README.md`](docs/README.md)
- Diagrams → [`docs/diagrams/README.md`](docs/diagrams/README.md)
- Execution plan + CI → [`docs/EXECUTION-PLAN.md`](docs/EXECUTION-PLAN.md), [`docs/CI-CD.md`](docs/CI-CD.md)
- Testing strategy → [`docs/TESTING.md`](docs/TESTING.md)

## Conventions

- **Branch naming:** `feat/*`, `fix/*`, `chore/*`, `docs/*`
- **Commit style:** Conventional Commits
- **File size:** hard cap 500 lines per file; new code averages well under that
- **Secrets:** environment variables only, never committed (workspace rule `hardcoded-credentials-block`)
