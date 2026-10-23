# BusBatao

**Bus ka haal, pehle se pata.**

BusBatao is a public-service application for published route information and passenger-reported transport observations in Hyderabad and Jamshoro, Sindh. It does not provide live GPS or guaranteed bus arrival information.

## Current data research

The Sindh Mass Transit Authority route directory ([source](https://smta.gos.pk/route-map)) was checked on **23 October 2026**. The page content available during the check listed Karachi routes R1–R13 and did not expose a Hyderabad route directory. As a result:

- The HYD-01, HYD-02 and HYD-03 examples from the project brief are recorded only as **unverified candidate routes** with unknown published status and no fabricated stop sequence.
- [`supabase/seed-stops.sql`](./supabase/seed-stops.sql) contains six community-listed Hyderabad/Jamshoro stops with approximate, explicitly unverified coordinates. It adds catalogue rows only—not routes, reports or demo records.
- No route is marked active or officially verified based on the inaccessible/unlisted evidence.
- The latest source-check date and URL are kept with each candidate. The route directory should be rechecked manually before a real deployment.

The Jamshoro campus loop, campus connector, city connector, five stops and twelve observations in Demo Mode are **fictional demonstration data**. They are isolated from community reports and are never described as verified services.

## Features

- Mobile-first dashboard, city selector, route/stop search, route catalogue and source/verification labels.
- Candidate official route records with transparent source, checked date and unverified status.
- Stop and route detail pages; route stop sequence appears only when configured.
- Report submission with observation time distinct from database submission time, route/stop, report type, service status, crowd level and optional description.
- Report history filters and an observation flag queue.
- Recent (under 15 min), Aging (15–60 min) and Stale (over 60 min) labels based on observation time. Only visible observations from the last 60 minutes affect status.
- Contradiction detection for close-in-time service and crowd observations; confidence considers evidence quantity, freshness, agreement and conflicts.
- Opt-in, isolated Demo Mode with five stops, three fictional routes and twelve fictional reports.
- Route suggestions are stored unverified and reviewed through protected admin endpoints.
- Genuine server-only Gemini integration for evidence-linked summaries, zod validation, one retry for invalid JSON, timeouts, request limits, analysis history and explicit deterministic fallback.
- Accessible loading, empty, validation and failure states; no user GPS access or coordinates invented.

## Technology

- Next.js App Router, React and TypeScript.
- Supabase Postgres with RLS and server-only service role access.
- Gemini `generateContent` HTTP API, called only by `app/api/summary`.
- Vercel-ready Next.js configuration.

## Local setup

1. Use Node.js 20.9 or newer.
2. Copy `.env.example` to `.env.local`.
3. For persistent shared routes, observations, flags, analyses, feedback and suggestions, create a Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql) in its SQL editor. For an existing setup, also run the feedback table SQL shown below.
4. To configure the six approximate community stops, open Supabase **SQL Editor**, paste the contents of [`supabase/seed-stops.sql`](./supabase/seed-stops.sql), and run it. The script is safe to rerun. Stop records are non-demo and unverified; the app loads them from `public.stops` after the server-side Supabase environment is configured. No Hyderabad/Jamshoro routes are added without a reliable source.
5. Stop maps use configured Supabase coordinates and label their approximate/unverified status; no bus locations are fabricated.
6. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Never use the service key in client-side code.
7. For actual Gemini analyses, set `AI_API_KEY`. `AI_MODEL` defaults to `gemini-2.5-flash`.
8. Run `npm install`, then `npm run dev` and open `http://localhost:3000`.
9. Opt in to Demo Mode only by visiting `/?demo=1`. To seed its clearly separated records into Supabase, run `npm run seed`. To remove only demo records without deleting community reports, run `npm run reset:demo`.
10. Run `npm run lint`, `npm test`, `npx tsc --noEmit`, and `npm run build`.

If Supabase is not configured, report submission and feedback are unavailable and the app displays an error; no live report is saved in browser storage. Demo Mode works locally without Supabase. AI summaries use actual Supabase report rows or the explicitly selected fictional demo dataset; if `AI_API_KEY` is absent, the app labels its deterministic fallback as not AI-generated.

For an existing Supabase project, run this additive SQL in the SQL Editor to enable persisted summary feedback:

```sql
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('stop','route')),
  target_id text not null,
  helpful boolean not null,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
```

## Routes and backend

- `/` — live dashboard; `/?demo=1` displays isolated fictional demo data.
- `/routes` and `/routes/[id]` — searchable catalogue and route details.
- `/stop/[id]` — stop result and report history; `/stops/[id]` redirects to the canonical path.
- `/report` — passenger observation form.
- `/updates` — filterable community history; `/updates?demo=1` shows only fictional samples.
- `/compare` — comparison with an honest insufficient-evidence state.
- `/routes/suggest` — submit an unverified route suggestion.
- `/about` — data sources, freshness, AI and privacy limitations.
- `GET /api/routes`, `GET/POST /api/reports`, `POST /api/reports/[id]/flag`, `POST /api/summary`, `GET /api/demo`, `POST /api/route-suggestions`.
- Admin-only review APIs: `GET/PATCH /api/admin/flags` and `GET/PATCH /api/admin/route-suggestions`.

Admin APIs require `Authorization: Bearer <ADMIN_API_KEY>` and a server-side Supabase service role key. They are not accessible through public UI. An approved community suggestion remains **unverified**; approval does not make it official.

## AI and data handling

The AI route retrieves visible reports from the database, filters to observations in the one-hour evidence window, deduplicates a browser reporter’s close repeat observations, and sends only the evidence fields needed for analysis. Descriptions are untrusted data, never instructions. Report IDs, timestamps and freshness are derived in application code; model confidence is validated with the rest of the JSON response. Valid model output is schema-checked; invalid JSON is retried once. AI request limits and a provider timeout reduce cost and latency. Analyses are stored in `ai_analyses` with evidence IDs when Supabase is configured.

Demo analyses use the separate fictional dataset only after Demo Mode is explicitly selected. Real community data and demo data are never silently combined.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | For persistent/shared data | Supabase project endpoint. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Public Supabase client key; it is not used for privileged database access. |
| `SUPABASE_SERVICE_ROLE_KEY` | For server-side database access | Secret service key. Keep private and rotate if exposed. |
| `AI_API_KEY` | For Gemini | Secret provider API key. It is sent only in a server-side request header. |
| `AI_MODEL` | No | Gemini model identifier; default `gemini-2.5-flash`. |
| `ADMIN_API_KEY` | For protected review tools | Secret bearer token for administrative APIs. Use a strong random value. |
| `NEXT_PUBLIC_APP_URL` | No | Deployed origin for environment documentation/configuration. |

## Tests and deployment

Unit tests: `npm test`. Type-check: `npx tsc --noEmit`. Production build: `npm run build`.

For Vercel deployment, connect this project, set server environment variables in Vercel, apply the Supabase schema, and test report submission and Gemini analysis against the deployed database. No public deployment, GitHub publication, or verified source update is claimed by this project setup.

- Live URL: [Add after deployment and verification]
- Demo video: [Add video URL]

## 3–5 minute demo walkthrough

1. Open the live-data view and explain why the supplied HYD route examples remain unverified.
2. Opt into Demo Mode and show the separate fictional route catalogue and observations.
3. Open `DEMO-01`, inspect its stops, and run BusBatao Intelligence; show the conflicting demo observations and evidence strength.
4. Submit an observation and show the shared database result; if Supabase is not configured, the form must show that the report was not saved.
5. Compare sample routes and show that empty evidence does not imply a service recommendation.
6. Explain report flags, route suggestion review, privacy, and the absence of live GPS or arrival guarantees.

## Limitations and future work

- No verified Hyderabad or Jamshoro operating route data was available from the official route page checked for this implementation. Local verification is required before representing any route as official.
- Supabase, Gemini, GitHub and Vercel require the project owner’s credentials and are not connected or deployed by this code alone.
- Report-count rate limits are persisted through Supabase per reporter, with an in-memory per-instance IP safeguard; use a durable edge limiter for IP-wide limits before public high-volume deployment.
- Additional work: verified local operator feeds, reviewed route-stop sequences, formal admin authentication/roles, durable rate limiting, and usability testing with local commuters.

## Team and credits

- Team name: [Add team name]
- Members: [Add member names]
- Hackathon theme: Public Service
- Source research: Sindh Mass Transit Authority route directory, checked 23 October 2026.
- Demo routes and reports: fictional examples authored for BusBatao; never represent real passengers.
