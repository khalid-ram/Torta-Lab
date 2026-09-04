"use client";
import { useEffect, useMemo, useState } from "react";
import { buildWhatsAppUrl, WhatsAppIcon } from "@/lib/whatsapp";
import { getPublicCustomization, type CoreStepKey, type PublicCustomizationField } from "@/lib/api/customization";
import { PublicNavbar } from "../navbar";
import { CakeProgress } from "./cake-progress";
import { buildCakeVisualModel } from "./cake-visual-model";
import {
  type Lang, type Flavor, type Tier, type OrderState, type DynamicAnswer,
  STORAGE_KEY, defaultState, OCCASIONS, FLAVORS, SIZES, FILLING_VALUES, COLOR_VALUES,
} from "./customize-options";

// The 7 placeable Core Steps, in their fixed order, plus the final
// Review page. These stable ids are the integration points a Custom
// Question attaches to (Same Step -> renders inline on one of the 7;
// Separate Step -> becomes its own step positioned right after one of
// the 7) — mirrored exactly on the backend as CORE_STEP_KEYS.
type CoreStepId = CoreStepKey | "review";
const CORE_STEP_ORDER: CoreStepKey[] = ["occasion", "tiers", "flavors", "sizeFilling", "colorsMessage", "photo", "notes"];

type StepDescriptor = { kind: "core"; id: CoreStepId } | { kind: "separate"; field: PublicCustomizationField };

