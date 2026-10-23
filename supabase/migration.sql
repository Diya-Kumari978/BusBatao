-- Apply in Supabase SQL Editor. This idempotent migration adds anonymous, non-PII trip observations.
create extension if not exists pgcrypto;

create table if not exists public.site_feedback (
  id uuid primary key default gen_random_uuid(),
  reporter_id text not null,
  name text not null check (char_length(name) between 1 and 80),
  rating integer not null check (rating between 1 and 5),
  liked text[] not null default '{}',
  improve text[] not null default '{}',
  message text not null default '' check (char_length(message) <= 500),
  created_at timestamptz not null default now()
);
alter table public.site_feedback add column if not exists reporter_id text;
update public.site_feedback set reporter_id = id::text where reporter_id is null;
alter table public.site_feedback alter column reporter_id set not null;
create unique index if not exists site_feedback_reporter_id_idx on public.site_feedback(reporter_id);
alter table public.site_feedback enable row level security;
drop policy if exists "Public can read website feedback" on public.site_feedback;
create policy "Public can read website feedback" on public.site_feedback for select to anon, authenticated using (true);
drop policy if exists "Public can submit website feedback" on public.site_feedback;
create policy "Public can submit website feedback" on public.site_feedback for insert to anon, authenticated with check (true);
grant select, insert on public.site_feedback to anon, authenticated;

-- Restore the official route catalogue if the existing rows are still draft/unverified.
insert into public.routes
  (id, route_code, name, origin, destination, city, published_status, verification_status, source_name, source_url, last_verified_at, description, is_demo)
values
  ('hyd-01-candidate','HYD-01','Hyder Chowk to Hatri Police Station','Hyder Chowk','Hatri Police Station','Hyderabad','active','verified','SMTA route directory (checked 2026-10-23)','https://smta.gos.pk/route-map','2026-10-23T00:00:00Z','Official active route, 15 km. Ordered stops: Hyder Chowk, Fatima Jinnah NBP, Civic Center, Giddu Chowk, Qasim Chowk, Central Jail Hyderabad, ISRA Hospital, Hatri Police Station. Fare and timetable are not published.',false),
  ('hyd-02-candidate','HYD-02','Hala Naka to Tando Allahyar','Hala Naka','Tando Allahyar','Hyderabad','active','verified','SMTA route directory (checked 2026-10-23)','https://smta.gos.pk/route-map','2026-10-23T00:00:00Z','Official active route, 40 km. Ordered stops: Hala Naka, New Sabzi Mandi, Mirrani Goth, Tando Jam Toll, Detta Goth, Goth Misri Solangi, Tando Jam, Khesana Mori, Rashidabad, Tando Allahyar. Fare and timetable are not published.',false),
  ('hyd-03-candidate','HYD-03','Hyder Chowk to Kohsar Colony (inactive)','Hyder Chowk','Kohsar Colony','Hyderabad','inactive','verified','SMTA route directory (checked 2026-10-23)','https://smta.gos.pk/route-map','2026-10-23T00:00:00Z','Official inactive route, 14 km. Ordered stops: Hyder Chowk, Tandi Sarak, Autobahn Road, Latifabad, Airport Road, Kohsar Colony. Confirm current service before travelling.',false)
on conflict (id) do update set
  route_code = excluded.route_code, name = excluded.name, origin = excluded.origin, destination = excluded.destination,
  city = excluded.city, published_status = excluded.published_status, verification_status = excluded.verification_status,
  source_name = excluded.source_name, source_url = excluded.source_url, last_verified_at = excluded.last_verified_at,
  description = excluded.description, is_demo = false;

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
alter table public.trips add column if not exists from_location text;
alter table public.trips add column if not exists to_name text;
alter table public.trips add column if not exists route_name text;
alter table public.trips add column if not exists bus_number text;
alter table public.trips add column if not exists reported_at timestamptz;
alter table public.trips add column if not exists expires_at timestamptz not null default (now() + interval '48 hours');
alter table public.trips drop constraint if exists trips_route_id_fkey;
create index if not exists trips_route_departure_idx on public.trips(route_id, departure_at desc);

