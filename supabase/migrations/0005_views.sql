-- Migration 0005: Materialized views for analytics + trending.
--
-- Refreshed via pg_cron (or Vercel Cron in case the user prefers app-level
-- scheduling). The application queries these views instead of running
-- aggregate scans on the hot path.

create materialized view trending_posts_7d as
select
  p.id as post_id,
  count(re.*) as read_count,
  max(re.occurred_at) as last_read_at
from posts p
left join read_events re on re.post_id = p.id and re.occurred_at >= now() - interval '7 days'
group by p.id;

create unique index trending_posts_7d_pkey on trending_posts_7d (post_id);

create materialized view posts_per_day_by_type as
select
  date_trunc('day', p.published_at)::date as day,
  pub.type as publisher_type,
  count(*) as post_count
from posts p
join publishers pub on pub.id = p.publisher_id
where p.published_at >= now() - interval '30 days'
group by 1, 2;

create unique index posts_per_day_by_type_pkey on posts_per_day_by_type (day, publisher_type);

create materialized view reads_by_publisher_30d as
select
  pub.id as publisher_id,
  pub.name as publisher_name,
  pub.type as publisher_type,
  count(re.*) as read_count
from publishers pub
left join posts p on p.publisher_id = pub.id
left join read_events re on re.post_id = p.id and re.occurred_at >= now() - interval '30 days'
group by pub.id;

create unique index reads_by_publisher_30d_pkey on reads_by_publisher_30d (publisher_id);

-- A helper to refresh all views in one call. Schedule with pg_cron:
--
--   select cron.schedule('refresh-devfeed-views', '0 * * * *', $$select refresh_devfeed_views()$$);
create or replace function refresh_devfeed_views() returns void language plpgsql as $$
begin
  refresh materialized view concurrently trending_posts_7d;
  refresh materialized view concurrently posts_per_day_by_type;
  refresh materialized view concurrently reads_by_publisher_30d;
end;
$$;
