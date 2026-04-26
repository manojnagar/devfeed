# Ingestion pipeline

Triggered every 30 minutes by Vercel Cron (`/api/cron/ingest`).

```mermaid
flowchart TD
  CRON([Cron · /api/cron/ingest]) --> AUTH{Bearer auth?}
  AUTH -- no --> R401[401 unauthorized]
  AUTH -- yes --> RUN[runIngest]

  RUN --> SRC[blogSources.list]
  SRC --> LOOP{per source}

  LOOP --> FETCH[safeFetch · SSRF guard + 5s timeout]
  FETCH -->|error| MARK_FAIL[blogSources.markFetched error]
  FETCH -->|body| PARSE[parseFeed]
  PARSE --> ITEM{per item}

  ITEM --> CANON[canonicalizeUrl]
  CANON --> DETECT[detectAccess]
  DETECT --> TAG[autoTag]
  TAG --> INSERT[posts.upsert]
  INSERT --> NEXT_ITEM
  NEXT_ITEM --> LOOP

  LOOP --> MARK_OK[blogSources.markFetched ok]
  MARK_OK --> SUMMARY[return { processed, failed, inserted }]
```

Resilience guarantees:

- `safeFetch` blocks loopback/RFC1918 hosts (SSRF protection).
- Item parsing is permissive — malformed entries are skipped, not thrown.
- Failures are logged + persisted to `blog_sources.last_error` so the admin "sources" page can show health.
