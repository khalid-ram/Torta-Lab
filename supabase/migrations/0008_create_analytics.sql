-- Lightweight first-party analytics for the Admin Overview dashboard
-- (V1): anonymous session tracking + a small funnel-event log for the
-- public Customize flow. Deliberately minimal — no IPs, fingerprints,
-- device/browser/geo data, page-view logs, cake customization answers,
-- or WhatsApp message content are stored here. The only personal link
-- possible is an already-logged-in visitor's own users.id, optional.

create table public.analytics_sessions (
  -- Client-generated: which physical row a "session" becomes is itself
  -- a client-side decision (new id after 30 minutes of inactivity, same
  -- id otherwise) — see lib/analytics/session.ts. The backend only ever
  -- upserts idempotently against retries, never assigns this itself.
  id uuid primary key,
  visitor_id text not null,
  user_id uuid references public.users(id) on delete set null,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  -- Accumulated ACTIVE time only (Page Visibility API gated on the
  -- client), in whole seconds — never "close time minus open time".
  active_seconds integer not null default 0,
  constraint analytics_sessions_active_seconds_check check (active_seconds >= 0)
);

create index analytics_sessions_started_at_idx on public.analytics_sessions (started_at);
create index analytics_sessions_visitor_id_idx on public.analytics_sessions (visitor_id);

alter table public.analytics_sessions enable row level security;
grant select, insert, update on public.analytics_sessions to service_role;
-- Same access pattern as every other table in this project: RLS
-- enabled with zero policies and no grants to anon/authenticated — the
-- browser never talks to Supabase directly, only the backend's
-- service-role key can read or write, even for anonymous visitors.

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.analytics_sessions(id) on delete cascade,
  event_name text not null,
  -- Correlates the 3 funnel events belonging to one Customize attempt.
  -- Client-generated; a fresh Customize session gets a new one, but
  -- refresh/Back/Next within the same attempt keep reusing it — mirrors
  -- the existing ?new=1 fresh-session behavior in app/customize/page.tsx.
  attempt_id text not null,
  -- Deliberately tiny and optional (e.g. which public CTA triggered
  -- customize_started) — never customer answers or message content.
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_event_name_check
    check (event_name in ('customize_started', 'customization_completed', 'customization_whatsapp_clicked')),
  -- One row per (attempt, event type) — the funnel counts each step
  -- once per attempt no matter how many times the client sends it
  -- (double-clicks, retries, revisiting Review), enforced here rather
  -- than trusted to client-side logic alone.
  constraint analytics_events_attempt_event_unique unique (attempt_id, event_name)
);

create index analytics_events_event_name_created_at_idx on public.analytics_events (event_name, created_at);
create index analytics_events_session_id_idx on public.analytics_events (session_id);

alter table public.analytics_events enable row level security;
grant select, insert on public.analytics_events to service_role;

-- Atomic increment for the active-time heartbeat, so two flushes for
-- the same session landing close together can't lose an update to a
-- read-then-write race.
create or replace function public.increment_session_active_seconds(p_session_id uuid, p_delta integer)
returns void
language sql
as $$
  update public.analytics_sessions
  set active_seconds = active_seconds + greatest(p_delta, 0),
      last_activity_at = now()
  where id = p_session_id;
$$;
