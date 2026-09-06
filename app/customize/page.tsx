"use client";
import { useEffect, useMemo, useState } from "react";
import { buildWhatsAppUrl, WhatsAppIcon } from "@/lib/whatsapp";
import { getPublicCustomization, type CoreStepKey, type PublicCustomizationField } from "@/lib/api/customization";
import { PublicNavbar } from "../navbar";
import { CakeProgress } from "./cake-progress";
import { buildCakeVisualModel } from "./cake-visual-model";
import {
  type Lang, type Flavor, type OrderState, type DynamicAnswer,
  STORAGE_KEY, defaultState, CEREMONIES, SHAPES, FLAVORS, SIZES, FILLING_VALUES, COLOR_VALUES,
} from "./customize-options";

// The 4 placeable Core Steps, in their fixed order, plus the final
// Review page. These stable ids are the integration points a Custom
// Question attaches to (Same Step -> renders inline on one of the 4;
// Separate Step -> becomes its own step positioned right after one of
// the 4) — mirrored exactly on the backend as CORE_STEP_KEYS.
type CoreStepId = CoreStepKey | "review";
const CORE_STEP_ORDER: CoreStepKey[] = ["ceremony", "cakeStructure", "filling", "designDetails"];

type StepDescriptor = { kind: "core"; id: CoreStepId } | { kind: "separate"; field: PublicCustomizationField };

const CORE_STEP_LABELS: Record<Lang, Record<CoreStepId, string>> = {
  en: { ceremony: "Ceremony", cakeStructure: "Cake Structure", filling: "Filling", designDetails: "Design & Details", review: "Review" },
  ar: { ceremony: "المناسبة", cakeStructure: "هيكل التورتة", filling: "الحشو", designDetails: "التصميم والتفاصيل", review: "المراجعة" },
};

function isDynamicFieldAnswered(field: PublicCustomizationField, answer: DynamicAnswer | undefined): boolean {
  if (field.type === "text") return typeof answer === "string" && answer.trim().length > 0;
  if (field.type === "number") return typeof answer === "string" && answer.trim().length > 0 && !Number.isNaN(Number(answer));
  // A selection answer only counts if the option id still belongs to the
  // field's current (live-fetched) options — an id an admin has since
  // removed (e.g. a stale localStorage answer from a prior visit) must
  // not silently satisfy a required field.
  const validIds = new Set((field.options ?? []).map((o) => o.id));
  if (field.selectionMode === "multi") return Array.isArray(answer) && answer.some((id) => validIds.has(id));
  return typeof answer === "string" && validIds.has(answer);
}

function resolveDynamicAnswerText(field: PublicCustomizationField, answer: DynamicAnswer | undefined): string | null {
  if (!isDynamicFieldAnswered(field, answer)) return null;
  if (field.type !== "selection") return (answer as string).trim();
  const ids = Array.isArray(answer) ? answer : [answer as string];
  const labels = ids.map((id) => field.options?.find((o) => o.id === id)?.label).filter((l): l is string => !!l);
  return labels.length ? labels.join(", ") : null;
}

function isColorAnswered(color: string | null, colorOther: string | undefined): boolean {
  if (!color) return false;
  if (color === "Other" || color === "لون آخر") return !!colorOther?.trim();
  return true;
}

const TIER_LABELS: Record<Lang, string[]> = {
  en: ["Tier 1", "Tier 2", "Tier 3"],
  ar: ["الدور الأول", "الدور الثاني", "الدور الثالث"],
};

