// The one description of the customer /customize flow's Core Steps and
// the inputs each one holds. Both the Admin Customization page (to
// render step/page cards) and the customer /customize page (its own
// CORE_STEP_ORDER + labels) describe the same 7 fixed pages — this file
// is the single place that inventory lives, so neither app has to keep a
// second copy in sync by hand.
//
// Core Steps/Inputs are intentionally NOT stored in the database (see
// supabase/migrations/0006): they carry specialized UI/business logic
// (tier count drives how many flavor pickers render, flavor/color
// options are wired into the animated cake's visual mapping, etc.) that
// only exists in code. Only Custom Questions — which attach to these
// stable keys — are database rows.

export type CoreStepKey = "occasion" | "tiers" | "flavors" | "sizeFilling" | "colorsMessage" | "photo" | "notes";
export type CoreStepId = CoreStepKey | "review";

export type CoreInputType = "selection" | "multi-select" | "text" | "textarea" | "file";

export interface CoreInputDefinition {
  key: string;
  labelEn: string;
  labelAr: string;
  required: boolean;
  type: CoreInputType;
  // Whether this input's OPTIONS (not its label/description) are wired
  // into specialized logic elsewhere (the cake visual model, WhatsApp
  // message building, tier-count-driven UI) and must never be exposed
  // as editable, even though the input itself is optional.
  specializedOptions: boolean;
}

export interface CoreStepDefinition {
  key: CoreStepId;
  titleEn: string;
  titleAr: string;
  order: number;
  inputs: CoreInputDefinition[];
}

export const CORE_FLOW: CoreStepDefinition[] = [
  {
    key: "occasion",
    titleEn: "Occasion",
    titleAr: "المناسبة",
    order: 0,
    inputs: [{ key: "occasion", labelEn: "Occasion", labelAr: "المناسبة", required: true, type: "selection", specializedOptions: true }],
  },
  {
    key: "tiers",
    titleEn: "Tiers",
    titleAr: "الأدوار",
    order: 1,
    inputs: [{ key: "tierCount", labelEn: "Number of Tiers", labelAr: "عدد الأدوار", required: false, type: "selection", specializedOptions: true }],
  },
  {
    key: "flavors",
    titleEn: "Flavors",
    titleAr: "النكهات",
    order: 2,
    inputs: [{ key: "tierFlavor", labelEn: "Flavor per Tier", labelAr: "نكهة كل دور", required: true, type: "selection", specializedOptions: true }],
  },
  {
    key: "sizeFilling",
    titleEn: "Size & Filling",
    titleAr: "الحجم والحشو",
    order: 3,
    inputs: [
      { key: "size", labelEn: "Size", labelAr: "الحجم", required: true, type: "selection", specializedOptions: false },
      { key: "filling", labelEn: "Filling", labelAr: "الحشو", required: true, type: "selection", specializedOptions: true },
    ],
  },
  {
    key: "colorsMessage",
    titleEn: "Colors & Message",
    titleAr: "الألوان والكتابة",
    order: 4,
    inputs: [
      { key: "colors", labelEn: "Colors", labelAr: "الألوان", required: false, type: "multi-select", specializedOptions: true },
      { key: "cakeMessage", labelEn: "Cake Message", labelAr: "الكتابة على التورتة", required: false, type: "text", specializedOptions: false },
    ],
  },
  {
    key: "photo",
    titleEn: "Photo",
    titleAr: "الصورة",
    order: 5,
    inputs: [{ key: "referencePhoto", labelEn: "Reference Photo", labelAr: "صورة مرجعية", required: false, type: "file", specializedOptions: false }],
  },
  {
    key: "notes",
    titleEn: "Notes",
    titleAr: "ملاحظات",
    order: 6,
    inputs: [{ key: "notes", labelEn: "Additional Notes", labelAr: "ملاحظات إضافية", required: false, type: "textarea", specializedOptions: false }],
  },
  { key: "review", titleEn: "Review", titleAr: "المراجعة", order: 7, inputs: [] },
];

// The 7 keys a Custom Question may place itself on/after — mirrors
// backend CORE_STEP_KEYS exactly (see backend/src/customization/core-step-keys.ts).
export const PLACEABLE_CORE_STEP_KEYS: CoreStepKey[] = CORE_FLOW.filter((s) => s.key !== "review").map((s) => s.key as CoreStepKey);
