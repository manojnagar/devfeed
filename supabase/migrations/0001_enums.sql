-- Migration 0001: Enum types.
--
-- Defined first so subsequent table migrations can reference them. All
-- enums match the TypeScript union types in `lib/types.ts` exactly —
-- keep both in sync.

create type publisher_type as enum ('company', 'person');
create type access_label as enum ('free', 'paid', 'members_only', 'mixed');
create type paywall_provider as enum ('substack', 'ghost', 'medium', 'patreon', 'unknown');
create type suggestion_status as enum ('pending', 'approved', 'rejected', 'needs_changes');
create type digest_frequency as enum ('off', 'daily', 'weekly');
create type source_kind as enum ('rss', 'atom', 'scrape');
create type user_role as enum ('user', 'admin');
