-- Cost Settings, Pricing, and Budget Leads (Phase 9). Same access
-- pattern as every other table in this project: RLS enabled, zero
-- policies, service_role only — the backend is the sole access path.
--
-- Business flow this schema supports:
--   Manufacturing Costs -> Recipe Cost -> Recommended Selling Price
--   -> Admin Approval -> Budget Recommendations -> Lead Capture
--
-- public.set_updated_at() (defined in 0001) only requires the target
-- row to have an `updated_at timestamptz` column — every table below
-- that attaches it has one, no table-specific logic needed.

-- ============================================================
-- 1. Generic scalar settings (margin %, rounding — NOT relational data)
-- ============================================================
create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  category text not null,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null,
  constraint app_settings_key_unique unique (key)
);

create trigger set_app_settings_updated_at
  before update on public.app_settings
  for each row
  execute function public.set_updated_at();

alter table public.app_settings enable row level security;
grant select, insert, update, delete on public.app_settings to service_role;

-- ============================================================
-- 2. Cost items — the real unit economics of materials/resources
-- ============================================================
create table public.cost_items (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  category text not null,
  purchase_quantity numeric(10, 3) not null,
  purchase_unit text not null,
  purchase_price_egp numeric(10, 2) not null,
  -- GENERATED, not a plain column: a service-layer bug updating
  -- purchase_price_egp/purchase_quantity without recomputing this
  -- could previously leave it silently stale. Postgres now derives it
  -- on every write, so it is structurally impossible for this value to
  -- disagree with its own inputs.
  calculated_unit_cost numeric(12, 4) generated always as (purchase_price_egp / purchase_quantity) stored,
  is_estimated boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cost_items_category_check
    check (category in ('ingredients', 'cream_fillings', 'packaging', 'utilities', 'labor', 'other')),
  constraint cost_items_unit_check
    check (purchase_unit in ('piece', 'gram', 'kilogram', 'tablespoon', 'hour', 'batch')),
  constraint cost_items_purchase_quantity_check check (purchase_quantity > 0),
  constraint cost_items_purchase_price_check check (purchase_price_egp >= 0),
  constraint cost_items_name_en_unique unique (name_en)
);

create index cost_items_category_idx on public.cost_items (category);

create trigger set_cost_items_updated_at
  before update on public.cost_items
  for each row
  execute function public.set_updated_at();

alter table public.cost_items enable row level security;
grant select, insert, update, delete on public.cost_items to service_role;

-- Snapshot of the previous value, written by the service in the same
-- transaction as the update it's recording. on delete restrict (not
-- cascade): a cost item with history can never be hard-deleted, which
-- is exactly the point — deactivate it (is_active = false) instead of
-- erasing the audit trail by deleting the row it belongs to.
create table public.cost_item_history (
  id uuid primary key default gen_random_uuid(),
  cost_item_id uuid not null references public.cost_items(id) on delete restrict,
  purchase_quantity numeric(10, 3) not null,
  purchase_unit text not null,
  purchase_price_egp numeric(10, 2) not null,
  calculated_unit_cost numeric(12, 4) not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references public.users(id) on delete set null
);

create index cost_item_history_item_idx on public.cost_item_history (cost_item_id, changed_at desc);

alter table public.cost_item_history enable row level security;
grant select, insert on public.cost_item_history to service_role;

-- ============================================================
-- 3. Recipes — a specific size/layer configuration's manufacturing bill
-- ============================================================
create table public.cake_recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cake_size_cm integer not null,
  layer_count integer not null,
  batch_yield integer not null default 1,
  -- A size/layer combo may have several recipes (different sponge
  -- flavors, each with its own cost) — at most one is the default cost
  -- reference cake_price_options.recipe_id normally points to,
  -- enforced by the partial unique index below rather than a plain
  -- unique(cake_size_cm, layer_count), which would have wrongly
  -- forbidden a second flavor at the same size.
  is_default boolean not null default false,
  -- The authoritative "is this recipe's cost complete" signal — an
  -- explicit admin decision, never inferred from "has at least one
  -- cost item." The admin UI will surface which of
  -- ingredients/cream_fillings/packaging/labor/utilities are missing
  -- as a guide, but only this flag drives costStatus: 'complete'.
  is_cost_confirmed boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cake_recipes_size_check check (cake_size_cm > 0),
  constraint cake_recipes_layers_check check (layer_count > 0),
  constraint cake_recipes_batch_yield_check check (batch_yield > 0),
  constraint cake_recipes_name_unique unique (name)
);

