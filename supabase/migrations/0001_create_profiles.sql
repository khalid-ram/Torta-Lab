-- Profiles: one row per Supabase Auth user (buyer or admin).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  username text not null,
  phone text not null,
  email text,
  role text not null default 'buyer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('buyer', 'admin')),
  constraint profiles_username_normalized_check check (username = lower(btrim(username))),
  constraint profiles_username_key unique (username),
  constraint profiles_phone_key unique (phone)
);

-- Email is optional; only enforce uniqueness among rows that have one.
create unique index if not exists profiles_email_unique
  on public.profiles (email)
  where email is not null;

-- Single reusable updated_at function, attach to any table that needs it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- service_role does not automatically receive table privileges on new
-- tables in every project configuration; grant explicitly so a fresh
-- database is always correct without relying on a manual follow-up step.
grant select, insert, update, delete on public.profiles to service_role;

-- No policies yet, and no grants to anon/authenticated: with RLS enabled
-- and zero policies, all access is denied by default even if grants were
-- added later. The NestJS backend's service-role key is the only access
-- path this phase needs. Narrowly scoped policies (e.g. a user reading
-- their own row) belong to the auth/user-management phases that consume
-- this table.
