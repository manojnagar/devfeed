# 04 — User & System Flows

> All major flows as mermaid diagrams + step descriptions. These are the source of truth for behavior — if a screen disagrees with a flow, the flow wins until updated.

## Flow index

1. [Anonymous browsing → read a post](#anonymous-browsing--read-a-post)
2. [Sign in via email magic link](#sign-in-via-email-magic-link)
3. [Sign in via Google OAuth](#sign-in-via-google-oauth)
4. [First-time onboarding](#first-time-onboarding)
5. [Bookmark a post (anonymous → forced sign-in)](#bookmark-gating)
6. [Follow a publisher](#follow-a-publisher)
7. [Subscribe to digest](#subscribe-to-digest)
8. [Suggest a publisher (NEW)](#suggest-a-publisher)
9. [Admin reviews suggestion (NEW)](#admin-reviews-suggestion)
10. [Daily / weekly digest send](#daily--weekly-digest-send)
11. [Ingestion pipeline (RSS + scrape + access detection)](#ingestion-pipeline)
12. [Read-event tracking with anonymous_id](#read-event-tracking)
13. [System architecture (recap)](#system-architecture-recap)

---

## Anonymous browsing → read a post

```mermaid
sequenceDiagram
  autonumber
  actor U as Anonymous user
  participant W as Next.js (Vercel)
  participant DB as Supabase Postgres
  participant E as External blog

  U->>W: GET /
  W->>DB: SELECT latest 25 posts<br/>filter by URL params
  DB-->>W: posts + publisher metadata
  W-->>U: HTML with PostCards
  U->>W: Click on post title
  W-->>U: Open PostDetailModal (client-side)
  U->>W: Click "Open original"
  W->>W: Navigate to /out/[postId]
  W->>DB: INSERT read_events<br/>(post_id, anonymous_id, ip_hash, ua_hash)
  W-->>U: 302 to external canonical_url
  U->>E: GET canonical_url
```

**Notes:**
- The `anonymous_id` is a first-party cookie (`df_anon`) set on first visit; survives across sessions, never expires.
- IP and UA are hashed using `HMAC-SHA256(value, daily_rotating_salt)` — original values never persisted.
- If JS disabled, post titles link directly to `/out/[postId]` instead of opening the modal — read tracking still works.

---

## Sign in via email magic link

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant W as Next.js
  participant SB as Supabase Auth
  participant R as Resend
  participant Inbox as Email inbox

  U->>W: GET /login
  U->>W: Enter email, click "Send magic link"
  W->>SB: signInWithOtp({email})
  SB->>R: send magic-link email
  R-->>Inbox: deliver
  W-->>U: "Check your email" confirmation
  U->>Inbox: Click link
  Inbox->>W: GET /auth/callback?code=...
  W->>SB: exchangeCodeForSession(code)
  SB-->>W: session cookie set
  W->>DB: ensure profiles row exists<br/>(via trigger)
  alt First sign-in (onboarded_at is null)
    W-->>U: Redirect to /onboarding
  else Returning user
    W-->>U: Redirect to / (or `next` param)
  end
```

---

## Sign in via Google OAuth

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant W as Next.js
  participant SB as Supabase Auth
  participant G as Google

  U->>W: Click "Continue with Google"
  W->>SB: signInWithOAuth({provider:'google'})
  SB-->>U: 302 to Google consent
  U->>G: Approve consent
  G-->>SB: code
  SB-->>W: session cookie
  W->>DB: profiles row trigger
  alt First sign-in
    W-->>U: /onboarding
  else
    W-->>U: /
  end
```

---

## First-time onboarding

```mermaid
flowchart TD
  Start([Land on /onboarding]) --> S1[Step 1: Pick publishers]
  S1 -- continue --> S2[Step 2: Pick tags]
  S1 -- skip --> S3
  S2 -- continue --> S3[Step 3: Digest frequency]
  S2 -- skip --> S3
  S3 -- finish --> Save[Server: persist follows + prefs<br/>set profiles.onboarded_at]
  S3 -- skip --> Save2[Server: set onboarded_at,<br/>frequency='none']
  Save --> Home[Redirect to /]
  Save2 --> Home
```

State is persisted at each step (so user can leave and return). Re-entering `/onboarding` after `onboarded_at` is set redirects to `/me/digest` instead.

---

## Bookmark gating

```mermaid
flowchart TD
  click[User clicks bookmark icon] --> auth{Signed in?}
  auth -- yes --> toggle[Toggle bookmarks row<br/>show toast]
  auth -- no --> modal[Open login modal<br/>'Sign in to save this post']
  modal -- complete sign-in --> resume[Server: insert bookmark<br/>after session created]
  resume --> redirect[Return to original page,<br/>scroll to post, show toast]
```

Same pattern for Follow buttons. The `next` query param carries the original URL through the OAuth round-trip.

---

## Follow a publisher

```mermaid
sequenceDiagram
  actor U as Signed-in user
  participant W as Next.js
  participant DB as Supabase

  U->>W: Click Follow on /publishers/[slug]
  W->>DB: INSERT user_followed_publishers<br/>(user_id, publisher_id) ON CONFLICT DO NOTHING
  DB-->>W: ok
  W-->>U: Optimistic: button to "Following",<br/>toast "Added to your feed"
  W-->>DB: also: SELECT new follower count
  DB-->>W: 12,409
  W-->>U: Update header stat
```

Unfollow uses the inverse with a confirmation toast that includes Undo (5s window).

---

## Subscribe to digest

```mermaid
flowchart TD
  Visit[/me/digest] --> Edit[User changes frequency or filter toggle]
  Edit --> Save{Click Save changes}
  Save --> Persist[Server Action: update digest_preferences]
  Persist --> Toast[Toast 'Saved' + show next-send time]
  
  Test[Click 'Send a test digest'] --> Render[Server: render react-email template<br/>with last 5 posts matching prefs]
  Render --> Resend[POST to Resend API]
  Resend --> Inbox[Test email arrives within ~10s]
```

Frequency=`none` disables sends entirely; the daily/weekly cron skips that user.

---

## Suggest a publisher

```mermaid
sequenceDiagram
  autonumber
  actor U as Signed-in user
  participant W as Next.js
  participant DB as Supabase
  participant V as Validation worker
  participant R as Resend
  actor A as Admin

  U->>W: GET /suggest
  U->>W: Pick type, fill form, Submit
  W->>DB: Rate-limit check<br/>(<= 3 pending, <= 10/week)
  alt Limit exceeded
    DB-->>W: blocked
    W-->>U: Inline error
  else OK
    W->>DB: INSERT publisher_suggestions(status='pending')
    W->>V: Enqueue background validation<br/>(Postgres pg_notify or HTTP route)
    W-->>U: Toast + redirect to /me/suggestions
    V->>V: Fetch website, look for RSS link,<br/>fetch feed, count items, capture latest pubDate
    V->>DB: UPDATE auto_validation jsonb
  end
  
  Note over A: Sometime later
  A->>W: GET /admin/moderation
  W->>DB: SELECT pending suggestions<br/>+ auto_validation
  W-->>A: Queue UI
```

---

## Admin reviews suggestion

```mermaid
flowchart TD
  Open[Admin opens suggestion in detail pane] --> Choose{Decision}
  Choose -- "Approve and add" --> Tx["Postgres txn:<br/>1. INSERT publishers<br/>2. INSERT blog_sources<br/>3. UPDATE suggestion approved<br/>4. INSERT audit_log"]
  Tx --> NotifyA[Send 'Approved' email<br/>via Resend]
  NotifyA --> Notif[Insert in-app notification]
  
  Choose -- "Reject" --> Reject["UPDATE suggestion<br/>status=rejected<br/>review_notes=..."]
  Reject --> NotifyR[Send 'Rejected' email]
  
  Choose -- "Request changes" --> Chg["UPDATE status=changes_requested<br/>review_notes=..."]
  Chg --> NotifyC[Send 'Please revise' email]
  
  NotifyA --> Done[Submitter sees status update<br/>in /me/suggestions and notifications]
  NotifyR --> Done
  NotifyC --> Done
```

The Postgres transaction in Approve guarantees we never end up with a publisher row but no source (or vice versa). All three decisions write to `audit_log` for traceability.

---

## Daily / weekly digest send

```mermaid
sequenceDiagram
  autonumber
  participant Cron as Vercel Cron
  participant W as /api/cron/digest
  participant DB as Supabase
  participant R as Resend

  Cron->>W: GET /api/cron/digest<br/>Authorization: Bearer CRON_SECRET
  W->>W: Verify secret
  W->>DB: SELECT users WHERE digest_preferences.frequency<br/>matches today's slot AND last_sent_at < now() - interval
  DB-->>W: list of users
  loop For each user (with concurrency cap)
    W->>DB: SELECT posts since last_sent_at<br/>filtered by user's prefs<br/>(followed_publishers, followed_tags,<br/>include_paid)
    alt 0 posts found
      W->>DB: INSERT digest_log(status='skipped')
    else >= 1 posts
      W->>W: Render react-email template
      W->>R: POST email
      R-->>W: ok
      W->>DB: UPDATE digest_preferences.last_sent_at<br/>INSERT digest_log(status='sent', post_count=N)
    end
  end
```

**Throttling:** Resend free tier is 100/day. If user count > 100, the daily cron stages sends across the day in batches of ~80 to leave headroom.

**Unsubscribe:** Each email contains an `Unsubscribe` link → `/api/digest/unsubscribe?token=...` (signed JWT) → sets `frequency='none'` and shows a "You're unsubscribed" page with a re-enable button.

---

## Ingestion pipeline

```mermaid
flowchart LR
  Cron[Vercel Cron every 4h] --> Auth[Verify CRON_SECRET]
  Auth --> Load["SELECT active sources<br/>WHERE last_fetched_at < now()-1h"]
  Load --> Pool{Type?}
  Pool -- "rss/atom" --> Rss[rss-parser fetch + parse]
  Pool -- "scrape" --> Scr["Cheerio: find article links<br/>via scrape_config.selector"]
  Scr --> Read[Mozilla Readability<br/>extract title/summary/date]
  Rss --> Canon[Canonicalize URL<br/>strip UTM/gclid/hash]
  Read --> Canon
  Canon --> Detect["detectAccess.ts:<br/>infer paywall from RSS hints<br/>or known paywall_provider"]
  Detect --> Tag["autoTag.ts:<br/>match title+summary against<br/>tag dictionary"]
  Tag --> Dedupe{canonical_url<br/>already exists?}
  Dedupe -- yes --> Skip[skip]
  Dedupe -- no --> Insert[INSERT posts + post_tags]
  Insert --> Update[UPDATE blog_sources.last_fetched_at]
  Update --> Log["Structured JSON log:<br/>source_id, inserted, errors"]
```

**SSRF guard (mandatory):** Before any feed fetch, resolve hostname and reject if it resolves to a private/loopback/link-local range. Allow only `http(s)` schemes.

**Paid detection:** `detectAccess.ts` heuristics:

- Substack feeds expose `<enclosure type="text/html"/>` for paid posts in some configurations.
- Ghost feeds set the `<itunes:summary>` to a "members-only" string.
- Medium hides paid post bodies under `<content:encoded>` ending in "Continue reading on Medium".
- We default to `free` and only flag `paid`/`members_only` when a heuristic matches. Admin can override per source via `default_access_label`.

---

## Read-event tracking

```mermaid
flowchart TD
  Click[User clicks 'Open original'] --> Out[/out/postId/]
  Out --> Cookie{df_anon cookie?}
  Cookie -- no --> Set[Set df_anon cookie: random ULID]
  Cookie -- yes --> Use[Use existing]
  Set --> Hash
  Use --> Hash[HMAC-SHA256 IP and UA<br/>with daily-rotating salt]
  Hash --> Limit{Rate-limit?<br/>1/sec per anon_id}
  Limit -- exceeded --> Skip2[skip insert,<br/>still redirect]
  Limit -- ok --> Insert2[INSERT read_events]
  Skip2 --> Redir[302 to canonical_url]
  Insert2 --> Redir
```

The `read_events` table is partitioned monthly. After 90 days, raw rows are aggregated into `read_events_daily` (post_id, day, count) and the raw partition is dropped. This keeps the DB under 500MB on free tier.

---

## System architecture (recap)

```mermaid
flowchart LR
  Anon[Anonymous user] --> Web
  Auth[Signed-in user] --> Web
  Admin[Admin] --> Web
  Web["Next.js on Vercel<br/>App Router + Server Actions"] --> SB[(Supabase<br/>Postgres + Auth + RLS)]
  
  IngestCron[Vercel Cron 4h] --> Ingest[/api/cron/ingest/]
  Ingest --> Rss[rss-parser]
  Ingest --> Scrape[cheerio + readability]
  Rss --> SB
  Scrape --> SB
  
  DigestCron["Vercel Cron daily/weekly"] --> Digest[/api/cron/digest/]
  Digest --> SB
  Digest --> Resend[Resend API]
  Resend --> Mail[User inbox]
  
  Suggest[/api/suggest-validate/] --> SB
  
  Web -.read..-> SB
  Web -.write via service-role for admin..-> SB
```
