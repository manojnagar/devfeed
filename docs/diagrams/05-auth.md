# Auth & authorization

Two adapters share a single `AuthAdapter` interface. Server Components
call `requireUser` / `requireAdmin` to enforce access — `getOptionalSession`
is used by layouts that render differently for guests.

```mermaid
flowchart LR
  RSC[Server Component] -->|requireUser| AUTH[getAuth]
  RSC -->|requireAdmin| AUTH
  AUTH --> ADAPTER{adapter}
  ADAPTER -- stub --> COOKIE[(httpOnly cookie · userId)]
  ADAPTER -- supabase --> SBA[(@supabase/ssr · session)]

  COOKIE -->|profile lookup| REPO[(Profile repository)]
  SBA -->|profile lookup| REPO

  REPO --> SESSION[AuthSession]
  SESSION --> RSC

  RSC -->|no session| REDIRECT[redirect '/login']
  RSC -->|not admin| NF[notFound 404]
```

Notes:

- `requireAdmin` returns 404 instead of 403 — admin pages aren't even
  visible to non-admins (security through obscurity, on top of real
  enforcement).
- `signOutAction` clears the cookie / Supabase session and redirects to `/`.