create unique index cake_recipes_default_per_size_layer_idx
  on public.cake_recipes (cake_size_cm, layer_count)
  where is_default;

create trigger set_cake_recipes_updated_at
  before update on public.cake_recipes
  for each row
  execute function public.set_updated_at();

alter table public.cake_recipes enable row level security;
grant select, insert, update, delete on public.cake_recipes to service_role;

create table public.cake_recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.cake_recipes(id) on delete cascade,
  cost_item_id uuid not null references public.cost_items(id) on delete restrict,
  quantity numeric(10, 3) not null,
  unit text not null,
  allocation_type text not null,
  is_estimated boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cake_recipe_items_quantity_check check (quantity > 0),
  constraint cake_recipe_items_unit_check
    check (unit in ('piece', 'gram', 'kilogram', 'tablespoon', 'hour', 'batch')),
  constraint cake_recipe_items_allocation_check
    check (allocation_type in ('per_batch', 'per_cake', 'per_unit', 'fixed_recipe_cost')),
  constraint cake_recipe_items_recipe_cost_item_unique unique (recipe_id, cost_item_id)
);

create index cake_recipe_items_recipe_idx on public.cake_recipe_items (recipe_id);

create trigger set_cake_recipe_items_updated_at
  before update on public.cake_recipe_items
  for each row
  execute function public.set_updated_at();

alter table public.cake_recipe_items enable row level security;
grant select, insert, update, delete on public.cake_recipe_items to service_role;

-- ============================================================
-- 4. Approved selling prices (customer-facing)
-- ============================================================
create table public.cake_price_options (
  id uuid primary key default gen_random_uuid(),
  size_cm integer not null,
  layers integer not null,
  -- Null until an admin configures a default recipe for this size/layer
  -- combo — the cost engine reports "not yet configured", never a guess.
  recipe_id uuid references public.cake_recipes(id) on delete set null,
  approved_selling_price numeric(10, 2) not null,
  price_status text not null default 'unpublished',
  -- No separate cost_verified flag here — cake_recipes.is_cost_confirmed
  -- is the single source of truth (derived via recipe_id at read time),
  -- avoiding two booleans that could silently disagree with each other.
  servings integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cake_price_options_size_layers_unique unique (size_cm, layers),
  constraint cake_price_options_price_check check (approved_selling_price >= 0),
  constraint cake_price_options_status_check check (price_status in ('approved', 'unpublished'))
);

create index cake_price_options_status_idx on public.cake_price_options (price_status);

create trigger set_cake_price_options_updated_at
  before update on public.cake_price_options
  for each row
  execute function public.set_updated_at();

alter table public.cake_price_options enable row level security;
grant select, insert, update, delete on public.cake_price_options to service_role;

-- on delete restrict, same reasoning as cost_item_history: a price
-- option with approval history can never be hard-deleted — unpublish
-- it (price_status = 'unpublished') instead.
create table public.cake_price_history (
  id uuid primary key default gen_random_uuid(),
  cake_price_option_id uuid not null references public.cake_price_options(id) on delete restrict,
  approved_selling_price numeric(10, 2) not null,
  price_status text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references public.users(id) on delete set null
);

create index cake_price_history_option_idx on public.cake_price_history (cake_price_option_id, changed_at desc);

alter table public.cake_price_history enable row level security;
grant select, insert on public.cake_price_history to service_role;

-- ============================================================
-- 5. Extras catalog — fillings/decorations, priced PER SIZE, not one
-- flat price for every size (a filling upgrade on a 24cm cake costs
-- more than the same upgrade on a 14cm cake).
-- ============================================================
create table public.cake_extra_options (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  name_ar text not null,
  name_en text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cake_extra_options_kind_check check (kind in ('filling', 'decoration')),
  constraint cake_extra_options_status_check check (status in ('active', 'paused')),
  constraint cake_extra_options_kind_name_unique unique (kind, name_en)
);

create trigger set_cake_extra_options_updated_at
  before update on public.cake_extra_options
  for each row
  execute function public.set_updated_at();

alter table public.cake_extra_options enable row level security;
grant select, insert, update, delete on public.cake_extra_options to service_role;

