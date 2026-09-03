// The 7 placeable Core Steps, mirrored from CORE_STEP_IDS in
// app/customize/page.tsx. "review" is intentionally excluded: it is the
// final summary/submit page, never a valid placement target for a
// custom question.
export const CORE_STEP_KEYS = ['occasion', 'tiers', 'flavors', 'sizeFilling', 'colorsMessage', 'photo', 'notes'] as const;
export type CoreStepKey = (typeof CORE_STEP_KEYS)[number];
