// Shared Occasion vocabulary for Baked Cakes — one source of truth used
// by the Admin form's dropdown, the public card badge, and the video
// gallery badge. Mirrors backend/src/baked-cakes/occasions.ts (the two
// can't literally share code across the frontend/backend boundary, but
// the key set and meaning must stay identical) and the categories
// already established by the customize flow's CEREMONIES list
// (app/customize/customize-options.ts), with Baby Shower added per the
// Baked Cakes spec.
export type Occasion = "birthday" | "wedding" | "engagement" | "anniversary" | "baby_shower" | "other";

export const OCCASION_VALUES: Occasion[] = ["birthday", "wedding", "engagement", "anniversary", "baby_shower", "other"];

export const OCCASION_LABELS: Record<Occasion, { en: string; ar: string }> = {
  birthday: { en: "Birthday", ar: "عيد ميلاد" },
  wedding: { en: "Wedding", ar: "فرح" },
  engagement: { en: "Engagement", ar: "خطوبة" },
  anniversary: { en: "Anniversary", ar: "ذكرى زواج" },
  baby_shower: { en: "Baby Shower", ar: "استقبال مولود" },
  other: { en: "Other", ar: "مناسبة أخرى" },
};

export function occasionLabel(occasion: Occasion | null | undefined, lang: "en" | "ar"): string | null {
  if (!occasion) return null;
  return OCCASION_LABELS[occasion]?.[lang] ?? null;
}
