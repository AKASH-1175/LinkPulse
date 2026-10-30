-- LinkPulse Database Schema
-- Supabase PostgreSQL

-- 1. Links Table
create table if not exists links (
  id bigint generated always as identity primary key,
  code text not null unique,
  original_url text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  click_count bigint not null default 0
);

-- 2. Clicks Table
create table if not exists clicks (
  id bigint generated always as identity primary key,
  link_id bigint not null references links(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  browser text,
  os text,
  device text,
  referrer text
);

-- 3. Indexes for fast analytics aggregation
create index if not exists idx_clicks_link_time on clicks (link_id, clicked_at);

-- 4. Stored Procedure to atomically increment click count
create or replace function increment_click_count(p_link_id bigint)
returns void language sql as $$
  update links set click_count = click_count + 1 where id = p_link_id;
$$;

-- 5. Row Level Security
alter table links enable row level security;
alter table clicks enable row level security;
-- Notice: No public RLS policies are added because only the backend
-- accesses the database using the service_role key, bypassing RLS securely.
