-- Migration 0004: Suggestion + analytics + audit tables.
--
-- These complete the schema described in `PLAN.md §3`. The audit_log
-- is append-only and only writable by the service-role key — UI code
-- must never insert into it directly.

create table publisher_suggestions (
  id uuid primary key default gen_random_uuid(),
  submitted_by_user_id uuid not null references auth.users(id) on delete cascade,
  type publisher_type not null,
  name text not null,
  website_url text not null,
  feed_url text,
  feed_kind source_kind,
  reason text,
  auto_validation jsonb,
  status suggestion_status not null default 'pending',
  reviewed_by_user_id uuid references auth.users(id),
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index suggestions_status_idx on publisher_suggestions (status, created_at desc);
create index suggestions_submitter_idx on publisher_suggestions (submitted_by_user_id, created_at desc);

create trigger suggestions_updated_at
  before update on publisher_suggestions
  for each row execute function set_updated_at();

create table read_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  anon_id text,
  ip_hash text,
  ua_hash text,
  referrer text,
  occurred_at timestamptz not null default now()
);

create index read_events_post_idx on read_events (post_id, occurred_at desc);
create index read_events_occurred_idx on read_events (occurred_at desc);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_log_target_idx on audit_log (target_type, target_id, occurred_at desc);
create index audit_log_actor_idx on audit_log (actor_user_id, occurred_at desc);

alter table publisher_suggestions enable row level security;
alter table read_events enable row level security;
alter table audit_log enable row level security;

create policy suggestions_self_read on publisher_suggestions
  for select using (
    submitted_by_user_id = auth.uid() or is_admin()
  );

create policy suggestions_self_insert on publisher_suggestions
  for insert with check (submitted_by_user_id = auth.uid());

create policy suggestions_admin_update on publisher_suggestions
  for update using (is_admin()) with check (is_admin());

create policy read_events_anon_insert on read_events
  for insert to anon, authenticated with check (true);

create policy read_events_admin_read on read_events
  for select using (is_admin());

create policy audit_log_admin_read on audit_log
  for select using (is_admin());
