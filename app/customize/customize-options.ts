// Shared types + option lists for the customize flow, kept out of
// page.tsx because Next.js's App Router only allows a fixed set of named
// exports from a page.tsx module (default, metadata, ...) — anything
// else (types, constants) has to live in a plain module like this one so
// both page.tsx and cake-visual-model.ts can import it.

export type Lang = "en" | "ar";
export type Shape = "circle" | "triangle" | "heart" | "rectangle" | null;
// Each tier carries its OWN color and filling — both required, one
// picker per active tier (see Design & Details / Filling steps).
export type Tier = { color: string | null; colorOther?: string; filling: string | null; fillingOther?: string };
// A dynamic field's answer: a single string for text/number/single-select
// (the select case stores the chosen option id), or a string[] of option
// ids for multi-select. Resolved to display labels only when needed
// (Review step, WhatsApp message) via the live config already in state.
export type DynamicAnswer = string | string[];
export type OrderState = {
  step: number; maxStepReached: number;
  ceremony: string | null;
  shape: Shape;
  tierCount: 1 | 2 | 3; tiers: Tier[];
  size: string | null;
  message: string; notes: string;
  refPhotoDataUrl: string | null;
  dynamicAnswers: Record<string, DynamicAnswer>;
};

export const STORAGE_KEY = "torta-lab-order-state";

export const defaultState: OrderState = {
  step: 0, maxStepReached: 0, ceremony: null, shape: null, tierCount: 1,
  tiers: [{ color: null, filling: null }],
  size: null,
  message: "", notes: "", refPhotoDataUrl: null, dynamicAnswers: {},
};

// Positionally aligned between "en" and "ar" — index i means the same
// underlying option regardless of which language it was selected in.
// cake-visual-model.ts relies on this alignment to map a selected
// (language-display) value back to its canonical index.
export const CEREMONIES = {
  en: ["Birthday", "Wedding", "Engagement", "Anniversary", "Other", "No Occasion"],
  ar: ["عيد ميلاد", "فرح", "خطوبة", "ذكرى زواج", "مناسبة أخرى", "بدون مناسبة"],
};
export const SHAPES: { key: Exclude<Shape, null>; en: string; ar: string }[] = [
  { key: "circle", en: "Circle", ar: "دائري" },
  { key: "triangle", en: "Triangle", ar: "مثلث" },
  { key: "heart", en: "Heart", ar: "قلب" },
  { key: "rectangle", en: "Rectangle", ar: "مستطيل" },
];
export const SIZES = { en: ["Small", "Medium", "Large"], ar: ["صغير", "متوسط", "كبير"] };
export const SIZE_VALUES = SIZES;
const FILLINGS_EN = ["Vanilla Cream", "Chocolate", "Strawberry", "Caramel", "Other"];
const FILLINGS_AR = ["كريمة فانيليا", "شوكولاتة", "فراولة", "كراميل", "أخرى"];
export const FILLING_VALUES = { en: FILLINGS_EN, ar: FILLINGS_AR };
const COLORS_EN = ["White", "Chocolate", "Pink", "Blue", "Beige", "Other"];
const COLORS_AR = ["أبيض", "شوكولاتة", "وردي", "أزرق", "بيج", "لون آخر"];
export const COLOR_VALUES = { en: COLORS_EN, ar: COLORS_AR };