create table public.cake_extra_option_prices (
  id uuid primary key default gen_random_uuid(),
  extra_option_id uuid not null references public.cake_extra_options(id) on delete cascade,
  -- Null = a single size-independent price (e.g. "Toppers: starting
  -- from EGP 50" was given with no per-size breakdown at all — storing
  -- that as a repeated number across all four sizes would misrepresent
  -- it as four confirmed figures when only one was ever given).
  -- A unique partial index below allows at most one such generic row
  -- per extra, alongside any number of specific-size rows.
  size_cm integer,
  -- Null = not priced yet for this size. Never recommended to a
  -- customer until an admin sets a real value for that size.
  extra_price numeric(10, 2),
  -- 'fixed' = exactly this price. 'starting' = the business gave this
  -- as a floor ("starting from"), not a guaranteed final price —
  -- surfaced differently in the UI (e.g. "from EGP 50") so it's never
  -- misread as a fixed quote.
  price_type text not null default 'fixed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cake_extra_option_prices_size_check check (size_cm is null or size_cm > 0),
  constraint cake_extra_option_prices_price_check check (extra_price is null or extra_price >= 0),
  constraint cake_extra_option_prices_type_check check (price_type in ('fixed', 'starting')),
  constraint cake_extra_option_prices_unique unique (extra_option_id, size_cm)
);

create unique index cake_extra_option_prices_generic_idx
  on public.cake_extra_option_prices (extra_option_id)
  where size_cm is null;

create index cake_extra_option_prices_option_idx on public.cake_extra_option_prices (extra_option_id);

create trigger set_cake_extra_option_prices_updated_at
  before update on public.cake_extra_option_prices
  for each row
  execute function public.set_updated_at();

alter table public.cake_extra_option_prices enable row level security;
grant select, insert, update, delete on public.cake_extra_option_prices to service_role;

-- ============================================================
-- 6. Budget leads (separate from public.users entirely — see 0003's
--    not-null password_hash/unique phone, which a prospect must never
--    be forced through)
-- ============================================================
create table public.budget_prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone_e164 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_prospects_phone_key unique (phone_e164)
);

create trigger set_budget_prospects_updated_at
  before update on public.budget_prospects
  for each row
  execute function public.set_updated_at();

alter table public.budget_prospects enable row level security;
grant select, insert, update on public.budget_prospects to service_role;

create table public.budget_leads (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.budget_prospects(id) on delete cascade,
  customer_name text not null,
  phone_e164 text not null,
  budget_egp numeric(10, 2) not null,
  source text not null default 'budget_banner',
  status text not null default 'new',
  -- What the engine showed: array of {category, price_option_id,
  -- extra_option_id + size_cm + price per chosen extra, total_price}.
  recommendations jsonb,
  selected_price_option_id uuid references public.cake_price_options(id) on delete set null,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_leads_budget_check check (budget_egp >= 200),
  constraint budget_leads_status_check
    check (status in ('new', 'contacted', 'interested', 'converted', 'not_interested')),
  constraint budget_leads_idempotency_key_unique unique (idempotency_key)
);

create index budget_leads_created_at_idx on public.budget_leads (created_at desc);
create index budget_leads_status_idx on public.budget_leads (status);
create index budget_leads_prospect_idx on public.budget_leads (prospect_id);

create trigger set_budget_leads_updated_at
  before update on public.budget_leads
  for each row
  execute function public.set_updated_at();

alter table public.budget_leads enable row level security;
grant select, insert, update on public.budget_leads to service_role;

-- ============================================================
-- 7. Seed: settings defaults
-- ============================================================
insert into public.app_settings (key, category, value, description) values
  ('default_gross_margin_percent', 'pricing', '30', 'Target gross margin used to compute a recommended selling price from manufacturing cost.'),
  ('min_gross_margin_percent', 'pricing', '15', 'Warning-only threshold, never blocks a sale. Default placeholder — not yet business-confirmed.'),
  ('price_rounding_increment_egp', 'pricing', '5', 'Recommended (not approved) selling prices round up to this increment. Default placeholder — not yet business-confirmed.')
on conflict (key) do nothing;

