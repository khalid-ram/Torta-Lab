-- Adds Occasion labeling and pricing fields to Baked Cakes, without
-- touching the already-applied Phase 7 migration (0004). All four
-- columns are nullable with no default, so every existing row stays
-- valid with them unset. The application layer treats null and 0 as
-- meaningfully different for the three money fields — null means "not
-- entered", 0 means a deliberate value (e.g. a cake given away for
-- free) — see backend/src/baked-cakes/baked-cakes.service.ts.

alter table public.baked_cakes
  add column occasion text,
  add column cost numeric(10, 2),
  add column recommended_selling_price numeric(10, 2),
  add column actual_selling_price numeric(10, 2);

alter table public.baked_cakes
  add constraint baked_cakes_occasion_check
    check (occasion is null or occasion in ('birthday', 'wedding', 'engagement', 'anniversary', 'baby_shower', 'other')),
  add constraint baked_cakes_cost_check
    check (cost is null or cost >= 0),
  add constraint baked_cakes_recommended_price_check
    check (recommended_selling_price is null or recommended_selling_price >= 0),
  add constraint baked_cakes_actual_price_check
    check (actual_selling_price is null or actual_selling_price >= 0);
