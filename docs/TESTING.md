# Testing Strategy

> What we test, how we test it, what tools we use, and what coverage we expect. Read this before writing any test, and before writing any code that needs tests.

## Philosophy

1. **Test behavior, not implementation.** A test for `PostCard` checks that the title renders, the bookmark button toggles, and the publisher name links to the publisher page — NOT that a `useState` hook was called.
2. **The test pyramid, but RLS is the keystone.** Lots of unit tests, fewer integration tests, even fewer e2e tests, plus a dedicated RLS test layer (pgTAP) that we treat as non-negotiable. RLS bugs are silent data-leak bugs.
3. **Visual regression is testing too.** Pixel-diffs catch CSS regressions a unit test never will.
4. **Accessibility is testing too.** Every page is run through axe in CI.
5. **No test is better than a flaky test.** A flake gets quarantined the same day, fixed within 48h, or deleted.

## Test pyramid

```
        ╱──────────────────╲
       ╱  E2E (Playwright)  ╲       ~50 tests, ~5 min in CI
      ╱──────────────────────╲
     ╱  Visual + a11y         ╲     ~20 snapshots
    ╱──────────────────────────╲
   ╱  Integration              ╲    ~80 tests
  ╱──────────────────────────────╲
 ╱  Unit + Component             ╲  ~400 tests, < 30s
╱──────────────────────────────────╲
   pgTAP RLS suite (separate)         ~30 assertions
```

## Tooling

