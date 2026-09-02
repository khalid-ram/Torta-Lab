-- Baked Cakes / "Our Work" content management (Phase 7). NestJS's
-- service-role key remains the only access path, same as public.users:
-- RLS is enabled with zero grants to anon/authenticated, so the public
-- GET /baked-cakes endpoint enforces status = 'active' at the
-- application layer, not via Postgres policies.

create table public.baked_cakes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  is_available_to_order boolean not null default false,
  status text not null default 'active',
  media_type text not null,
  media_url text not null,
  media_path text not null,
  thumbnail_url text,
  thumbnail_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint baked_cakes_status_check check (status in ('active', 'paused')),
  constraint baked_cakes_media_type_check check (media_type in ('image', 'video')),
  -- The one rule that actually matters: an image cake carries no
  -- thumbnail, a video cake always carries both its video and a
  -- thumbnail. Enforced here so no application bug can ever persist a
  -- video without a thumbnail or a photo with stray thumbnail fields.
  constraint baked_cakes_media_consistency_check check (
    (media_type = 'image' and thumbnail_url is null and thumbnail_path is null)
    or
    (media_type = 'video' and thumbnail_url is not null and thumbnail_path is not null)
  )
);

create index baked_cakes_status_created_at_idx on public.baked_cakes (status, created_at desc);

-- Reuses the function created in migration 0001.
create trigger set_baked_cakes_updated_at
  before update on public.baked_cakes
  for each row
  execute function public.set_updated_at();

alter table public.baked_cakes enable row level security;

grant select, insert, update, delete on public.baked_cakes to service_role;

-- Storage: a public bucket, since baked cake media is intentionally
-- public homepage content. Public read is granted via a storage.objects
-- policy (storage.objects already has RLS enabled by default on every
-- Supabase project). Writes are not policy-granted to anon/authenticated,
-- so only the backend's service-role key (which bypasses RLS) can
-- upload/replace/delete — matching every other table in this project.
insert into storage.buckets (id, name, public)
values ('baked-cakes', 'baked-cakes', true)
on conflict (id) do nothing;

create policy "Public read access for baked-cakes"
  on storage.objects for select
  using (bucket_id = 'baked-cakes');