-- ============================================================
-- 8. Seed: reference cost items (16cm / 5-layer recipe)
-- calculated_unit_cost is generated, not inserted — Postgres derives
-- it (26.00/4 = 6.50, 32.50/250 = 0.13, etc.), matching the manual
-- figures from the prior review exactly.
-- ============================================================
insert into public.cost_items (name_ar, name_en, category, purchase_quantity, purchase_unit, purchase_price_egp, is_estimated, is_active) values
  ('بيض',               'Eggs',                         'ingredients',    4,   'piece',      26.00,  false, true),
  ('دقيق',              'Flour',                        'ingredients',    250, 'gram',       32.50,  false, true),
  ('سكر',               'Sugar',                        'ingredients',    3,   'tablespoon', 1.50,   false, true),
  ('كريمة',             'Cream',                        'cream_fillings', 250, 'gram',       115.00, false, true),
  ('علبة التورتة',      'Cake Box',                      'packaging',      1,   'piece',      36.00,  false, true),
  ('قاعدة التورتة',     'Cake Board',                    'packaging',      1,   'piece',      22.00,  false, true),
  ('محسن الكيك',        'Cake Improver',                 'ingredients',    1,   'batch',      10.00,  true,  true),
  ('ورق الخبز',         'Baking Paper',                  'packaging',      1,   'batch',      7.00,   true,  true),
  ('كهرباء الفرن والخلاط', 'Oven & Mixer Electricity',   'utilities',      1,   'batch',      10.00,  true,  true),
  ('عمالة (بالساعة)',   'Labor (per hour)',              'labor',          1,   'hour',       50.00,  false, true)
on conflict (name_en) do nothing;

-- ============================================================
-- 9. Seed: the reference recipe itself (16cm, 5 layers -> EGP 385.00),
-- marked as the default cost reference for this size/layer combo.
-- ============================================================
insert into public.cake_recipes (name, cake_size_cm, layer_count, batch_yield, is_default, is_cost_confirmed, is_active)
values ('16cm / 5-Layer Reference Recipe', 16, 5, 1, true, true, true)
on conflict (name) do nothing;

insert into public.cake_recipe_items (recipe_id, cost_item_id, quantity, unit, allocation_type, is_estimated, notes)
select r.id, c.id, v.quantity, v.unit, v.allocation_type, v.is_estimated, v.notes
from public.cake_recipes r
cross join lateral (values
  ('Eggs',                        4,   'piece',      'per_cake',         false, null),
  ('Flour',                       250, 'gram',       'per_cake',         false, null),
  ('Sugar',                       3,   'tablespoon', 'per_cake',         false, null),
  ('Cream',                       250, 'gram',       'per_cake',         false, null),
  ('Cake Box',                    1,   'piece',      'per_cake',         false, null),
  ('Cake Board',                  1,   'piece',      'per_cake',         false, null),
  ('Cake Improver',               1,   'batch',      'fixed_recipe_cost', true,  'Quantity not yet specified by the kitchen.'),
  ('Baking Paper',                1,   'batch',      'fixed_recipe_cost', true,  'Estimated consumption.'),
  ('Oven & Mixer Electricity',    1,   'batch',      'fixed_recipe_cost', true,  'Estimated usage.'),
  ('Labor (per hour)',            2.5, 'hour',       'per_cake',         false, '2.5 hours at the configured hourly rate.')
) as v(cost_item_name, quantity, unit, allocation_type, is_estimated, notes)
join public.cost_items c on c.name_en = v.cost_item_name
where r.cake_size_cm = 16 and r.layer_count = 5 and r.is_default
on conflict (recipe_id, cost_item_id) do nothing;

-- ============================================================
-- 10. Seed: the five approved selling prices
-- ============================================================
insert into public.cake_price_options (size_cm, layers, recipe_id, approved_selling_price, price_status, servings)
select 16, 5, r.id, 550.00, 'approved', null
from public.cake_recipes r where r.cake_size_cm = 16 and r.layer_count = 5 and r.is_default
on conflict (size_cm, layers) do nothing;

-- The remaining four have an approved SELLING price but no recipe yet
-- (recipe_id null) — their manufacturing cost is honestly unverified,
-- never guessed. The 14cm/2-layer cake is explicitly flagged per the
-- business requirement: price stays at 200, cost stays unverified,
-- and it remains fully recommendable to customers regardless — the
-- profitability warning is an admin-only concern (derived from
-- recipe_id/is_cost_confirmed, never read by the recommendation engine).
insert into public.cake_price_options (size_cm, layers, recipe_id, approved_selling_price, price_status, servings)
values
  (14, 2, null, 200.00, 'approved', null),
  (14, 5, null, 450.00, 'approved', null),
  (20, 5, null, 700.00, 'approved', null),
  (24, 5, null, 900.00, 'approved', null)
