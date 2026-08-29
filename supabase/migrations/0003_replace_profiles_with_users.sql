-- Architecture correction: NestJS now owns authentication entirely
-- (bcrypt password hashing, NestJS-signed sessions). Supabase is used
-- purely as the PostgreSQL backend, no Supabase Auth involvement.
-- public.profiles (coupled to auth.users) is replaced by a standalone
-- public.users table with its own generated id and its own password
-- hash. There is no production user data, so this moves straight to
-- the final schema instead of adding a compatibility layer.

drop trigger if exists set_profiles_updated_at on public.profiles;
drop table if exists public.profiles;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null,
  phone text not null,
  password_hash text not null,
  role text not null default 'buyer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_role_check check (role in ('buyer', 'admin')),
  constraint users_username_normalized_check check (username = lower(btrim(username))),
  constraint users_username_key unique (username),
  constraint users_phone_key unique (phone)
);

-- Reuses the function created in 0001 (generic, not profiles-specific).
create trigger set_users_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();

alter table public.users enable row level security;

grant select, insert, update, delete on public.users to service_role;

-- No policies and no grants to anon/authenticated: with RLS enabled and
-- zero policies, all access is denied by default even if grants are
-- added later. NestJS's service-role key is the only access path.
