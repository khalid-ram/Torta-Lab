-- Phase 8 placement rework: Custom Questions now attach directly to a
-- Core Step's stable key instead of grouping into admin-created "step"
-- rows. Core Steps stay entirely code-defined (see CORE_STEP_IDS in
-- app/customize/page.tsx) — this migration only adds the reference
-- columns a custom field needs to place itself relative to them:
--
--   placement_type = 'core_step'     -> renders inline on that existing
--                                        core step (core_step_key set)
--   placement_type = 'separate_step' -> becomes its own customer-facing
--                                        step, positioned immediately
--                                        after that core step
--                                        (after_core_step_key set)
--
-- The customization_steps table from migration 0005 is no longer
-- needed: every "Separate Step" custom question is now its own
-- dedicated step anchored to a core key, and "Same Step" custom
-- questions render inline on an existing core step — neither case
-- groups multiple custom questions under a shared admin-created step
-- row anymore. Both tables are confirmed empty in the live database
-- before this migration runs.

alter table public.customization_fields
  drop constraint customization_fields_step_id_fkey,
  drop column step_id;

drop trigger if exists set_customization_steps_updated_at on public.customization_steps;
drop table public.customization_steps;

alter table public.customization_fields
  add column placement_type text,
  add column core_step_key text,
  add column after_core_step_key text;

update public.customization_fields set placement_type = 'separate_step' where placement_type is null;

alter table public.customization_fields
  alter column placement_type set not null,
  add constraint customization_fields_placement_type_check
    check (placement_type in ('core_step', 'separate_step')),
  -- 'review' is deliberately excluded from both lists: it is the final
  -- summary/submit page, not an input-collection page, and a dynamic
  -- step is never allowed to land after it.
  add constraint customization_fields_core_step_key_check
    check (core_step_key in ('occasion', 'tiers', 'flavors', 'sizeFilling', 'colorsMessage', 'photo', 'notes')),
  add constraint customization_fields_after_core_step_key_check
    check (after_core_step_key in ('occasion', 'tiers', 'flavors', 'sizeFilling', 'colorsMessage', 'photo', 'notes')),
  add constraint customization_fields_placement_consistency_check
    check (
      (placement_type = 'core_step' and core_step_key is not null and after_core_step_key is null)
      or
      (placement_type = 'separate_step' and after_core_step_key is not null and core_step_key is null)
    );

create index customization_fields_placement_idx
  on public.customization_fields (placement_type, core_step_key, after_core_step_key, order_index);
