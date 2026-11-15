-- SOMMR core schema. Plain PostgreSQL (13+): works on Supabase, Neon, RDS or a local server.

-- ───────────────────────────── Accounts ─────────────────────────────
create table users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  password_hash  text not null,
  display_name   text not null,
  role           text not null default 'user' check (role in ('user', 'admin')),
  city_slug      text,
  home_lat       double precision,
  home_lng       double precision,
  location_mode  text not null default 'city' check (location_mode in ('city', 'device')),
  interests      text[] not null default '{}',
  onboarded_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index users_email_key on users (lower(email));

create table sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users (id) on delete cascade,
  token_hash    text not null unique,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  expires_at    timestamptz not null
);
create index sessions_user_idx on sessions (user_id);

-- Sliding-window rate limiting for sign-in, registration and password resets.
create table auth_attempts (
  id          bigint generated always as identity primary key,
  bucket      text not null,
  created_at  timestamptz not null default now()
);
create index auth_attempts_bucket_idx on auth_attempts (bucket, created_at);

create table password_resets (
  token_hash  text primary key,
  user_id     uuid not null references users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);

-- ───────────────────────────── Taxonomy ─────────────────────────────
create table categories (
  slug         text primary key,
  kind         text not null check (kind in ('place', 'event')),
  label        text not null,
  description  text,
  icon         text not null,
  color        text not null,
  -- Place categories: OpenStreetMap tag filters used to import real places, e.g. {amenity=cafe}.
  osm_filters  text[] not null default '{}',
  -- Place categories that show events on the map instead (e.g. Festivals → {festival}).
  event_categories text[] not null default '{}',
  -- Event categories: words used to classify imported events.
  keywords     text[] not null default '{}',
  sort         integer not null default 0,
  active       boolean not null default true
);

-- ───────────────────────────── Places ─────────────────────────────
create table places (
  id              uuid primary key default gen_random_uuid(),
  source          text not null check (source in ('osm', 'admin', 'community')),
  source_id       text,                     -- e.g. node/123456 for OpenStreetMap
  name            text not null,
  category_slug   text not null references categories (slug) on update cascade,
  lat             double precision not null,
  lng             double precision not null,
  address         text,
  suburb          text,
  city            text,
  description     text,
  website         text,
  phone           text,
  opening_hours   text,
  image_url       text,
  tags            jsonb not null default '{}',
  status          text not null default 'published' check (status in ('published', 'pending', 'rejected', 'hidden')),
  featured        boolean not null default false,
  featured_note   text,
  locked_fields   text[] not null default '{}', -- fields an admin corrected; re-syncs leave them alone
  submitted_by    uuid references users (id) on delete set null,
  review_note     text,
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (source, source_id)
);
create index places_geo_idx on places (lat, lng);
create index places_category_idx on places (category_slug);
create index places_status_idx on places (status);

-- Which map grid cells have been fetched from OpenStreetMap, per category (a cache).
create table place_sync_cells (
  cell           text not null,
  category_slug  text not null,
  synced_at      timestamptz not null default now(),
  element_count  integer not null default 0,
  status         text not null default 'ok',
  primary key (cell, category_slug)
);

create table place_marks (
  user_id     uuid not null references users (id) on delete cascade,
  place_id    uuid not null references places (id) on delete cascade,
  saved_at    timestamptz,
  visited_at  timestamptz,
  primary key (user_id, place_id)
);
create index place_marks_place_idx on place_marks (place_id);

create table geocode_cache (
  query       text primary key,
  found       boolean not null,
  lat         double precision,
  lng         double precision,
  label       text,
  created_at  timestamptz not null default now()
);

-- ───────────────────────────── Events ─────────────────────────────
create table event_sources (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null check (kind in ('ticketmaster', 'quicket', 'ical', 'jsonld')),
  name              text not null,
  url               text,
  city_slug         text,
  default_category  text,
  config            jsonb not null default '{}',
  enabled           boolean not null default true,
  last_run_at       timestamptz,
  last_status       text,
  last_message      text,
  created_at        timestamptz not null default now()
);

