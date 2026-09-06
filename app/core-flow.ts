// The one description of the customer /customize flow's Core Steps and
// the inputs each one holds. Both the Admin Customization page (to
// render step/page cards) and the customer /customize page (its own
// CORE_STEP_ORDER + labels) describe the same 5 fixed pages — this file
// is the single place that inventory lives, so neither app has to keep a
// second copy in sync by hand.
//
// Core Steps/Inputs are intentionally NOT stored in the database (see
// supabase/migrations/0006): they carry specialized UI/business logic
// (tier count drives how many color pickers render, shape/color options
// are wired into the animated cake's visual mapping, etc.) that only
// exists in code. Only Custom Questions — which attach to these stable
// keys — are database rows.
//
// This is the simplified 5-step flow (ceremony, cakeStructure, filling,
// designDetails, review) that replaced the original 7-step flow
// (occasion, tiers, flavors, sizeFilling, colorsMessage, photo, notes).
// See supabase/migrations/0007 for the corresponding CHECK-constraint
// update Custom Question placement relies on.

export type CoreStepKey = "ceremony" | "cakeStructure" | "filling" | "designDetails";
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
    key: "ceremony",
    titleEn: "Ceremony",
    titleAr: "المناسبة",
    order: 0,
    inputs: [{ key: "ceremony", labelEn: "Ceremony", labelAr: "المناسبة", required: true, type: "selection", specializedOptions: true }],
  },
  {
    key: "cakeStructure",
    titleEn: "Cake Structure",
    titleAr: "هيكل التورتة",
    order: 1,
    inputs: [
      { key: "shape", labelEn: "Cake Shape", labelAr: "شكل التورتة", required: true, type: "selection", specializedOptions: true },
      { key: "tierCount", labelEn: "Number of Tiers", labelAr: "عدد الأدوار", required: true, type: "selection", specializedOptions: true },
      { key: "size", labelEn: "Size", labelAr: "الحجم", required: true, type: "selection", specializedOptions: false },
    ],
  },
  {
    key: "filling",
    titleEn: "Filling",
    titleAr: "الحشو",
    order: 2,
    inputs: [{ key: "tierFillings", labelEn: "Filling per Tier", labelAr: "حشو كل دور", required: true, type: "selection", specializedOptions: true }],
  },
  {
    key: "designDetails",
    titleEn: "Design & Details",
    titleAr: "التصميم والتفاصيل",
    order: 3,
    inputs: [
      { key: "tierColors", labelEn: "Tier Colors", labelAr: "ألوان الأدوار", required: true, type: "selection", specializedOptions: true },
      { key: "cakeMessage", labelEn: "Cake Message", labelAr: "الكتابة على التورتة", required: false, type: "text", specializedOptions: false },
      { key: "referencePhoto", labelEn: "Reference Photo", labelAr: "صورة مرجعية", required: false, type: "file", specializedOptions: false },
      { key: "notes", labelEn: "Additional Notes", labelAr: "ملاحظات إضافية", required: false, type: "textarea", specializedOptions: false },
    ],
  },
  { key: "review", titleEn: "Review", titleAr: "المراجعة", order: 4, inputs: [] },
];

// The 4 keys a Custom Question may place itself on/after — mirrors
// backend CORE_STEP_KEYS exactly (see backend/src/customization/core-step-keys.ts).
export const PLACEABLE_CORE_STEP_KEYS: CoreStepKey[] = CORE_FLOW.filter((s) => s.key !== "review").map((s) => s.key as CoreStepKey);
