# System architecture

A bird's-eye view of how the runtime pieces fit together.

```mermaid
flowchart LR
  subgraph Client[Browser]
    A[React Server Components]
    B[Client Components]
  end

  subgraph Vercel[Vercel Hobby]
    NXT[Next.js 15 App Router]
    EDGE[Route Handlers]
    CRON1[Cron · /api/cron/ingest]
    CRON2[Cron · /api/cron/digest]
  end

  subgraph Repos[Repository layer]
    REPO[Repository interfaces]
    MEM[(In-memory adapter · dev/test)]
    SUPA[(Supabase adapter · prod)]
  end

  subgraph External[External services]
    SB[(Supabase · Postgres + Auth + Storage)]
    RES[Resend · transactional email]
    RSS[Publisher RSS / Atom feeds]
  end

  Client --> NXT
  NXT --> REPO
  EDGE --> REPO
  CRON1 --> REPO
  CRON2 --> REPO
  REPO --> MEM
  REPO --> SUPA
  SUPA --> SB
  CRON1 -->|safeFetch| RSS
  CRON2 --> RES
```

Key contracts:

- **Repository pattern** isolates business logic from storage. Tests + dev use the in-memory adapter; production uses the Supabase adapter.
- **Auth** is a separate adapter (`stub` for dev, `supabase` for prod) so the rest of the app never touches `@supabase/ssr` directly.
- **Email** is also adapter-shaped (`console` for dev, `resend` for prod).
- **Cron jobs** are plain Route Handlers gated by `Authorization: Bearer $CRON_SECRET`.
