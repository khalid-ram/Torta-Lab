// The single mapping layer between customization answers and what the
// cake visual renders. Keeping this here (rather than scattering
// `if (flavor === ...)` checks across CakeProgress's JSX) means the
// visual component only ever reads a finished, typed model — it never
// has to know that "flavor" is stored as one of two languages' display
// strings, or that "Other" needs special-casing.

import { COLOR_VALUES, FILLING_VALUES, OCCASIONS, SIZE_VALUES, type Lang, type OrderState } from "./customize-options";

export type OccasionDecoration = "birthday" | "wedding" | "engagement" | "anniversary" | "other";
export type TierVisualFlavor = "chocolate" | "cream" | "half" | "other" | "undecided";

export interface TierVisual {
  flavor: TierVisualFlavor;
}

export interface CakeVisualModel {
  progress: number; // 0..1, required-answers completion — the one source of truth for animation stage
  completed: boolean;
  tierCount: 1 | 2 | 3;
  tiers: TierVisual[];
  sizeScale: number; // subtle proportion multiplier, ~0.85–1.15
  accentColors: string[]; // resolved hex values for chosen colors (unresolvable "Other" entries are skipped)
  fillingColor: string | null; // resolved hex for the filling stripe, or null if no filling chosen yet
  occasionDecoration: OccasionDecoration;
  occasionSelected: boolean; // true only once the customer has actually chosen one of the 6 real options — distinct from the "other" fallback bucket, which also covers "not chosen yet"
}

// OCCASIONS/SIZE_VALUES/etc. are stored per-language display arrays that
// stay positionally aligned between "en" and "ar" (see page.tsx), so a
// selection made in one language is still recognized after switching —
// the model never needs to know which language was active when the
// customer answered.
function indexOfEitherLang(value: string | null, lists: { en: string[]; ar: string[] }): number {
  if (!value) return -1;
  const enIndex = lists.en.indexOf(value);
  if (enIndex !== -1) return enIndex;
  return lists.ar.indexOf(value);
}

// index: 0 Birthday, 1 Wedding, 2 Engagement, 3 Anniversary, 4 Other, 5 No Occasion.
// Other and No Occasion both fall back to the neutral "other" decoration.
const OCCASION_DECORATION_BY_INDEX: OccasionDecoration[] = ["birthday", "wedding", "engagement", "anniversary", "other", "other"];

const SIZE_SCALE_BY_INDEX = [0.86, 1, 1.14]; // Small, Medium, Large

const COLOR_HEX_BY_INDEX = ["#FFF8F0", "#6B4226", "#D96C7C", "#9DB8D9", "#E9D9BE", null]; // White, Chocolate, Pink, Blue, Beige, Other (unresolvable)

const FILLING_HEX_BY_INDEX = ["#FFF3DD", "#6B4226", "#E8879A", "#C68642", null]; // Vanilla Cream, Chocolate, Strawberry, Caramel, Other (unresolvable)

function tierVisualFlavor(flavor: OrderState["tiers"][number]["flavor"]): TierVisualFlavor {
  if (!flavor) return "undecided";
  return flavor;
}

// Dynamic admin-created fields intentionally do not influence the cake
// visual (there is no reliable way to give arbitrary text/number answers
// visual meaning) — they only ever affect `requiredChecks`, which is
// already folded into `progress` by the caller.
export function buildCakeVisualModel(state: OrderState, requiredChecks: boolean[]): CakeVisualModel {
  const progress = requiredChecks.length ? requiredChecks.filter(Boolean).length / requiredChecks.length : 0;

  const occasionIndex = indexOfEitherLang(state.occasion, OCCASIONS);
  const occasionSelected = occasionIndex !== -1;
  const occasionDecoration = OCCASION_DECORATION_BY_INDEX[occasionIndex] ?? "other";

  const sizeIndex = indexOfEitherLang(state.size, SIZE_VALUES);
  const sizeScale = SIZE_SCALE_BY_INDEX[sizeIndex] ?? 1;

  const accentColors = state.colors
    .map((c) => COLOR_HEX_BY_INDEX[indexOfEitherLang(c, COLOR_VALUES)])
    .filter((hex): hex is string => !!hex);

  const fillingIndex = indexOfEitherLang(state.filling, FILLING_VALUES);
  const fillingColor = FILLING_HEX_BY_INDEX[fillingIndex] ?? null;

  return {
    progress,
    completed: progress >= 1,
    tierCount: state.tierCount,
    tiers: state.tiers.slice(0, state.tierCount).map((t) => ({ flavor: tierVisualFlavor(t.flavor) })),
    sizeScale,
    accentColors,
    fillingColor,
    occasionDecoration,
    occasionSelected,
  };
}

export type { Lang };