create table events (
  id              uuid primary key default gen_random_uuid(),
  source          text not null check (source in ('ticketmaster', 'quicket', 'ical', 'jsonld', 'admin', 'community')),
  source_id       text,
  source_ref      uuid references event_sources (id) on delete set null,
  source_url      text,
  title           text not null,
  description     text,
  category_slug   text not null references categories (slug) on update cascade,
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  all_day         boolean not null default false,
  venue_name      text,
  address         text,
  city_slug       text,
  lat             double precision,
  lng             double precision,
  price_min       numeric(10, 2),
  price_max       numeric(10, 2),
  currency        text not null default 'ZAR',
  is_free         boolean,
  ticket_url      text,
  image_url       text,
  organiser       text,
  status          text not null default 'published'
                  check (status in ('published', 'pending', 'rejected', 'cancelled', 'archived')),
  featured        boolean not null default false,
  featured_note   text,
  locked_fields   text[] not null default '{}', -- fields an admin corrected; imports leave them alone
  content_hash    text,                         -- detects changes between imports
  submitted_by    uuid references users (id) on delete set null,
  review_note     text,
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (source, source_id)
);
create index events_starts_idx on events (starts_at);
create index events_city_idx on events (city_slug, starts_at);
create index events_status_idx on events (status);

create table import_runs (
  id               uuid primary key default gen_random_uuid(),
  source_ref       uuid references event_sources (id) on delete cascade,
  trigger          text not null,
  status           text not null default 'running',
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  created_count    integer not null default 0,
  updated_count    integer not null default 0,
  unchanged_count  integer not null default 0,
  removed_count    integer not null default 0,
  skipped_count    integer not null default 0,
  message          text
);
create index import_runs_started_idx on import_runs (started_at desc);

create table saved_events (
  user_id     uuid not null references users (id) on delete cascade,
  event_id    uuid not null references events (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- ───────────────────────────── Challenges ─────────────────────────────
create table challenges (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  kind            text not null check (kind in ('daily', 'weekly')),
  title           text not null,
  description     text not null,
  tip             text,
  interests       text[] not null default '{}',  -- empty = suits everyone
  cost            text not null default 'free' check (cost in ('free', 'low', 'medium')),
  points          integer not null default 10,
  place_category  text,                           -- Explore category that helps complete it
  coastal_only    boolean not null default false,
  months          smallint[] not null default '{}', -- empty = any month
  featured        boolean not null default false,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table user_challenges (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users (id) on delete cascade,
  challenge_id  uuid not null references challenges (id) on delete cascade,
  period        text not null check (period in ('daily', 'weekly')),
  period_key    text not null,     -- 2026-12-01 (daily) or 2026-W49 (weekly), South African time
  status        text not null default 'assigned' check (status in ('assigned', 'completed', 'swapped')),
  assigned_at   timestamptz not null default now(),
  completed_at  timestamptz,
  note          text,
  points        integer not null default 0
);
create unique index user_challenges_current on user_challenges (user_id, period, period_key)
  where status <> 'swapped';
create index user_challenges_user_idx on user_challenges (user_id, completed_at);

create table points_ledger (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references users (id) on delete cascade,
  amount      integer not null,
  reason      text not null,
  ref         text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, reason, ref)
);

create table user_achievements (
  user_id    uuid not null references users (id) on delete cascade,
  slug       text not null,
  earned_at  timestamptz not null default now(),
  primary key (user_id, slug)
);

-- ───────────────────────────── Bucket list & memories ─────────────────────────────
create table bucket_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users (id) on delete cascade,
  title            text not null,
  notes            text,
  suggestion_slug  text,
  interest         text,
  place_id         uuid references places (id) on delete set null,
  event_id         uuid references events (id) on delete set null,
  completed_at     timestamptz,
  sort             integer not null default 0,
  created_at       timestamptz not null default now()
);
create index bucket_items_user_idx on bucket_items (user_id);
create unique index bucket_items_suggestion_key on bucket_items (user_id, suggestion_slug)
  where suggestion_slug is not null;

create table media (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users (id) on delete cascade,
  content_type  text not null,
  byte_size     integer not null,
  width         integer,
  height        integer,
  storage       text not null check (storage in ('database', 'supabase')),
  storage_key   text,
  data          bytea,
  thumb_data    bytea,
  created_at    timestamptz not null default now()
);
create index media_user_idx on media (user_id);

create table memories (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users (id) on delete cascade,
  kind               text not null default 'moment' check (kind in ('moment', 'challenge', 'bucket', 'visit')),
  title              text not null,
  body               text,
  happened_on        date not null,
  place_id           uuid references places (id) on delete set null,
  place_name         text,
  user_challenge_id  uuid references user_challenges (id) on delete set null,
  bucket_item_id     uuid references bucket_items (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index memories_user_idx on memories (user_id, happened_on desc);

create table memory_photos (
  memory_id  uuid not null references memories (id) on delete cascade,
  media_id   uuid not null references media (id) on delete cascade,
  sort       integer not null default 0,
  primary key (memory_id, media_id)
);
