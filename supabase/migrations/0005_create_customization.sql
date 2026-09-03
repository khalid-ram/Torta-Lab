-- Dynamic Cake Customization fields (Phase 8). Admin-authored questions
-- that plug into the existing /customize flow, kept fully separate from
-- public.baked_cakes (different concept: a customer designing a NEW
-- cake, not a previously-baked one shown as "Our Work").
--
-- Same access pattern as every other table in this project: RLS enabled
-- with zero grants to anon/authenticated, so only the backend's
-- service-role key can read/write. The public GET /customization
-- endpoint filters to active fields/steps at the application layer.

-- A step is a page of the customer flow. Every admin-created field
-- belongs to exactly one step. Choosing "Separate Step" in the admin UI
-- creates a new step and assigns the field to it; choosing "Same Step"
-- assigns the field to an already-existing step instead. A step has no
-- status of its own — it is implicitly hidden from customers once none
-- of its fields are active, so there is nothing to keep in sync.
create table public.customization_steps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- Sequence across all steps. Not a unique constraint: reordering swaps
  -- two rows' order_index across two sequential updates, which would
  -- transiently violate uniqueness without a DB transaction/sentinel
  -- value. The service is the sole writer (RLS default-deny) and always
  -- maintains a clean, contiguous sequence, so uniqueness is an
  -- application-layer guarantee here rather than a database one.
  order_index integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customization_steps_title_not_blank check (btrim(title) <> '')
);

create index customization_steps_order_idx on public.customization_steps (order_index);

create trigger set_customization_steps_updated_at
  before update on public.customization_steps
  for each row
  execute function public.set_updated_at();

create table public.customization_fields (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.customization_steps(id) on delete cascade,
  label text not null,
  description text,
  is_required boolean not null default true,
  field_type text not null,
  -- Only meaningful (and only allowed to be non-null) when field_type =
  -- 'selection'; see the consistency check below.
  selection_mode text,
  -- Order within the field's own step (for multiple fields sharing one
  -- "Same Step" placement). Same non-unique rationale as steps above.
  order_index integer not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customization_fields_label_not_blank check (btrim(label) <> ''),
  constraint customization_fields_field_type_check check (field_type in ('text', 'number', 'selection')),
  constraint customization_fields_selection_mode_check check (selection_mode in ('single', 'multi')),
  constraint customization_fields_status_check check (status in ('active', 'paused')),
  -- A non-selection field must never carry a selection mode, and a
  -- selection field must always declare one (single or multi) — this is
  -- the "non-selection fields must not accidentally behave as
  -- multi-select" invariant from the spec, enforced so no application
  -- bug can persist an inconsistent row.
  constraint customization_fields_selection_mode_consistency_check check (
    (field_type = 'selection' and selection_mode is not null)
    or
    (field_type <> 'selection' and selection_mode is null)
  )
);

create index customization_fields_step_id_idx on public.customization_fields (step_id, order_index);

create trigger set_customization_fields_updated_at
  before update on public.customization_fields
  for each row
  execute function public.set_updated_at();

create table public.customization_field_options (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.customization_fields(id) on delete cascade,
  label text not null,
  order_index integer not null,
  created_at timestamptz not null default now(),
  constraint customization_field_options_label_not_blank check (btrim(label) <> '')
);

create index customization_field_options_field_id_idx on public.customization_field_options (field_id, order_index);

-- Minimum-2-options-per-selection-field is a cross-row cardinality rule
-- (a count over sibling rows), which a plain CHECK constraint cannot
-- express without a constraint trigger. It is enforced in
-- CustomizationService on every create/update instead, consistent with
-- how this codebase already enforces cross-row/business rules (e.g.
-- phone format, username uniqueness messaging) at the service layer.

alter table public.customization_steps enable row level security;
alter table public.customization_fields enable row level security;
alter table public.customization_field_options enable row level security;

grant select, insert, update, delete on public.customization_steps to service_role;
grant select, insert, update, delete on public.customization_fields to service_role;
grant select, insert, update, delete on public.customization_field_options to service_role;
