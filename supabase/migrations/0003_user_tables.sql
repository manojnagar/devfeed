-- Migration 0003: User-scoped tables — profiles, bookmarks, follows, digest prefs.
--
-- All RLS policies enforce row-ownership so a signed-in user can only
-- see / mutate their own rows. The `profiles.role='admin'` check is
-- exposed via the helper function `is_admin()` so admin policies stay
-- short and consistent.

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role user_role not null default 'user',
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public as
$$
  select exists (
    select 1 from profiles
    where user_id = auth.uid() and role = 'admin' and not is_banned
  );
$$;

create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as
$$
begin
  insert into profiles (user_id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'name')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create table bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index bookmarks_user_created_idx on bookmarks (user_id, created_at desc);

create table user_followed_publishers (
  user_id uuid not null references auth.users(id) on delete cascade,
  publisher_id uuid not null references publishers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, publisher_id)
);

create table user_followed_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);

create table digest_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  frequency digest_frequency not null default 'weekly',
  preferred_hour_utc int not null default 13 check (preferred_hour_utc between 0 and 23),
  include_followed_publishers boolean not null default true,
  include_followed_tags boolean not null default true,
  include_access_labels access_label[] not null default array['free','paid','members_only','mixed']::access_label[],
  max_posts_per_email int not null default 12 check (max_posts_per_email between 1 and 50),
  last_sent_at timestamptz
);

alter table profiles enable row level security;
alter table bookmarks enable row level security;
alter table user_followed_publishers enable row level security;
alter table user_followed_tags enable row level security;
alter table digest_preferences enable row level security;

create policy profiles_self_read on profiles
  for select using (user_id = auth.uid() or is_admin());

create policy profiles_self_update on profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy bookmarks_self_all on bookmarks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy followed_publishers_self_all on user_followed_publishers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy followed_tags_self_all on user_followed_tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy digest_prefs_self_all on digest_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