export default function CustomizePage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [state, setState] = useState<OrderState>(defaultState);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [fields, setFields] = useState<PublicCustomizationField[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const dir = lang === "ar" ? "rtl" : "ltr";

  // Every public "Customize" CTA that means "start a new cake" links here
  // with ?new=1 (see app/page.tsx and app/navbar.tsx) — this page is the
  // one place session init/reset happens, so no CTA component ever touches
  // localStorage itself. A ?new=1 load wipes the previous OrderState and
  // starts fully blank; anything else (plain "/customize", including a
  // refresh mid-flow) restores the active session from localStorage
  // untouched. The query param is stripped right after so a later refresh
  // on the same tab doesn't re-trigger a reset.
  useEffect(() => {
    const isNewSession = new URLSearchParams(window.location.search).get("new") === "1";
    if (isNewSession) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
      setState(defaultState);
      window.history.replaceState(null, "", "/customize");
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try { setState({ ...defaultState, ...JSON.parse(saved), refPhotoDataUrl: null }); } catch {}
      }
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const { refPhotoDataUrl, ...rest } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  }, [state, hydrated]);

  useEffect(() => {
    let cancelled = false;
    getPublicCustomization()
      .then((config) => { if (!cancelled) setFields(config.fields); })
      .catch(() => {
        // The core flow keeps working with zero admin-created fields.
      });
    return () => { cancelled = true; };
  }, []);

  // Same Step: fields grouped by the existing Core Step they render on.
  const sameStepFieldsByCore = useMemo(() => {
    const map: Partial<Record<CoreStepKey, PublicCustomizationField[]>> = {};
    for (const f of fields) {
      if (f.placementType === "core_step" && f.coreStepKey) (map[f.coreStepKey] ??= []).push(f);
    }
    for (const key of Object.keys(map) as CoreStepKey[]) map[key]!.sort((a, b) => a.order - b.order);
    return map;
  }, [fields]);

  // Separate Step: fields grouped by the Core Step they're anchored after.
  const separateStepsByCore = useMemo(() => {
    const map: Partial<Record<CoreStepKey, PublicCustomizationField[]>> = {};
    for (const f of fields) {
      if (f.placementType === "separate_step" && f.afterCoreStepKey) (map[f.afterCoreStepKey] ??= []).push(f);
    }
    for (const key of Object.keys(map) as CoreStepKey[]) map[key]!.sort((a, b) => a.order - b.order);
    return map;
  }, [fields]);

  // One unified runtime sequence: each Core Step, immediately followed by
  // any Separate Step custom questions anchored after it. Same Step
  // custom questions never appear here — they render inline on their
  // target Core Step instead.
  const stepList: StepDescriptor[] = useMemo(() => {
    const result: StepDescriptor[] = [];
    for (const key of CORE_STEP_ORDER) {
      result.push({ kind: "core", id: key });
      for (const f of separateStepsByCore[key] ?? []) result.push({ kind: "separate", field: f });
    }
    result.push({ kind: "core", id: "review" });
    return result;
  }, [separateStepsByCore]);

  const lastStepIndex = stepList.length - 1;
  const currentDescriptor = stepList[state.step] ?? stepList[0];

  const coreStepIndex = (id: CoreStepId) => stepList.findIndex((d) => d.kind === "core" && d.id === id);
  const fieldStepIndex = (field: PublicCustomizationField) =>
    field.placementType === "core_step"
      ? coreStepIndex(field.coreStepKey as CoreStepId)
      : stepList.findIndex((d) => d.kind === "separate" && d.field.id === field.id);

  const set = (patch: Partial<OrderState>) => setState((s) => ({ ...s, ...patch }));

  const setTierCount = (n: 1 | 2 | 3) => {
    const tiers = Array.from({ length: n }, (_, i) => state.tiers[i] || { color: null, flavor: null });
    set({ tierCount: n, tiers });
  };
  const setTierColor = (i: number, color: string) => {
    const tiers = state.tiers.map((t, idx) => (idx === i ? { ...t, color } : t));
    set({ tiers });
  };
  const setTierColorOther = (i: number, val: string) => {
    const tiers = state.tiers.map((t, idx) => (idx === i ? { ...t, colorOther: val } : t));
    set({ tiers });
  };
  const setTierFlavor = (i: number, flavor: Flavor) => {
    const tiers = state.tiers.map((t, idx) => (idx === i ? { ...t, flavor } : t));
    set({ tiers });
  };
  const setTierOther = (i: number, val: string) => {
    const tiers = state.tiers.map((t, idx) => (idx === i ? { ...t, otherFlavor: val } : t));
    set({ tiers });
  };

  const setDynamicText = (fieldId: string, value: string) => {
    set({ dynamicAnswers: { ...state.dynamicAnswers, [fieldId]: value } });
  };
  const setDynamicNumber = (fieldId: string, raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    setDynamicText(fieldId, cleaned);
  };
  const setDynamicSingleSelect = (fieldId: string, optionId: string) => {
    set({ dynamicAnswers: { ...state.dynamicAnswers, [fieldId]: optionId } });
  };
  const toggleDynamicMultiSelect = (fieldId: string, optionId: string) => {
    const current = state.dynamicAnswers[fieldId];
    const selected = Array.isArray(current) ? current : [];
    const next = selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId];
    set({ dynamicAnswers: { ...state.dynamicAnswers, [fieldId]: next } });
  };

  const fillingOk = !!state.filling && (state.filling !== "Other" && state.filling !== "أخرى" || !!state.fillingOther.trim());
  const allTierColorsOk = state.tiers.slice(0, state.tierCount).every((t) => isColorAnswered(t.color, t.colorOther));

  const requiredSameStepAnswered = (id: CoreStepId) =>
    (sameStepFieldsByCore[id as CoreStepKey] ?? [])
      .filter((f) => f.required)
      .every((f) => isDynamicFieldAnswered(f, state.dynamicAnswers[f.id]));

  const canContinue = useMemo(() => {
    if (currentDescriptor.kind === "separate") {
      const f = currentDescriptor.field;
      return !f.required || isDynamicFieldAnswered(f, state.dynamicAnswers[f.id]);
    }
    if (!requiredSameStepAnswered(currentDescriptor.id)) return false;
    if (currentDescriptor.id === "ceremony") return !!state.ceremony;
    if (currentDescriptor.id === "cakeStructure") return !!state.shape && !!state.size;
    if (currentDescriptor.id === "filling") return fillingOk;
    if (currentDescriptor.id === "designDetails") return allTierColorsOk;
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, currentDescriptor, sameStepFieldsByCore, fillingOk, allTierColorsOk]);

  const goNext = () => { if (!canContinue) return; const s = Math.min(state.step + 1, lastStepIndex); set({ step: s, maxStepReached: Math.max(state.maxStepReached, s) }); };
  const goBack = () => set({ step: Math.max(state.step - 1, 0) });
  const goToStep = (i: number) => { if (i >= 0 && i <= state.maxStepReached) set({ step: i }); };

  // completed required Core fields + completed active required Custom
  // fields, over total applicable required fields. The denominator moves
  // with tier count: only tiers 1..tierCount contribute a required color
  // check. Optional fields (tier flavor, cake message, photo, notes,
  // optional Custom Questions) never appear here.
  const requiredChecks = useMemo(() => {
    // Number of Tiers is intentionally not a separate check here: it
    // always holds a valid default (1/2/3), so it can never be "wrong"
    // the way ceremony/shape/size/filling can — counting it as a fixed
    // always-true entry would only dilute a fresh session's percentage
    // away from a genuine 0%, which is exactly the bug this must avoid.
    const checks: boolean[] = [
      !!state.ceremony,
      !!state.shape,
      !!state.size,
      fillingOk,
    ];
    for (let i = 0; i < state.tierCount; i++) {
      const tier = state.tiers[i];
      checks.push(isColorAnswered(tier?.color ?? null, tier?.colorOther));
    }
    for (const field of fields) {
      if (field.required) checks.push(isDynamicFieldAnswered(field, state.dynamicAnswers[field.id]));
    }
    return checks;
  }, [state, fields, fillingOk]);
  const cakeVisual = useMemo(() => buildCakeVisualModel(state, requiredChecks), [state, requiredChecks]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => set({ refPhotoDataUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const tierColorLabel = (tier: OrderState["tiers"][number]): string | null => {
    if (!tier.color) return null;
    return tier.color === "Other" || tier.color === "لون آخر" ? tier.colorOther || null : tier.color;
  };
  const tierFlavorLabel = (tier: OrderState["tiers"][number], L: Lang): string | null => {
    if (!tier.flavor) return null;
    return tier.flavor === "other" ? tier.otherFlavor || null : FLAVORS.find((f) => f.key === tier.flavor)?.[L] ?? null;
  };

  const buildMessage = () => {
    const L = lang;
    const lines: string[] = [];
    lines.push(L === "ar" ? "مرحبًا 👋\nأريد طلب تورتة مخصصة بالتفاصيل التالية:\n" : "Hello 👋\nI would like to order a customized cake.\n");
    if (state.ceremony) lines.push(`🎉 ${L === "ar" ? "المناسبة" : "Ceremony"}: ${state.ceremony}`);
    if (state.shape) lines.push(`🍰 ${L === "ar" ? "شكل التورتة" : "Cake Shape"}: ${SHAPES.find((s) => s.key === state.shape)?.[L]}`);
    lines.push(`🎂 ${L === "ar" ? "عدد الأدوار" : "Number of Tiers"}: ${state.tierCount}`);
    if (state.size) lines.push(`📏 ${L === "ar" ? "الحجم" : "Size"}: ${state.size}`);
    if (state.filling) lines.push(`🍓 ${L === "ar" ? "الحشو" : "Filling"}: ${state.filling === (L === "ar" ? "أخرى" : "Other") ? state.fillingOther : state.filling}`);
    state.tiers.slice(0, state.tierCount).forEach((t, i) => {
      const color = tierColorLabel(t);
      if (color) lines.push(`🎨 ${TIER_LABELS[L][i]} ${L === "ar" ? "لون" : "Color"}: ${color}`);
    });
    const flavorLines = state.tiers
      .slice(0, state.tierCount)
      .map((t, i) => (tierFlavorLabel(t, L) ? `${TIER_LABELS[L][i]}: ${tierFlavorLabel(t, L)}` : null))
      .filter((l): l is string => !!l);
    if (flavorLines.length) lines.push(`🍫 ${L === "ar" ? "نكهة كل دور" : "Flavor per Tier"}:\n${flavorLines.join("\n")}`);
    if (state.message.trim()) lines.push(`✍️ ${L === "ar" ? "الكتابة على التورتة" : "Cake Message"}: ${state.message.trim()}`);
    if (state.notes.trim()) lines.push(`📝 ${L === "ar" ? "ملاحظات إضافية" : "Additional Notes"}:\n${state.notes.trim()}`);
    for (const field of fields) {
      const text = resolveDynamicAnswerText(field, state.dynamicAnswers[field.id]);
      if (text) lines.push(`🎯 ${field.label}: ${text}`);
    }
    if (state.refPhotoDataUrl) {
      lines.push(L === "ar" ? "📷 عندي صورة مرجعية للديكور وهبعتها هنا على واتساب." : "📷 I have a reference photo for the decoration and will attach it in WhatsApp.");
    }
    lines.push(L === "ar" ? "\nمن فضلك أخبرني بالسعر والتوفر." : "\nPlease let me know the price and availability.");
    return lines.join("\n");
  };

  const handleSend = () => {
    if (!state.shape || !state.size || !fillingOk || !allTierColorsOk) {
      setError(lang === "ar" ? "من فضلك أكمل كل البيانات الأساسية الإلزامية." : "Please complete all required cake details.");
      return;
    }
    const missingRequired = fields.some((f) => f.required && !isDynamicFieldAnswered(f, state.dynamicAnswers[f.id]));
    if (missingRequired) {
      setError(lang === "ar" ? "في أسئلة إلزامية لسه محتاجة إجابة." : "Some required questions still need an answer.");
      return;
    }
    setError("");
    window.open(buildWhatsAppUrl(buildMessage()), "_blank");
    setSent(true);
  };

  return (
    <div dir={dir} lang={lang} className="bg-[#FFF9F3] text-[#33221C] min-h-screen font-sans">
      <PublicNavbar lang={lang} onLangChange={setLang} />

      {/* The cake itself is the ONLY progress indicator, on both mobile
          and desktop — no numbered step strip. Mobile shows it compact at
          the top; desktop keeps it in a sticky side column. */}
      <div className="md:hidden max-w-xl mx-auto px-6 pt-4">
        <CakeProgress model={cakeVisual} lang={lang} compact />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 md:flex md:items-start md:gap-10">
        <div className="hidden md:block md:w-56 shrink-0">
          <CakeProgress model={cakeVisual} lang={lang} />
        </div>

        <div className="flex-1 max-w-xl mx-auto md:mx-0">
        <div className="bg-[#FFFCF8] rounded-3xl p-6 md:p-8 shadow-[0_4px_20px_rgba(99,59,44,0.08)]">
          {currentDescriptor.kind === "core" && currentDescriptor.id === "ceremony" && (
            <Step title={lang === "ar" ? "بنحتفل بإيه؟" : "What are we celebrating?"}>
              <div className="grid grid-cols-2 gap-3">
                {CEREMONIES[lang].map((o) => (
                  <Chip key={o} selected={state.ceremony === o} onClick={() => set({ ceremony: o })}>{o}</Chip>
                ))}
              </div>
              <SameStepFields fields={sameStepFieldsByCore.ceremony} lang={lang} state={state}
                setDynamicText={setDynamicText} setDynamicNumber={setDynamicNumber}
                setDynamicSingleSelect={setDynamicSingleSelect} toggleDynamicMultiSelect={toggleDynamicMultiSelect} />
            </Step>
          )}

          {currentDescriptor.kind === "core" && currentDescriptor.id === "cakeStructure" && (
            <Step title={lang === "ar" ? "هيكل التورتة" : "Cake Structure"}>
              <p className="text-sm font-semibold mb-2 text-[#633B2C]">{lang === "ar" ? "شكل التورتة" : "Cake Shape"}</p>
              <div className="grid grid-cols-4 gap-2 mb-6">
                {SHAPES.map((s) => (
                  <ShapeCard key={s.key} selected={state.shape === s.key} shape={s.key} label={s[lang]} onClick={() => set({ shape: s.key })} />
                ))}
              </div>

              <p className="text-sm font-semibold mb-2 text-[#633B2C]">{lang === "ar" ? "عدد الأدوار" : "Number of Tiers"}</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 2, 3].map((n) => (
                  <Chip key={n} selected={state.tierCount === n} onClick={() => setTierCount(n as 1 | 2 | 3)}>
                    {lang === "ar" ? ["دور واحد", "دورين", "3 أدوار"][n - 1] : `${n} Tier${n > 1 ? "s" : ""}`}
                  </Chip>
                ))}
              </div>

              <p className="text-sm font-semibold mb-2 text-[#633B2C]">{lang === "ar" ? "الحجم" : "Size"}</p>
              <div className="grid grid-cols-3 gap-2">
                {SIZES[lang].map((s) => <Chip key={s} small selected={state.size === s} onClick={() => set({ size: s })}>{s}</Chip>)}
              </div>

              <SameStepFields fields={sameStepFieldsByCore.cakeStructure} lang={lang} state={state}
                setDynamicText={setDynamicText} setDynamicNumber={setDynamicNumber}
                setDynamicSingleSelect={setDynamicSingleSelect} toggleDynamicMultiSelect={toggleDynamicMultiSelect} />
            </Step>
          )}

          {currentDescriptor.kind === "core" && currentDescriptor.id === "filling" && (
            <Step title={lang === "ar" ? "الحشو" : "Filling"}>
              <div className="grid grid-cols-2 gap-2">
                {FILLING_VALUES[lang].map((f) => <Chip key={f} small selected={state.filling === f} onClick={() => set({ filling: f })}>{f}</Chip>)}
              </div>
              {(state.filling === "Other" || state.filling === "أخرى") && (
                <input value={state.fillingOther} onChange={(e) => set({ fillingOther: e.target.value })}
                  placeholder={lang === "ar" ? "اكتب الحشو..." : "Describe the filling..."}
                  className="mt-3 w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white" />
              )}
              <SameStepFields fields={sameStepFieldsByCore.filling} lang={lang} state={state}
                setDynamicText={setDynamicText} setDynamicNumber={setDynamicNumber}
                setDynamicSingleSelect={setDynamicSingleSelect} toggleDynamicMultiSelect={toggleDynamicMultiSelect} />
            </Step>
          )}

          {currentDescriptor.kind === "core" && currentDescriptor.id === "designDetails" && (
            <Step title={lang === "ar" ? "التصميم والتفاصيل" : "Design & Details"}>
              <p className="text-sm font-semibold mb-3 text-[#633B2C]">{lang === "ar" ? "ألوان الأدوار" : "Tier Colors"}</p>
              <div className="space-y-5">
                {state.tiers.slice(0, state.tierCount).map((tier, i) => (
                  <div key={i} className={i > 0 ? "pt-4 border-t border-dashed border-[#E8D8CC]" : ""}>
                    <p className="text-sm font-medium mb-2 text-[#79665E]">
                      {lang === "ar" ? `لون ${TIER_LABELS.ar[i]}` : `${TIER_LABELS.en[i]} Color`}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {COLOR_VALUES[lang].map((c) => (
                        <Chip key={c} small selected={tier.color === c} onClick={() => setTierColor(i, c)}>{c}</Chip>
                      ))}
                    </div>
                    {(tier.color === "Other" || tier.color === "لون آخر") && (
                      <input value={tier.colorOther || ""} onChange={(e) => setTierColorOther(i, e.target.value)}
                        placeholder={lang === "ar" ? "اكتب اللون..." : "Describe the color..."}
                        className="mt-2 w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-dashed border-[#E8D8CC]">
                <p className="text-sm font-semibold mb-3 text-[#633B2C]">
                  {lang === "ar" ? "نكهة كل دور" : "Flavor per Tier"}
                  <span className="text-xs font-normal text-[#B8945F]"> ({lang === "ar" ? "اختياري" : "optional"})</span>
                </p>
                <div className="space-y-4">
                  {state.tiers.slice(0, state.tierCount).map((tier, i) => (
                    <div key={i}>
                      <p className="text-xs text-[#79665E] mb-1.5">{TIER_LABELS[lang][i]}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {FLAVORS.map((f) => (
                          <Chip key={f.key} small selected={tier.flavor === f.key} onClick={() => setTierFlavor(i, f.key)}>{f[lang]}</Chip>
                        ))}
                      </div>
                      {tier.flavor === "other" && (
                        <input value={tier.otherFlavor || ""} onChange={(e) => setTierOther(i, e.target.value)}
                          placeholder={lang === "ar" ? "اكتب النكهة..." : "Describe the flavor..."}
                          className="mt-2 w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-dashed border-[#E8D8CC]">
                <p className="text-sm font-semibold mb-2 text-[#633B2C]">
                  {lang === "ar" ? "تحب نكتب إيه على التورتة؟" : "What would you like written on the cake?"}
                  <span className="text-xs font-normal text-[#B8945F]"> ({lang === "ar" ? "اختياري" : "optional"})</span>
                </p>
                <input value={state.message} onChange={(e) => set({ message: e.target.value })}
                  placeholder={lang === "ar" ? "كل سنة وإنتِ طيبة يا سارة 🎂" : "Happy Birthday Sara 🎂"}
                  className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white" />
              </div>

              <div className="mt-6 pt-5 border-t border-dashed border-[#E8D8CC]">
                <p className="text-sm font-semibold mb-2 text-[#633B2C]">
                  {lang === "ar" ? "عندك شكل معين في بالك؟" : "Have a design in mind?"}
                  <span className="text-xs font-normal text-[#B8945F]"> ({lang === "ar" ? "اختياري" : "optional"})</span>
                </p>
                <p className="text-sm text-[#79665E] mb-3">
                  {lang === "ar" ? "ارفع صورة مرجعية للشكل أو الديكور اللي حابب التورتة تكون قريبة منه." : "Upload a reference photo and show us the decoration or style you're looking for."}
                </p>
                {!state.refPhotoDataUrl ? (
                  <label className="block border-2 border-dashed border-[#E8D8CC] rounded-2xl py-10 text-center cursor-pointer text-sm font-semibold text-[#633B2C]">
                    {lang === "ar" ? "ارفع صورة مرجعية" : "Upload Reference Photo"}
                    <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </label>
                ) : (
                  <div>
                    <img src={state.refPhotoDataUrl} alt="reference" className="w-full rounded-2xl max-h-64 object-cover" />
                    <div className="flex gap-3 mt-3">
                      <label className="text-sm font-semibold border border-[#E8D8CC] rounded-full px-4 py-2 cursor-pointer">
                        {lang === "ar" ? "استبدال" : "Replace"}
                        <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                      </label>
                      <button onClick={() => set({ refPhotoDataUrl: null })} className="text-sm font-semibold border border-[#E8D8CC] rounded-full px-4 py-2">
                        {lang === "ar" ? "إزالة" : "Remove"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-5 border-t border-dashed border-[#E8D8CC]">
                <p className="text-sm font-semibold mb-2 text-[#633B2C]">
                  {lang === "ar" ? "في تفاصيل تانية تحب تقولها لنا؟" : "Anything else we should know?"}
                  <span className="text-xs font-normal text-[#B8945F]"> ({lang === "ar" ? "اختياري" : "optional"})</span>
                </p>
                <textarea value={state.notes} onChange={(e) => set({ notes: e.target.value })} rows={4}
                  placeholder={lang === "ar" ? "قول لنا أي تفاصيل إضافية عن التورتة اللي في بالك..." : "Tell us anything else about your dream cake..."}
                  className="w-full border border-[#E8D8CC] rounded-xl px-4 py-3 text-sm bg-white resize-none" />
              </div>

              <SameStepFields fields={sameStepFieldsByCore.designDetails} lang={lang} state={state}
                setDynamicText={setDynamicText} setDynamicNumber={setDynamicNumber}
                setDynamicSingleSelect={setDynamicSingleSelect} toggleDynamicMultiSelect={toggleDynamicMultiSelect} />
            </Step>
          )}

          {currentDescriptor.kind === "separate" && (
            <Step title={`${currentDescriptor.field.label}${!currentDescriptor.field.required ? ` (${lang === "ar" ? "اختياري" : "Optional"})` : ""}`}>
              {currentDescriptor.field.description && (
                <p className="text-sm text-[#79665E] mb-4">{currentDescriptor.field.description}</p>
              )}
              <DynamicFieldInput
                field={currentDescriptor.field}
                lang={lang}
                answer={state.dynamicAnswers[currentDescriptor.field.id]}
                showLabel={false}
                onText={(v) => setDynamicText(currentDescriptor.field.id, v)}
                onNumber={(v) => setDynamicNumber(currentDescriptor.field.id, v)}
                onSingleSelect={(id) => setDynamicSingleSelect(currentDescriptor.field.id, id)}
                onToggleMulti={(id) => toggleDynamicMultiSelect(currentDescriptor.field.id, id)}
              />
            </Step>
          )}

          {currentDescriptor.kind === "core" && currentDescriptor.id === "review" && (
            <Step title={lang === "ar" ? "تورتتك" : "Your Custom Cake"}>
              <div className="space-y-4 text-sm">
                <ReviewGroup title={lang === "ar" ? "التورتة" : "Cake"}>
                  <ReviewRow label={lang === "ar" ? "المناسبة" : "Ceremony"} value={state.ceremony} onEdit={() => goToStep(coreStepIndex("ceremony"))} />
                  <ReviewRow label={lang === "ar" ? "شكل التورتة" : "Cake Shape"} value={state.shape ? SHAPES.find((s) => s.key === state.shape)?.[lang] : null} onEdit={() => goToStep(coreStepIndex("cakeStructure"))} />
                  <ReviewRow label={lang === "ar" ? "عدد الأدوار" : "Tiers"} value={String(state.tierCount)} onEdit={() => goToStep(coreStepIndex("cakeStructure"))} />
                  <ReviewRow label={lang === "ar" ? "الحجم" : "Size"} value={state.size} onEdit={() => goToStep(coreStepIndex("cakeStructure"))} />
                  <ReviewRow label={lang === "ar" ? "الحشو" : "Filling"} value={state.filling === "Other" || state.filling === "أخرى" ? state.fillingOther : state.filling} onEdit={() => goToStep(coreStepIndex("filling"))} />
                </ReviewGroup>

                <ReviewGroup title={lang === "ar" ? "التصميم" : "Design"}>
                  {state.tiers.slice(0, state.tierCount).map((t, i) => (
                    <ReviewRow key={i} label={lang === "ar" ? `لون ${TIER_LABELS.ar[i]}` : `${TIER_LABELS.en[i]} Color`} value={tierColorLabel(t)} onEdit={() => goToStep(coreStepIndex("designDetails"))} />
                  ))}
                  {state.tiers.slice(0, state.tierCount).map((t, i) => (
                    <ReviewRow key={`flavor-${i}`} label={lang === "ar" ? `نكهة ${TIER_LABELS.ar[i]}` : `${TIER_LABELS.en[i]} Flavor`} value={tierFlavorLabel(t, lang)} onEdit={() => goToStep(coreStepIndex("designDetails"))} />
                  ))}
                  <ReviewRow label={lang === "ar" ? "الكتابة على التورتة" : "Cake Message"} value={state.message} onEdit={() => goToStep(coreStepIndex("designDetails"))} />
                  <ReviewRow label={lang === "ar" ? "ملاحظات" : "Notes"} value={state.notes} onEdit={() => goToStep(coreStepIndex("designDetails"))} />
                  {state.refPhotoDataUrl && (
                    <div>
                      <p className="text-[#79665E] mb-1">{lang === "ar" ? "صورة مرجعية" : "Reference Photo"}</p>
                      <img src={state.refPhotoDataUrl} className="w-24 h-24 rounded-xl object-cover" />
                    </div>
                  )}
                </ReviewGroup>

                {fields.some((f) => resolveDynamicAnswerText(f, state.dynamicAnswers[f.id])) && (
                  <ReviewGroup title={lang === "ar" ? "إضافي" : "Additional"}>
                    {fields.map((field) => {
                      const text = resolveDynamicAnswerText(field, state.dynamicAnswers[field.id]);
                      if (!text) return null;
                      return <ReviewRow key={field.id} label={field.label} value={text} onEdit={() => goToStep(fieldStepIndex(field))} />;
                    })}
                  </ReviewGroup>
                )}
              </div>
              {error && <p className="text-[#D96C7C] text-sm font-semibold mt-4">{error}</p>}
              {sent && (
                <p className="mt-4 text-sm bg-[#F3C7CC]/30 text-[#633B2C] rounded-xl p-3">
                  {lang === "ar" ? "آخر خطوة 📷\nفتحنا واتساب بتفاصيل تورتتك. متنساش ترفق صورة الديكور قبل ما تبعت الرسالة." : "One last step 📷\nWhatsApp is ready with your cake details. Don't forget to attach your reference photo before sending."}
                </p>
              )}
            </Step>
          )}
        </div>

        <div className="flex items-center gap-3 mt-6">
          {state.step > 0 && (
            <button onClick={goBack} className="border border-[#E8D8CC] rounded-full px-6 py-3 font-semibold text-sm text-[#633B2C]">
              {lang === "ar" ? "رجوع" : "Back"}
            </button>
          )}
          {state.step < lastStepIndex && (
            <button onClick={goNext} disabled={!canContinue}
              className={`flex-1 rounded-full py-3 font-semibold text-sm transition ${canContinue ? "bg-[#D96C7C] text-white hover:bg-[#C55769]" : "bg-[#F0E6DC] text-[#B8A99B] cursor-not-allowed"}`}>
              {lang === "ar" ? "التالي" : "Continue"}
            </button>
          )}
          {state.step === lastStepIndex && (
            <button onClick={handleSend} className="flex-1 bg-[#25D366] text-white rounded-full py-3 font-semibold text-sm flex items-center justify-center gap-2">
              <WhatsAppIcon /> {lang === "ar" ? "ابعت تفاصيل تورتتي على واتساب" : "Send My Cake on WhatsApp"}
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-serif font-bold mb-5">{title}</h2>
      {children}
    </div>
  );
}
function Chip({ selected, onClick, children, small }: { selected: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button onClick={onClick}
      className={`rounded-xl border text-sm font-medium transition ${small ? "py-2.5 px-3" : "py-4 px-3"}
        ${selected ? "border-[#D96C7C] bg-[#F3C7CC]/40 text-[#633B2C] font-semibold" : "border-[#E8D8CC] bg-white text-[#33221C]"}`}>
      {children}
    </button>
  );
}

function ShapeGlyph({ shape }: { shape: "circle" | "triangle" | "heart" | "rectangle" }) {
  if (shape === "circle") return <svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor" /></svg>;
  if (shape === "triangle") return <svg width="26" height="26" viewBox="0 0 24 24"><path d="M12 3l9 18H3z" fill="currentColor" /></svg>;
  if (shape === "heart") return <svg width="26" height="26" viewBox="0 0 24 24"><path d="M12 21s-7.5-4.9-10-9.4C.4 8.2 2.4 4.5 6 4.5c2 0 3.6 1.1 4.5 2.7.9-1.6 2.5-2.7 4.5-2.7 3.6 0 5.6 3.7 4 7.1-2.5 4.5-10 9.4-10 9.4z" fill="currentColor" /></svg>;
  return <svg width="26" height="26" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" fill="currentColor" /></svg>;
}
function ShapeCard({ shape, label, selected, onClick }: { shape: "circle" | "triangle" | "heart" | "rectangle"; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 transition ${selected ? "border-[#D96C7C] bg-[#F3C7CC]/40 text-[#633B2C]" : "border-[#E8D8CC] bg-white text-[#79665E]"}`}>
      <span className={selected ? "text-[#D96C7C]" : "text-[#B8A99B]"}><ShapeGlyph shape={shape} /></span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function ReviewGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#B8945F] mb-2">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function ReviewRow({ label, value, onEdit }: { label: string; value?: string | null; onEdit: () => void }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[#79665E]">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
      <button onClick={onEdit} className="text-[#D96C7C] text-xs font-semibold underline shrink-0">Edit</button>
    </div>
  );
}

function DynamicFieldInput({
  field, lang, answer, showLabel = true, onText, onNumber, onSingleSelect, onToggleMulti,
}: {
  field: PublicCustomizationField;
  lang: Lang;
  answer: DynamicAnswer | undefined;
  showLabel?: boolean;
  onText: (v: string) => void;
  onNumber: (v: string) => void;
  onSingleSelect: (id: string) => void;
  onToggleMulti: (id: string) => void;
}) {
  return (
    <div>
      {showLabel && (
        <p className="font-semibold mb-1 text-sm text-[#633B2C]">
          {field.label}
          {!field.required && <span className="text-xs font-normal text-[#B8945F]"> ({lang === "ar" ? "اختياري" : "optional"})</span>}
        </p>
      )}
      {showLabel && field.description && <p className="text-xs text-[#79665E] mb-2">{field.description}</p>}
      {field.type === "text" && (
        <input value={(answer as string) || ""} onChange={(e) => onText(e.target.value)}
          className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white" />
      )}
      {field.type === "number" && (
        <input inputMode="decimal" value={(answer as string) || ""} onChange={(e) => onNumber(e.target.value)}
          className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white" />
      )}
      {field.type === "selection" && (
        <>
          {field.selectionMode === "multi" && (
            <p className="text-xs text-[#B8945F] mb-2">{lang === "ar" ? "تقدر تختار أكتر من خيار" : "You can select more than one"}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {(field.options ?? []).map((option) => {
              const selected = field.selectionMode === "multi" ? Array.isArray(answer) && answer.includes(option.id) : answer === option.id;
              return (
                <Chip key={option.id} small selected={selected}
                  onClick={() => (field.selectionMode === "multi" ? onToggleMulti(option.id) : onSingleSelect(option.id))}>
                  {option.label}
                </Chip>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SameStepFields({
  fields, lang, state, setDynamicText, setDynamicNumber, setDynamicSingleSelect, toggleDynamicMultiSelect,
}: {
  fields: PublicCustomizationField[] | undefined;
  lang: Lang;
  state: OrderState;
  setDynamicText: (fieldId: string, value: string) => void;
  setDynamicNumber: (fieldId: string, raw: string) => void;
  setDynamicSingleSelect: (fieldId: string, optionId: string) => void;
  toggleDynamicMultiSelect: (fieldId: string, optionId: string) => void;
}) {
  if (!fields || fields.length === 0) return null;
  return (
    <div className="mt-6 pt-5 border-t border-dashed border-[#E8D8CC] space-y-6">
      {fields.map((field, i) => (
        <div key={field.id} className={i > 0 ? "pt-5 border-t border-dashed border-[#E8D8CC]" : ""}>
          <DynamicFieldInput
            field={field}
            lang={lang}
            answer={state.dynamicAnswers[field.id]}
            onText={(v) => setDynamicText(field.id, v)}
            onNumber={(v) => setDynamicNumber(field.id, v)}
            onSingleSelect={(id) => setDynamicSingleSelect(field.id, id)}
            onToggleMulti={(id) => toggleDynamicMultiSelect(field.id, id)}
          />
        </div>
      ))}
    </div>
  );
}