on conflict (size_cm, layers) do nothing;

-- ============================================================
-- 11. Seed: extras catalog + the approved pricing matrix.
-- Vanilla Cream has no business-supplied price (it's the included
-- base filling, never an "extra" upgrade in the customize wizard
-- either) — seeded with no price rows at all, left for an admin to
-- price only if it should ever become a paid upgrade.
-- ============================================================
insert into public.cake_extra_options (kind, name_ar, name_en, status) values
  ('filling', 'كريمة فانيليا',       'Vanilla Cream',              'active'),
  ('filling', 'شوكولاتة/نوتيلا',     'Chocolate/Nutella',          'active'),
  ('filling', 'مربى الفراولة بالقطع', 'Strawberry Jam with Pieces', 'active'),
  ('filling', 'مانجو طازج',          'Fresh Mango',                'active'),
  ('filling', 'أوريو',               'Oreo',                       'active'),
  ('filling', 'مكسرات',              'Nuts',                       'active'),
  ('filling', 'كراميل',              'Caramel',                    'active'),
  ('decoration', 'توبر بسيط',        'Simple Topper',              'active'),
  ('decoration', 'تفاصيل فوندان',    'Fondant Details',            'active'),
  ('decoration', 'تصميم مخصص',       'Custom Design',              'active')
on conflict (kind, name_en) do nothing;

-- Fixed, confirmed per-size prices for the six fillings (14/16/20/24cm).
insert into public.cake_extra_option_prices (extra_option_id, size_cm, extra_price, price_type)
select e.id, v.size_cm, v.extra_price, 'fixed'
from public.cake_extra_options e
join lateral (values
  ('Chocolate/Nutella',          14, 50.00),
  ('Chocolate/Nutella',          16, 50.00),
  ('Chocolate/Nutella',          20, 75.00),
  ('Chocolate/Nutella',          24, 100.00),
  ('Strawberry Jam with Pieces', 14, 50.00),
  ('Strawberry Jam with Pieces', 16, 50.00),
  ('Strawberry Jam with Pieces', 20, 75.00),
  ('Strawberry Jam with Pieces', 24, 100.00),
  ('Fresh Mango',                14, 75.00),
  ('Fresh Mango',                16, 75.00),
  ('Fresh Mango',                20, 100.00),
  ('Fresh Mango',                24, 125.00),
  ('Oreo',                       14, 50.00),
  ('Oreo',                       16, 50.00),
  ('Oreo',                       20, 75.00),
  ('Oreo',                       24, 100.00),
  ('Nuts',                       14, 75.00),
  ('Nuts',                       16, 75.00),
  ('Nuts',                       20, 100.00),
  ('Nuts',                       24, 125.00),
  ('Caramel',                    14, 75.00),
  ('Caramel',                    16, 75.00),
  ('Caramel',                    20, 100.00),
  ('Caramel',                    24, 125.00)
) as v(name_en, size_cm, extra_price) on v.name_en = e.name_en
on conflict (extra_option_id, size_cm) do nothing;

-- Fondant and Custom Design: confirmed STARTING prices per size.
insert into public.cake_extra_option_prices (extra_option_id, size_cm, extra_price, price_type)
select e.id, v.size_cm, v.extra_price, 'starting'
from public.cake_extra_options e
join lateral (values
  ('Fondant Details', 14, 50.00),
  ('Fondant Details', 16, 50.00),
  ('Fondant Details', 20, 75.00),
  ('Fondant Details', 24, 100.00),
  ('Custom Design',   14, 100.00),
  ('Custom Design',   16, 100.00),
  ('Custom Design',   20, 150.00),
  ('Custom Design',   24, 200.00)
) as v(name_en, size_cm, extra_price) on v.name_en = e.name_en
on conflict (extra_option_id, size_cm) do nothing;

-- Simple Topper: only a single size-independent starting price was
-- given ("starting from EGP 50") — no per-size breakdown exists, so
-- none is invented. Stored as one generic (size_cm = null) row.
insert into public.cake_extra_option_prices (extra_option_id, size_cm, extra_price, price_type)
select e.id, null, 50.00, 'starting'
from public.cake_extra_options e
where e.name_en = 'Simple Topper'
on conflict (extra_option_id) where size_cm is null do nothing;
