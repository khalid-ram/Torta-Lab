// Canonical Occasion categories for a Baked Cake. Mirrors the
// ceremony/occasion vocabulary already established by the customize
// flow's CEREMONIES list (app/customize/customize-options.ts) — Baby
// Shower is added since the Baked Cakes spec explicitly calls it out
// as a category, and "No Occasion" is intentionally omitted: a Baked
// Cake with nothing selected just stores null (see "optional" below),
// it does not need its own enum value.
export const OCCASION_VALUES = ['birthday', 'wedding', 'engagement', 'anniversary', 'baby_shower', 'other'] as const;

export type Occasion = (typeof OCCASION_VALUES)[number];
