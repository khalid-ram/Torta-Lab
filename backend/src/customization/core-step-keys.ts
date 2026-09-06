// The 4 placeable Core Steps, mirrored from CORE_STEP_ORDER in
// app/customize/page.tsx. "review" is intentionally excluded: it is the
// final summary/submit page, never a valid placement target for a
// custom question.
export const CORE_STEP_KEYS = ['ceremony', 'cakeStructure', 'filling', 'designDetails'] as const;
export type CoreStepKey = (typeof CORE_STEP_KEYS)[number];