const CORE_STEP_LABELS: Record<Lang, Record<CoreStepId, string>> = {
  en: { occasion: "Occasion", tiers: "Tiers", flavors: "Flavors", sizeFilling: "Size & Filling", colorsMessage: "Colors & Message", photo: "Photo", notes: "Notes", review: "Review" },
  ar: { occasion: "المناسبة", tiers: "الأدوار", flavors: "النكهات", sizeFilling: "الحجم والحشو", colorsMessage: "الألوان والكتابة", photo: "الصورة", notes: "ملاحظات", review: "المراجعة" },
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

export default function CustomizePage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [state, setState] = useState<OrderState>(defaultState);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [fields, setFields] = useState<PublicCustomizationField[]>([]);
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setState({ ...defaultState, ...JSON.parse(saved), refPhotoDataUrl: null }); } catch {}
    }
  }, []);
  useEffect(() => {
    const { refPhotoDataUrl, ...rest } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    getPublicCustomization()
      .then((config) => { if (!cancelled) setFields(config.fields); })
      .catch(() => {
        // The core 7-step flow keeps working with zero admin-created fields.
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
    const tiers = Array.from({ length: n }, (_, i) => state.tiers[i] || { flavor: null });
    set({ tierCount: n, tiers });
  };
  const setTierFlavor = (i: number, flavor: Flavor) => {
    const tiers = state.tiers.map((t, idx) => (idx === i ? { ...t, flavor } : t));
    set({ tiers });
  };
  const setTierOther = (i: number, val: string) => {
    const tiers = state.tiers.map((t, idx) => (idx === i ? { ...t, otherFlavor: val } : t));
    set({ tiers });
  };
  const toggleColor = (c: string) => {
    const colors = state.colors.includes(c) ? state.colors.filter((x) => x !== c) : [...state.colors, c];
    set({ colors });
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
    if (currentDescriptor.id === "occasion") return !!state.occasion;
    if (currentDescriptor.id === "flavors") return state.tiers.every((t) => t.flavor && (t.flavor !== "other" || t.otherFlavor?.trim()));
    if (currentDescriptor.id === "sizeFilling") {
      const fillingOk = !!state.filling && (state.filling !== "Other" && state.filling !== "أخرى" || !!state.fillingOther.trim());
      return !!state.size && fillingOk;
    }
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, currentDescriptor, sameStepFieldsByCore]);

  const goNext = () => { if (!canContinue) return; const s = Math.min(state.step + 1, lastStepIndex); set({ step: s, maxStepReached: Math.max(state.maxStepReached, s) }); };
  const goBack = () => set({ step: Math.max(state.step - 1, 0) });
  const goToStep = (i: number) => { if (i >= 0 && i <= state.maxStepReached) set({ step: i }); };

  const requiredChecks = useMemo(() => {
    const checks: boolean[] = [
      !!state.occasion,
      state.tiers.every((t) => t.flavor && (t.flavor !== "other" || t.otherFlavor?.trim())),
      !!state.size,
      !!state.filling && (state.filling !== "Other" && state.filling !== "أخرى" || !!state.fillingOther.trim()),
    ];
    for (const field of fields) {
      if (field.required) checks.push(isDynamicFieldAnswered(field, state.dynamicAnswers[field.id]));
    }
    return checks;
  }, [state, fields]);
  const cakeVisual = useMemo(() => buildCakeVisualModel(state, requiredChecks), [state, requiredChecks]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => set({ refPhotoDataUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const buildMessage = () => {
    const L = lang;
    const lines: string[] = [];
    lines.push(L === "ar" ? "مرحبًا 👋\nأريد طلب تورتة مخصصة بالتفاصيل التالية:\n" : "Hello 👋\nI would like to order a customized cake.\n");
    if (state.occasion) lines.push(`🎂 ${L === "ar" ? "المناسبة" : "Occasion"}: ${state.occasion}`);
    lines.push(`🎂 ${L === "ar" ? "عدد الأدوار" : "Number of Tiers"}: ${state.tierCount}`);
    state.tiers.forEach((t, i) => {
      const label = L === "ar" ? ["الدور الأول", "الدور الثاني", "الدور الثالث"][i] : `Tier ${i + 1}`;
      const flavorLabel = t.flavor === "other" ? t.otherFlavor : FLAVORS.find((f) => f.key === t.flavor)?.[L];
      lines.push(`${label}: ${flavorLabel}`);
    });
    if (state.size) lines.push(`📏 ${L === "ar" ? "الحجم" : "Size"}: ${state.size}`);
    if (state.filling) lines.push(`🍓 ${L === "ar" ? "الحشو" : "Filling"}: ${state.filling === (L === "ar" ? "أخرى" : "Other") ? state.fillingOther : state.filling}`);
    if (state.colors.length) {
      const colorList = state.colors.map((c) => (c === (L === "ar" ? "لون آخر" : "Other") ? state.colorOther : c)).join(", ");
      lines.push(`🎨 ${L === "ar" ? "الألوان" : "Colors"}: ${colorList}`);
    }
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
    if (!state.size || !state.filling) {
      setError(lang === "ar" ? "من فضلك اختار الحجم والحشو." : "Please select size and filling.");
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

  const stepLabels = stepList.map((d) => (d.kind === "core" ? CORE_STEP_LABELS[lang][d.id] : d.field.label));

  return (
    <div dir={dir} lang={lang} className="bg-[#FFF9F3] text-[#33221C] min-h-screen font-sans">
      <PublicNavbar lang={lang} onLangChange={setLang} />

      {/* Step navigation is desktop-only now: on mobile the animated cake
          itself is the primary progress indicator (see CakeProgress
          below), so a second traditional progress UI would be redundant
          and was removed there entirely per product direction. */}
      <div className="hidden md:block max-w-3xl mx-auto pt-8">
        {/* The step count is admin-controlled and unbounded (Same/Separate
            Step custom questions can add any number of steps), so this
            can no longer assume a fixed 8 items stretched to fill the
            container — it scrolls horizontally within itself instead of
            ever forcing the page wider than the viewport. */}
        <div className="flex items-center overflow-x-auto px-6 pb-1">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center shrink-0">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => goToStep(i)}
                  disabled={i > state.maxStepReached}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition shrink-0
                    ${i === state.step ? "bg-[#D96C7C] text-white ring-4 ring-[#F3C7CC] shadow" :
                      i < state.step ? "bg-[#633B2C] text-white cursor-pointer" :
                      i <= state.maxStepReached ? "bg-[#E8D8CC] text-[#633B2C] cursor-pointer" : "bg-[#F0E6DC] text-[#B8A99B] cursor-not-allowed"}`}
                >
                  {i < state.step ? "✓" : i + 1}
                </button>
                <span className="text-[10px] mt-1.5 text-[#79665E] text-center w-14 leading-tight">{label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`h-[2px] w-8 shrink-0 mx-1 ${i < state.step ? "bg-[#633B2C]" : "bg-[#E8D8CC]"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="md:hidden max-w-xl mx-auto px-6 pt-4">
        <CakeProgress model={cakeVisual} lang={lang} compact />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 md:flex md:items-start md:gap-10">
        <div className="hidden md:block md:w-56 shrink-0">
          <CakeProgress model={cakeVisual} lang={lang} />
        </div>

        <div className="flex-1 max-w-xl mx-auto md:mx-0">
        <div className="bg-[#FFFCF8] rounded-3xl p-6 md:p-8 shadow-[0_4px_20px_rgba(99,59,44,0.08)]">
          {currentDescriptor.kind === "core" && currentDescriptor.id === "occasion" && (
            <Step title={lang === "ar" ? "بنحتفل بإيه؟" : "What are we celebrating?"}>
              <div className="grid grid-cols-2 gap-3">
                {OCCASIONS[lang].map((o) => (
                  <Chip key={o} selected={state.occasion === o} onClick={() => set({ occasion: o })}>{o}</Chip>
                ))}
              </div>
              <SameStepFields fields={sameStepFieldsByCore.occasion} lang={lang} state={state}
                setDynamicText={setDynamicText} setDynamicNumber={setDynamicNumber}
                setDynamicSingleSelect={setDynamicSingleSelect} toggleDynamicMultiSelect={toggleDynamicMultiSelect} />
            </Step>
          )}

          {currentDescriptor.kind === "core" && currentDescriptor.id === "tiers" && (
            <Step title={lang === "ar" ? "تحب التورتة كام دور؟" : "How many tiers would you like?"}>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((n) => (
                  <Chip key={n} selected={state.tierCount === n} onClick={() => setTierCount(n as 1 | 2 | 3)}>
                    {lang === "ar" ? ["دور واحد", "دورين", "3 أدوار"][n - 1] : `${n} Tier${n > 1 ? "s" : ""}`}
                  </Chip>
                ))}
              </div>
              <SameStepFields fields={sameStepFieldsByCore.tiers} lang={lang} state={state}
                setDynamicText={setDynamicText} setDynamicNumber={setDynamicNumber}
                setDynamicSingleSelect={setDynamicSingleSelect} toggleDynamicMultiSelect={toggleDynamicMultiSelect} />
            </Step>
          )}

          {currentDescriptor.kind === "core" && currentDescriptor.id === "flavors" && (
            <Step title={lang === "ar" ? "خصص كل دور" : "Customize Each Tier"}>
              <div className="space-y-6">
                {state.tiers.map((tier, i) => (
                  <div key={i} className={i > 0 ? "pt-5 border-t border-dashed border-[#E8D8CC]" : ""}>
                    <p className="font-semibold mb-3 text-sm text-[#633B2C]">
                      {lang === "ar" ? ["الدور الأول", "الدور الثاني", "الدور الثالث"][i] : `Tier ${i + 1}`}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {FLAVORS.map((f) => (
                        <Chip key={f.key} small selected={tier.flavor === f.key} onClick={() => setTierFlavor(i, f.key)}>{f[lang]}</Chip>
                      ))}
                    </div>
                    {tier.flavor === "other" && (
                      <input value={tier.otherFlavor || ""} onChange={(e) => setTierOther(i, e.target.value)}
                        placeholder={lang === "ar" ? "اكتب النكهة..." : "Describe the flavor..."}
                        className="mt-3 w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white" />
                    )}
                  </div>
                ))}
              </div>
              <SameStepFields fields={sameStepFieldsByCore.flavors} lang={lang} state={state}
                setDynamicText={setDynamicText} setDynamicNumber={setDynamicNumber}
                setDynamicSingleSelect={setDynamicSingleSelect} toggleDynamicMultiSelect={toggleDynamicMultiSelect} />
            </Step>
          )}

          {currentDescriptor.kind === "core" && currentDescriptor.id === "sizeFilling" && (
            <Step title={lang === "ar" ? "الحجم والحشو" : "Size & Filling"}>
              <p className="text-sm font-semibold mb-2 text-[#633B2C]">{lang === "ar" ? "الحجم" : "Size"}</p>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {SIZES[lang].map((s) => <Chip key={s} small selected={state.size === s} onClick={() => set({ size: s })}>{s}</Chip>)}
              </div>
              <p className="text-sm font-semibold mb-2 text-[#633B2C]">{lang === "ar" ? "الحشو" : "Filling"}</p>
              <div className="grid grid-cols-2 gap-2">
                {FILLING_VALUES[lang].map((f) => <Chip key={f} small selected={state.filling === f} onClick={() => set({ filling: f })}>{f}</Chip>)}
              </div>
              {(state.filling === "Other" || state.filling === "أخرى") && (
                <input value={state.fillingOther} onChange={(e) => set({ fillingOther: e.target.value })}
                  placeholder={lang === "ar" ? "اكتب الحشو..." : "Describe the filling..."}
                  className="mt-3 w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white" />
              )}
              <SameStepFields fields={sameStepFieldsByCore.sizeFilling} lang={lang} state={state}
                setDynamicText={setDynamicText} setDynamicNumber={setDynamicNumber}
                setDynamicSingleSelect={setDynamicSingleSelect} toggleDynamicMultiSelect={toggleDynamicMultiSelect} />
            </Step>
          )}

          {currentDescriptor.kind === "core" && currentDescriptor.id === "colorsMessage" && (
            <Step title={lang === "ar" ? "الألوان والكتابة على التورتة" : "Colors & Cake Message"}>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {COLOR_VALUES[lang].map((c) => (
                  <Chip key={c} small selected={state.colors.includes(c)} onClick={() => toggleColor(c)}>{c}</Chip>
                ))}
              </div>
              {(state.colors.includes("Other") || state.colors.includes("لون آخر")) && (
                <input value={state.colorOther} onChange={(e) => set({ colorOther: e.target.value })}
                  placeholder={lang === "ar" ? "اكتب اللون..." : "Describe the color..."}
                  className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white mb-4" />
              )}
              <p className="text-sm font-semibold mb-2 text-[#633B2C]">{lang === "ar" ? "تحب نكتب إيه على التورتة؟ (اختياري)" : "What would you like written on the cake? (optional)"}</p>
              <input value={state.message} onChange={(e) => set({ message: e.target.value })}
                placeholder={lang === "ar" ? "كل سنة وإنتِ طيبة يا سارة 🎂" : "Happy Birthday Sara 🎂"}
                className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white" />
              <SameStepFields fields={sameStepFieldsByCore.colorsMessage} lang={lang} state={state}
                setDynamicText={setDynamicText} setDynamicNumber={setDynamicNumber}
                setDynamicSingleSelect={setDynamicSingleSelect} toggleDynamicMultiSelect={toggleDynamicMultiSelect} />
            </Step>
          )}

          {currentDescriptor.kind === "core" && currentDescriptor.id === "photo" && (
            <Step title={`${lang === "ar" ? "عندك شكل معين في بالك؟" : "Have a design in mind?"} (${lang === "ar" ? "اختياري" : "Optional"})`}>
              <p className="text-sm text-[#79665E] mb-4">
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
              <p className="text-xs text-[#B8945F] mt-3">{lang === "ar" ? "اختياري — ممكن تعدي الخطوة دي" : "Optional — you can skip this step"}</p>
              <SameStepFields fields={sameStepFieldsByCore.photo} lang={lang} state={state}
                setDynamicText={setDynamicText} setDynamicNumber={setDynamicNumber}
                setDynamicSingleSelect={setDynamicSingleSelect} toggleDynamicMultiSelect={toggleDynamicMultiSelect} />
            </Step>
          )}

          {currentDescriptor.kind === "core" && currentDescriptor.id === "notes" && (
            <Step title={lang === "ar" ? "في تفاصيل تانية تحب تقولها لنا؟" : "Anything else we should know?"}>
              <textarea value={state.notes} onChange={(e) => set({ notes: e.target.value })} rows={5}
                placeholder={lang === "ar" ? "قول لنا أي تفاصيل إضافية عن التورتة اللي في بالك..." : "Tell us anything else about your dream cake..."}
                className="w-full border border-[#E8D8CC] rounded-xl px-4 py-3 text-sm bg-white resize-none" />
              <SameStepFields fields={sameStepFieldsByCore.notes} lang={lang} state={state}
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
              <div className="space-y-3 text-sm">
                <ReviewRow label={lang === "ar" ? "المناسبة" : "Occasion"} value={state.occasion} onEdit={() => goToStep(coreStepIndex("occasion"))} />
                <ReviewRow label={lang === "ar" ? "عدد الأدوار" : "Tiers"} value={String(state.tierCount)} onEdit={() => goToStep(coreStepIndex("tiers"))} />
                {state.tiers.map((t, i) => (
                  <ReviewRow key={i} label={lang === "ar" ? ["الدور الأول", "الدور الثاني", "الدور الثالث"][i] : `Tier ${i + 1}`}
                    value={t.flavor === "other" ? t.otherFlavor || "" : FLAVORS.find((f) => f.key === t.flavor)?.[lang] || ""} onEdit={() => goToStep(coreStepIndex("flavors"))} />
                ))}
                <ReviewRow label={lang === "ar" ? "الحجم" : "Size"} value={state.size} onEdit={() => goToStep(coreStepIndex("sizeFilling"))} />
                <ReviewRow label={lang === "ar" ? "الحشو" : "Filling"} value={state.filling === "Other" || state.filling === "أخرى" ? state.fillingOther : state.filling} onEdit={() => goToStep(coreStepIndex("sizeFilling"))} />
                <ReviewRow label={lang === "ar" ? "الألوان" : "Colors"} value={state.colors.map((c) => (c === "Other" || c === "لون آخر") ? state.colorOther : c).join(", ")} onEdit={() => goToStep(coreStepIndex("colorsMessage"))} />
                {state.message && <ReviewRow label={lang === "ar" ? "الكتابة على التورتة" : "Cake Message"} value={state.message} onEdit={() => goToStep(coreStepIndex("colorsMessage"))} />}
                {state.notes && <ReviewRow label={lang === "ar" ? "ملاحظات" : "Notes"} value={state.notes} onEdit={() => goToStep(coreStepIndex("notes"))} />}
                {fields.map((field) => {
                  const text = resolveDynamicAnswerText(field, state.dynamicAnswers[field.id]);
                  if (!text) return null;
                  return <ReviewRow key={field.id} label={field.label} value={text} onEdit={() => goToStep(fieldStepIndex(field))} />;
                })}
                {state.refPhotoDataUrl && (
                  <div>
                    <p className="text-[#79665E] mb-1">{lang === "ar" ? "صورة مرجعية" : "Reference Photo"}</p>
                    <img src={state.refPhotoDataUrl} className="w-24 h-24 rounded-xl object-cover" />
                  </div>
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
