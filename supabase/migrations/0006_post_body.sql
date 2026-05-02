-- Migration 0006: Post body cache columns.
--
-- DevFeed renders the full article inline at /posts/[postId]. The body
-- comes from one of two sources:
--   - 'feed'      — captured during ingest from <content:encoded> /
--                   atom <content>. Cheapest, most legal (the publisher
--                   chose to publish the full body in their feed).
--   - 'extracted' — fetched + run through Mozilla Readability when the
--                   feed only ships a summary. Done lazily on first
--                   /posts/[postId] view, then cached here.
--
-- Both paths run through the same `sanitize-html` allow-list before
-- the row is updated, so we never trust stored data either.
--
-- `body_failed_at` lets the page short-circuit retries for URLs that
-- repeatedly fail to extract (404s, JS-only pages). The page applies a
-- 24h cool-off before attempting again.

alter table posts
  add column body_html text,
  add column body_source text check (body_source in ('feed','extracted')) default null,
  add column body_extracted_at timestamptz,
  add column body_failed_at timestamptz,
  add column body_failed_reason text;

-- Targeted partial index — only the rows the cool-off check cares
-- about. Keeps the index small even as `posts` grows.
create index posts_body_failed_at_idx
  on posts (body_failed_at)
  where body_failed_at is not null;