| Layer                  | Tool                                                                 | Where it runs            |
| ---------------------- | -------------------------------------------------------------------- | ------------------------ |
| Unit + component       | [Vitest](https://vitest.dev/) + Testing Library + jsdom              | `pnpm test:unit`         |
| Server-side mocking    | [MSW](https://mswjs.io/) (Mock Service Worker)                       | inside Vitest setup      |
| Integration (API/SA)   | Vitest, Next.js test utilities, MSW                                  | `pnpm test:integration`  |
| E2E                    | [Playwright](https://playwright.dev/) (Chromium + Firefox + WebKit)  | `pnpm test:e2e`          |
| Visual regression      | Playwright `toHaveScreenshot()`                                      | `pnpm test:visual`       |
| Accessibility          | [`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm)  | `pnpm test:a11y`         |
| RLS                    | [pgTAP](https://pgtap.org/) via `supabase test db`                   | `pnpm test:rls`          |
| Performance            | [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)       | `pnpm test:lhci`         |
| Email rendering        | `react-email` snapshot in Vitest                                     | `pnpm test:unit`         |
| Email delivery (local) | [MailHog](https://github.com/mailhog/MailHog) (Docker)               | docker-compose           |
| OAuth mocking          | Custom Playwright route interception                                 | inside e2e               |
| Bundle size            | [`size-limit`](https://github.com/ai/size-limit)                     | CI only                  |
| Secret leak scan       | [`secretlint`](https://github.com/secretlint/secretlint)             | CI + pre-commit          |

## Coverage targets (as guard-rails, not goals)

- **Unit + component:** Line coverage ≥ 80% on `lib/`, ≥ 70% on `components/`. Coverage is measured but not gated — meaningful tests > coverage chasing.
- **E2E:** Every "happy path" listed in [`design/04-flows.md`](design/04-flows.md) must have one passing e2e.
- **RLS:** Every table that has user-scoped data must have at least one positive AND one negative pgTAP assertion.
- **A11y:** Zero AA violations on any page, in either theme. This IS gated.
- **Visual regression:** Every page in `MOCKUPS.md` has a baseline screenshot in both themes.
- **Lighthouse CI:** Performance / Accessibility / Best Practices / SEO ≥ 90 on `/`, `/publishers/[slug]`, `/me/digest`, `/admin/overview`.

## Patterns

### Test file layout

```
tests/
  setup/
    vitest.setup.ts           # global mocks, env, jest-dom, MSW server
    playwright.global.ts      # global teardown / DB reset
    factories.ts              # data factories (see below)
    mock-handlers.ts          # MSW handlers
  unit/
    lib/
      ingest/
        canonicalize.test.ts
        autoTag.test.ts
        detectAccess.test.ts
      auth/
        requireAdmin.test.ts
    components/
      post/PostCard.test.tsx
      publisher/PublisherHeader.test.tsx
  integration/
    api/
      cron-ingest.test.ts
      cron-digest.test.ts
    actions/
      bookmark.test.ts
      suggest.test.ts
  e2e/
    smoke.spec.ts
    public-browse.spec.ts
    auth-magic-link.spec.ts
    auth-google.spec.ts
    onboarding.spec.ts
    bookmark.spec.ts
    follow.spec.ts
    suggest-and-approve.spec.ts
    admin-publishers-crud.spec.ts
    admin-sources-crud.spec.ts
    admin-users-ban.spec.ts
    keyboard.spec.ts
    a11y.spec.ts
    visual/
      home.visual.spec.ts
      publisher.visual.spec.ts
supabase/tests/
  rls.sql                     # pgTAP: every RLS policy
  triggers.sql                # pgTAP: profiles trigger, audit_log trigger
```

### Data factories (single source of test fixtures)

```ts
// tests/setup/factories.ts
import { faker } from '@faker-js/faker'
import type { Database } from '@/lib/supabase/types.gen'

type Publisher = Database['public']['Tables']['publishers']['Insert']

export const publisher = (overrides: Partial<Publisher> = {}): Publisher => ({
  id: faker.string.uuid(),
  type: 'company',
  name: faker.company.name(),
  slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
  website: faker.internet.url(),
  default_access_label: 'free',
  created_at: new Date().toISOString(),
  ...overrides,
})

export const personPublisher = (overrides: Partial<Publisher> = {}): Publisher =>
  publisher({
    type: 'person',
    name: faker.person.fullName(),
    twitter_handle: faker.internet.username(),
    github_handle: faker.internet.username(),
    ...overrides,
  })

// + factories for users, posts, sources, suggestions, etc.
```

Use factories everywhere — never inline fake data in tests.

### Server Action tests

```ts
// tests/integration/actions/bookmark.test.ts
import { test, expect } from 'vitest'
import { signInAs } from '../setup/auth-helpers'
import { toggleBookmark } from '@/app/(account)/me/actions'

test('user can only bookmark for themselves', async () => {
  const userA = await signInAs('userA@test.com')
  const userB = await signInAs('userB@test.com')

  // userA bookmarks via their session
  await toggleBookmark({ postId: 'post-1' }, { session: userA.session })

  // userB attempting to read userA's bookmarks returns []
  const userBBookmarks = await getBookmarks({ session: userB.session })
  expect(userBBookmarks).toEqual([])
})
```

### RLS test (pgTAP)

```sql
-- supabase/tests/rls.sql
begin;

select plan(8);

-- Setup: two users
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'a@test.com'),
  ('00000000-0000-0000-0000-000000000002', 'b@test.com');

insert into bookmarks (user_id, post_id) values
  ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111');

-- As user A: can see own bookmark
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000001';
select set_config('role', 'authenticated', true);
select is(
  (select count(*) from bookmarks),
  1::bigint,
  'user A sees their own bookmark'
);

-- As user B: cannot see user A's bookmark
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000002';
select is(
  (select count(*) from bookmarks),
  0::bigint,
  'user B does NOT see user A bookmark'
);

-- As anonymous: cannot see any bookmark
set local "request.jwt.claim.sub" = '';
select set_config('role', 'anon', true);
select is(
  (select count(*) from bookmarks),
  0::bigint,
  'anon does NOT see any bookmark'
);

-- ... 5 more assertions ...

select * from finish();
rollback;
```

### Visual regression

```ts
// tests/e2e/visual/home.visual.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Home feed visual', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`home in ${theme}`, async ({ page }) => {
      await page.goto(`/?theme=${theme}`)
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveScreenshot(`home-${theme}.png`, {
        fullPage: true,
        // Mask dynamic content
        mask: [page.locator('[data-testid="relative-time"]')],
        maxDiffPixelRatio: 0.01,
      })
    })
  }
})
```

Baselines live under `tests/e2e/visual/__snapshots__/`. PRs that change visuals must include `pnpm test:visual --update-snapshots` and an explicit reviewer note.

### Accessibility test

```ts
// tests/e2e/a11y.spec.ts
import { test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PAGES = [
  '/',
  '/publishers/netflix',
  '/tags/distributed-systems',
  '/login',
  '/suggest',
  '/me/digest',
  '/admin/overview',
  '/admin/moderation',
]

for (const url of PAGES) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${url} has no a11y violations in ${theme}`, async ({ page }) => {
      await page.goto(`${url}?theme=${theme}`)
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      if (results.violations.length > 0) {
        console.error(JSON.stringify(results.violations, null, 2))
      }
      expect(results.violations).toEqual([])
    })
  }
}
```

### Email snapshot

```ts
// tests/unit/lib/email/digest.snapshot.test.ts
import { render } from '@react-email/render'
import { DailyDigest } from '@/lib/email/digest'
import { publisher, post } from '../../setup/factories'

test('renders 5-post daily digest', () => {
  const html = render(<DailyDigest user={user()} posts={[post(), post(), post(), post(), post()]} />)
  expect(html).toMatchSnapshot()
})

test('renders empty (no posts) digest as a "skip" notice', () => {
  const html = render(<DailyDigest user={user()} posts={[]} />)
  expect(html).toContain('No new posts')
})
```

Update snapshots intentionally with `pnpm test:unit -u`; reviewer must inspect the diff.

## Mocking strategy

### MSW for HTTP

All outbound HTTP (RSS feeds, OAuth providers, Resend) goes through MSW in tests.

```ts
// tests/setup/mock-handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('https://netflixtechblog.com/feed', () => {
    return HttpResponse.xml(/* fixture XML */)
  }),
  http.post('https://api.resend.com/emails', () => {
    return HttpResponse.json({ id: 'mock-email-id' })
  }),
]
```

### Supabase in tests

For unit/integration: spin up Supabase locally (Docker via `supabase start`). Each test runs in its own transaction and rolls back at the end (use `withTestDb()` helper).

For e2e: same local Supabase, but seeded with a known fixture set via `supabase/seed.sql`. Tests should not assume order of seed data — query for IDs by slug.

### OAuth in e2e

Intercept the redirect to `accounts.google.com` and respond with a mock code, then let the real `/auth/callback` exchange it.

```ts
await page.route('**/accounts.google.com/**', async (route) => {
  const callbackUrl = new URL(route.request().url()).searchParams.get('redirect_uri')
  await route.fulfill({ status: 302, headers: { Location: `${callbackUrl}?code=test-code` } })
})
```

## CI integration

See [`CI-CD.md`](CI-CD.md). Every test layer runs in CI:

| Layer                  | Workflow file                          | Triggers                  | Required to merge? |
| ---------------------- | -------------------------------------- | ------------------------- | ------------------ |
| Lint + typecheck       | `pr-check.yml`                         | every PR                  | YES                |
| Unit + integration     | `pr-check.yml`                         | every PR                  | YES                |
| E2E                    | `e2e.yml`                              | every PR                  | YES                |
| RLS (pgTAP)            | `pr-check.yml`                         | every PR                  | YES                |
| A11y                   | `pr-check.yml`                         | every PR                  | YES                |
| Visual regression      | `visual.yml`                           | every PR                  | YES (or marked)    |
| Lighthouse CI          | `lhci.yml`                             | every PR                  | warning, not block |
| Bundle size            | `pr-check.yml`                         | every PR                  | warning, not block |
| Secret scan            | `security.yml`                         | every PR + nightly        | YES                |

## Anti-patterns we avoid

- **Snapshot tests on big React trees** — they break on every refactor and nobody reads the diff. Snapshots OK for small leaf components and for emails.
- **Tests that share mutable state** — every test owns its data via factories.
- **Tests that hit live external APIs** — flake city. Use MSW.
- **`waitForTimeout(N)`** — banned in Playwright. Use `expect.poll`, `waitForResponse`, or `waitForSelector`.
- **Comments saying "// flaky"** — quarantine with `test.skip` and open an issue. Never leave a flake in the suite without a tracking link.

## Definition of "tested"

A feature is **tested** when:

1. Unit tests cover its pure logic.
2. Server actions / API routes have integration tests including auth + validation failure paths.
3. The e2e flow listed for it in [`design/04-flows.md`](design/04-flows.md) passes.
4. If it has UI: visual baseline snapshot + axe scan with no AA violations.
5. If it touches user-scoped data: pgTAP RLS assertion.
6. CI is green on the PR.

A feature without all six is incomplete, regardless of how it looks running locally.
