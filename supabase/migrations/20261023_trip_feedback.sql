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
alter table public.trip_feedback enable row level security;