create table if not exists public.trip_feedback (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique,
  route_id text not null references public.routes(id) on delete cascade,
  city text not null check (city in ('Hyderabad', 'Jamshoro')),
  reporter_id text not null,
  crowd_level text not null check (crowd_level in ('low','moderate','high','full')),
  delay_minutes integer not null check (delay_minutes between 0 and 300),
  on_time boolean not null,
  rating integer not null check (rating between 1 and 5),
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists trip_feedback_route_observed_idx on public.trip_feedback(route_id, observed_at desc);

alter table public.trips enable row level security;
alter table public.reports enable row level security;
alter table public.feedback enable row level security;
alter table public.trip_feedback enable row level security;

drop policy if exists "Public can read visible reports" on public.reports;
create policy "Public can read visible reports" on public.reports for select to anon, authenticated using (moderation_status = 'visible');
drop policy if exists "Public can submit community reports" on public.reports;
create policy "Public can submit community reports" on public.reports for insert to anon, authenticated with check (source_type = 'community' and moderation_status = 'visible' and is_demo = false);

drop policy if exists "Public can read route feedback" on public.feedback;
create policy "Public can read route feedback" on public.feedback for select to anon, authenticated using (true);
drop policy if exists "Public can submit route feedback" on public.feedback;
create policy "Public can submit route feedback" on public.feedback for insert to anon, authenticated with check (true);

-- Trip rows contain no name or typed location; only anonymized route observations are public.
drop policy if exists "Public can read anonymized trip observations" on public.trips;
create policy "Public can read anonymized trip observations" on public.trips for select to anon, authenticated using (true);
drop policy if exists "Public can submit anonymized trip observations" on public.trips;
create policy "Public can submit anonymized trip observations" on public.trips for insert to anon, authenticated with check (true);

drop policy if exists "Public can submit trip feedback" on public.trip_feedback;
create policy "Public can submit trip feedback" on public.trip_feedback for insert to anon, authenticated with check (exists (
  select 1 from public.routes r where r.id = public.trip_feedback.route_id and r.city = public.trip_feedback.city and r.is_demo = false and r.verification_status = 'verified' and r.published_status = 'active'
));
drop policy if exists "Public can read trip feedback" on public.trip_feedback;
create policy "Public can read trip feedback" on public.trip_feedback for select to anon, authenticated using (true);

grant select, insert on public.reports, public.feedback, public.trips to anon, authenticated;
grant select, insert on public.trip_feedback to anon, authenticated;

-- Shared passenger report details and automatic 48-hour expiry.
alter table public.reports add column if not exists reporter_name text;
alter table public.reports add column if not exists reporter_location text;
alter table public.reports add column if not exists bus_number text;
alter table public.reports add column if not exists bus_location text;
alter table public.reports add column if not exists is_on_bus boolean;
alter table public.reports add column if not exists left_minutes_ago integer check (left_minutes_ago is null or left_minutes_ago between 0 and 1440);
alter table public.reports add column if not exists expires_at timestamptz not null default (now() + interval '48 hours');
alter table public.reports add column if not exists updated_at timestamptz not null default now();
alter table public.reports drop constraint if exists reports_route_id_fkey;
update public.reports set expires_at = observed_at + interval '48 hours' where expires_at > observed_at + interval '48 hours';
create index if not exists reports_route_expires_idx on public.reports(route_id, expires_at desc) where moderation_status = 'visible' and is_demo = false;

alter table public.trip_feedback add column if not exists punctuality text check (punctuality is null or punctuality in ('yes','no','late'));
alter table public.trip_feedback add column if not exists bus_number text;
alter table public.trip_feedback add column if not exists seat text check (seat is null or seat in ('Yes','Standing','No seat'));
alter table public.trip_feedback add column if not exists comment text check (comment is null or char_length(comment) <= 240);
alter table public.trip_feedback drop constraint if exists trip_feedback_route_id_fkey;
