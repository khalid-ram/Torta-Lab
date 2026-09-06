-- Core flow simplification: the customer /customize flow moves from 7
-- Core Steps down to 4 (ceremony, cakeStructure, filling, designDetails)
-- plus the final review page. Core Steps stay entirely code-defined (see
-- CORE_STEP_ORDER in app/customize/page.tsx and CORE_STEP_KEYS in
-- backend/src/customization/core-step-keys.ts) — this migration only
-- updates the two CHECK constraints that whitelist which keys a Custom
-- Question may reference.
--
-- Confirmed zero rows in public.customization_fields reference the old
-- keys at the time this migration is written (table is empty), so this
-- is a pure constraint swap with no data to remap.

alter table public.customization_fields
  drop constraint customization_fields_core_step_key_check,
  drop constraint customization_fields_after_core_step_key_check;

alter table public.customization_fields
  add constraint customization_fields_core_step_key_check
    check (core_step_key in ('ceremony', 'cakeStructure', 'filling', 'designDetails')),
  add constraint customization_fields_after_core_step_key_check
    check (after_core_step_key in ('ceremony', 'cakeStructure', 'filling', 'designDetails'));
