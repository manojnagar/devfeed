-- Migration 0002: Core catalog tables — publishers, blog_sources, posts, tags, post_tags.
--
-- These are the read-mostly content tables. RLS allows the `anon` role
-- to SELECT every row when the corresponding parent is active, so the
-- public feed works without authentication.

create table publishers (
  id uuid primary key default gen_random_uuid(),
  type publisher_type not null,
  slug text not null unique,
  name text not null,
  website_url text not null,
  description text,
  logo_url text,
  twitter_handle text,
  github_handle text,
  home_country text,
  default_access_label access_label not null default 'free',
  default_paywall_provider paywall_provider not null default 'unknown',
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index publishers_type_idx on publishers (type) where is_active;
create index publishers_slug_idx on publishers (slug);

create table blog_sources (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references publishers(id) on delete cascade,
  kind source_kind not null,
  feed_url text not null,
  scrape_config jsonb,
  is_active boolean not null default true,
  last_fetched_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  consecutive_failures int not null default 0,
  created_at timestamptz not null default now(),
  unique (publisher_id, feed_url)
);

create index blog_sources_active_idx on blog_sources (last_fetched_at) where is_active;

create table tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_featured boolean not null default false
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references publishers(id) on delete cascade,
  source_id uuid not null references blog_sources(id) on delete cascade,
  title text not null,
  summary text,
  url text not null,
  canonical_url text not null unique,
  author_name text,
  published_at timestamptz not null,
  reading_time_min int,
  access_label access_label not null default 'free',
  paywall_provider paywall_provider not null default 'unknown',
  thumbnail_url text,
  raw_content_hash text,
  created_at timestamptz not null default now()
);

create index posts_published_at_idx on posts (published_at desc);
create index posts_publisher_idx on posts (publisher_id, published_at desc);
create index posts_access_idx on posts (access_label);

-- Full-text search index over title + summary
create index posts_fts_idx on posts using gin (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, ''))
);

create table post_tags (
  post_id uuid not null references posts(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create index post_tags_tag_idx on post_tags (tag_id);

-- updated_at trigger for publishers
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger publishers_updated_at
  before update on publishers
  for each row execute function set_updated_at();

-- RLS — public read of active rows; writes restricted to admin/service roles
alter table publishers enable row level security;
alter table blog_sources enable row level security;
alter table tags enable row level security;
alter table posts enable row level security;
alter table post_tags enable row level security;

create policy publishers_anon_read on publishers
  for select to anon, authenticated
  using (is_active);

create policy blog_sources_anon_read on blog_sources
  for select to anon, authenticated
  using (is_active);

create policy tags_anon_read on tags
  for select to anon, authenticated using (true);

create policy posts_anon_read on posts
  for select to anon, authenticated
  using (
    exists (select 1 from publishers p where p.id = posts.publisher_id and p.is_active)
  );

create policy post_tags_anon_read on post_tags
  for select to anon, authenticated
  using (
    exists (select 1 from posts p where p.id = post_tags.post_id)
  );
