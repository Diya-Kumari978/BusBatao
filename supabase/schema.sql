create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.routes (
  id text primary key,
  route_code text not null,
  name text not null,
  origin text not null,
  destination text not null,
  city text not null check (city in ('Hyderabad', 'Jamshoro')),
  published_status text not null default 'unknown' check (published_status in ('active', 'inactive', 'unknown')),
  verification_status text not null default 'unverified' check (verification_status in ('verified', 'unverified', 'demonstration')),
  source_name text not null,
  source_url text,
  last_verified_at timestamptz,
  description text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_code, city)
);

create table if not exists public.stops (
  id text primary key,
  name text not null,
  city text not null check (city in ('Hyderabad', 'Jamshoro')),
  latitude double precision,
  longitude double precision,
  coordinate_source text,
  verification_status text not null default 'unverified' check (verification_status in ('verified', 'unverified', 'demonstration')),
  source_url text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id text not null references public.routes(id) on delete cascade,
  stop_id text not null references public.stops(id) on delete restrict,
  stop_order integer not null check (stop_order >= 0),
  source_name text,
  verification_status text not null default 'unverified' check (verification_status in ('verified', 'unverified', 'demonstration')),
  unique (route_id, stop_id),
  unique (route_id, stop_order)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  route_id text,
  stop_id text references public.stops(id) on delete set null,
  city text not null check (city in ('Hyderabad', 'Jamshoro')),
  report_type text not null check (report_type in ('bus_seen','bus_delayed','no_recent_bus','bus_crowded','bus_full','route_disruption','correction','other')),
  service_status text not null check (service_status in ('seen','delayed','not_seen','crowded','full','disrupted','unknown')),
  crowd_level text not null default 'unknown' check (crowd_level in ('low','moderate','high','full','unknown')),
  description text check (description is null or char_length(description) <= 240),
  observed_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  reporter_id text,
  reporter_name text,
  reporter_location text,
  bus_number text,
  bus_location text,
  is_on_bus boolean,
  left_minutes_ago integer check (left_minutes_ago is null or left_minutes_ago between 0 and 1440),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  updated_at timestamptz not null default now(),
  source_type text not null default 'community' check (source_type in ('community','demonstration')),
  moderation_status text not null default 'visible' check (moderation_status in ('visible','flagged','hidden')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (route_id is not null or stop_id is not null)
);

create table if not exists public.report_flags (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  reason text not null check (reason in ('inaccurate','inappropriate','spam','other')),
  description text check (description is null or char_length(description) <= 240),
  created_at timestamptz not null default now(),
  review_status text not null default 'pending' check (review_status in ('pending','reviewed','dismissed','actioned'))
);

create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  route_id text references public.routes(id) on delete set null,
  stop_id text references public.stops(id) on delete set null,
  analysis_type text not null check (analysis_type in ('route','stop','crowd','disruption')),
  result_json jsonb not null,
  evidence_report_ids uuid[] not null default '{}',
  generated_at timestamptz not null default now(),
  model_identifier text,
  is_demo boolean not null default false,
  check (route_id is not null or stop_id is not null)
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('stop','route')),
  target_id text not null,
  helpful boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.site_feedback (
  id uuid primary key default gen_random_uuid(),
  reporter_id text not null unique,
  name text not null check (char_length(name) between 1 and 80),
  rating integer not null check (rating between 1 and 5),
  liked text[] not null default '{}',
  improve text[] not null default '{}',
  message text not null default '' check (char_length(message) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  trip_id uuid primary key,
  route_id text not null,
  city text not null check (city in ('Hyderabad', 'Jamshoro')),
  reporter_id text not null,
  departure_at timestamptz not null,
  crowd_level text not null default 'unknown' check (crowd_level in ('low','moderate','high','full','unknown')),
  delay_minutes integer not null default 0 check (delay_minutes between 0 and 300),
  rating integer check (rating between 1 and 5),
  from_location text,
  to_name text,
  route_name text,
  bus_number text,
  reported_at timestamptz,
  expires_at timestamptz not null default (now() + interval '48 hours'),
  created_at timestamptz not null default now()
);

create table if not exists public.trip_feedback (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique,
  route_id text not null,
  city text not null check (city in ('Hyderabad', 'Jamshoro')),
  reporter_id text not null,
  crowd_level text not null check (crowd_level in ('low','moderate','high','full')),
  delay_minutes integer not null check (delay_minutes between 0 and 300),
  on_time boolean not null,
  punctuality text check (punctuality is null or punctuality in ('yes','no','late')),
  bus_number text,
  seat text check (seat is null or seat in ('Yes','Standing','No seat')),
  comment text check (comment is null or char_length(comment) <= 240),
  rating integer not null check (rating between 1 and 5),
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.route_suggestions (
  id uuid primary key default gen_random_uuid(),
  city text not null check (city in ('Hyderabad', 'Jamshoro')),
  proposed_route_details jsonb not null,
  proposed_stops jsonb not null default '[]'::jsonb,
  submitter_id text,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists routes_city_code_idx on public.routes(city, route_code);
create index if not exists stops_city_name_idx on public.stops(city, name);
create index if not exists route_stops_route_order_idx on public.route_stops(route_id, stop_order);
create index if not exists reports_stop_observed_idx on public.reports(stop_id, observed_at desc);
create index if not exists reports_route_observed_idx on public.reports(route_id, observed_at desc);
create index if not exists reports_city_observed_idx on public.reports(city, observed_at desc);
create index if not exists reports_reporter_submitted_idx on public.reports(reporter_id, submitted_at desc);
create index if not exists report_flags_review_idx on public.report_flags(review_status, created_at desc);
create index if not exists ai_analyses_target_generated_idx on public.ai_analyses(stop_id, route_id, generated_at desc);
create index if not exists route_suggestions_review_idx on public.route_suggestions(review_status, created_at desc);
create index if not exists trip_feedback_route_observed_idx on public.trip_feedback(route_id, observed_at desc);

drop trigger if exists routes_updated_at on public.routes;
create trigger routes_updated_at before update on public.routes for each row execute function public.set_updated_at();
drop trigger if exists stops_updated_at on public.stops;
create trigger stops_updated_at before update on public.stops for each row execute function public.set_updated_at();

alter table public.routes enable row level security;
alter table public.stops enable row level security;
alter table public.route_stops enable row level security;
alter table public.reports enable row level security;
alter table public.report_flags enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.feedback enable row level security;
alter table public.site_feedback enable row level security;
alter table public.trips enable row level security;
alter table public.trip_feedback enable row level security;
alter table public.route_suggestions enable row level security;

drop policy if exists "Public can read published route catalogue" on public.routes;
create policy "Public can read published route catalogue" on public.routes for select using (true);
drop policy if exists "Public can read configured stops" on public.stops;
create policy "Public can read configured stops" on public.stops for select using (true);
drop policy if exists "Public can read route stop sequences" on public.route_stops;
create policy "Public can read route stop sequences" on public.route_stops for select using (true);
drop policy if exists "Public can read visible reports" on public.reports;
create policy "Public can read visible reports" on public.reports for select using (moderation_status = 'visible');
drop policy if exists "Public can read route feedback" on public.feedback;
create policy "Public can read route feedback" on public.feedback for select using (true);
drop policy if exists "Public can submit route feedback" on public.feedback;
create policy "Public can submit route feedback" on public.feedback for insert with check (true);
drop policy if exists "Public can read website feedback" on public.site_feedback;
create policy "Public can read website feedback" on public.site_feedback for select to anon, authenticated using (true);
drop policy if exists "Public can submit website feedback" on public.site_feedback;
create policy "Public can submit website feedback" on public.site_feedback for insert to anon, authenticated with check (true);
drop policy if exists "Public can read trip history" on public.trips;
create policy "Public can read trip history" on public.trips for select using (expires_at > now());
drop policy if exists "Public can submit trip history" on public.trips;
create policy "Public can submit trip history" on public.trips for insert with check (true);
drop policy if exists "Public can read analyses" on public.ai_analyses;
create policy "Public can read analyses" on public.ai_analyses for select using (true);
-- No anonymous writes or public reads for flags/suggestions. Server routes use the service role.

insert into public.routes
  (id, route_code, name, origin, destination, city, published_status, verification_status, source_name, source_url, last_verified_at, description)
values
  ('hyd-01-candidate','HYD-01','Hyder Chowk to Hatri Police Station','Hyder Chowk','Hatri Police Station','Hyderabad','active','verified','SMTA route directory (checked 2026-10-23)','https://smta.gos.pk/route-map','2026-10-23T00:00:00Z','Official active route, 15 km. Ordered stops: Hyder Chowk, Fatima Jinnah NBP, Civic Center, Giddu Chowk, Qasim Chowk, Central Jail Hyderabad, ISRA Hospital, Hatri Police Station. Fare and timetable are not published.'),
  ('hyd-02-candidate','HYD-02','Hala Naka to Tando Allahyar','Hala Naka','Tando Allahyar','Hyderabad','active','verified','SMTA route directory (checked 2026-10-23)','https://smta.gos.pk/route-map','2026-10-23T00:00:00Z','Official active route, 40 km. Ordered stops: Hala Naka, New Sabzi Mandi, Mirrani Goth, Tando Jam Toll, Detta Goth, Goth Misri Solangi, Tando Jam, Khesana Mori, Rashidabad, Tando Allahyar. Fare and timetable are not published.'),
  ('hyd-03-candidate','HYD-03','Hyder Chowk to Kohsar Colony (inactive)','Hyder Chowk','Kohsar Colony','Hyderabad','inactive','verified','SMTA route directory (checked 2026-10-23)','https://smta.gos.pk/route-map','2026-10-23T00:00:00Z','Official inactive route, 14 km. Ordered stops: Hyder Chowk, Tandi Sarak, Autobahn Road, Latifabad, Airport Road, Kohsar Colony. Confirm current service before travelling.')
on conflict (id) do update set
  published_status = excluded.published_status,
  verification_status = excluded.verification_status,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  last_verified_at = excluded.last_verified_at,
  description = excluded.description;
