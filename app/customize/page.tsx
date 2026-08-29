"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Lang = "en" | "ar";
type Flavor = "chocolate" | "cream" | "half" | "other" | null;
type Tier = { flavor: Flavor; otherFlavor?: string };
type OrderState = {
  step: number; maxStepReached: number;
  occasion: string | null;
  tierCount: 1 | 2 | 3; tiers: Tier[];
  size: string | null;
  filling: string | null; fillingOther: string;
  colors: string[]; colorOther: string;
  message: string; notes: string;
  refPhotoDataUrl: string | null;
};

const WHATSAPP_NUMBER = "201148350515";
const STORAGE_KEY = "torta-lab-order-state";

const defaultState: OrderState = {
  step: 0, maxStepReached: 0, occasion: null, tierCount: 1, tiers: [{ flavor: null }],
  size: null, filling: null, fillingOther: "", colors: [], colorOther: "",
  message: "", notes: "", refPhotoDataUrl: null,
};

const STEP_LABELS = {
  en: ["Occasion", "Tiers", "Flavors", "Size & Filling", "Colors & Message", "Photo", "Notes", "Review"],
  ar: ["المناسبة", "الأدوار", "النكهات", "الحجم والحشو", "الألوان والكتابة", "الصورة", "ملاحظات", "المراجعة"],
};

const OCCASIONS = {
  en: ["Birthday", "Wedding", "Engagement", "Anniversary", "Other", "No Occasion"],
  ar: ["عيد ميلاد", "فرح", "خطوبة", "ذكرى زواج", "مناسبة أخرى", "بدون مناسبة"],
};
const FLAVORS: { key: Exclude<Flavor, null>; en: string; ar: string }[] = [
  { key: "chocolate", en: "Chocolate", ar: "شوكولاتة" },
  { key: "cream", en: "Cream", ar: "كريمة" },
  { key: "half", en: "Half Cream / Half Chocolate", ar: "نص كريمة / نص شوكولاتة" },
  { key: "other", en: "Other", ar: "أخرى" },
];
const SIZES = { en: ["Small", "Medium", "Large"], ar: ["صغير", "متوسط", "كبير"] };
const FILLINGS_EN = ["Vanilla Cream", "Chocolate", "Strawberry", "Caramel", "Other"];
const FILLINGS_AR = ["كريمة فانيليا", "شوكولاتة", "فراولة", "كراميل", "أخرى"];
const COLORS_EN = ["White", "Chocolate", "Pink", "Blue", "Beige", "Other"];
const COLORS_AR = ["أبيض", "شوكولاتة", "وردي", "أزرق", "بيج", "لون آخر"];

export default function CustomizePage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [state, setState] = useState<OrderState>(defaultState);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
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

  const canContinue = useMemo(() => {
    if (state.step === 0) return !!state.occasion;
    if (state.step === 2) return state.tiers.every((t) => t.flavor && (t.flavor !== "other" || t.otherFlavor?.trim()));
    if (state.step === 3) {
      const fillingOk = !!state.filling && (state.filling !== "Other" && state.filling !== "أخرى" || state.fillingOther.trim());
      return !!state.size && fillingOk;
    }
    return true;
  }, [state]);

  const goNext = () => { if (!canContinue) return; const s = Math.min(state.step + 1, 7); set({ step: s, maxStepReached: Math.max(state.maxStepReached, s) }); };
  const goBack = () => set({ step: Math.max(state.step - 1, 0) });
  const goToStep = (i: number) => { if (i <= state.maxStepReached) set({ step: i }); };

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
    setError("");
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage())}`;
    window.open(url, "_blank");
    setSent(true);
  };

  const stepLabels = STEP_LABELS[lang];

  return (
    <div dir={dir} lang={lang} className="bg-[#FFF9F3] text-[#33221C] min-h-screen font-sans">
      <nav className="sticky top-0 z-50 bg-[#FFF9F3]/95 backdrop-blur border-b border-[#E8D8CC]">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold text-[#633B2C]">{lang === "ar" ? "→ رجوع للرئيسية" : "← Back to Home"}</Link>
          <span className="text-xl font-serif font-bold">{lang === "ar" ? "تورتا لاب" : "Torta Lab"}</span>
          <div className="flex items-center bg-[#F8EEE5] border border-[#E8D8CC] rounded-full p-1">
            <button onClick={() => setLang("en")} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${lang === "en" ? "bg-[#D96C7C] text-white shadow-sm" : "text-[#79665E]"}`}>EN</button>
            <button onClick={() => setLang("ar")} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${lang === "ar" ? "bg-[#D96C7C] text-white shadow-sm" : "text-[#79665E]"}`}>AR</button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-8">
        <div className="flex items-center">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => goToStep(i)}
                  disabled={i > state.maxStepReached}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition
                    ${i === state.step ? "bg-[#D96C7C] text-white ring-4 ring-[#F3C7CC] shadow" :
                      i < state.step ? "bg-[#633B2C] text-white cursor-pointer" :
                      i <= state.maxStepReached ? "bg-[#E8D8CC] text-[#633B2C] cursor-pointer" : "bg-[#F0E6DC] text-[#B8A99B] cursor-not-allowed"}`}
                >
                  {i < state.step ? "✓" : i + 1}
                </button>
                <span className="text-[10px] mt-1.5 text-[#79665E] text-center max-w-[56px] leading-tight">{label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`h-[2px] flex-1 mx-1 ${i < state.step ? "bg-[#633B2C]" : "bg-[#E8D8CC]"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-10">
        <div className="bg-[#FFFCF8] rounded-3xl p-6 md:p-8 shadow-[0_4px_20px_rgba(99,59,44,0.08)]">
          {state.step === 0 && (
            <Step title={lang === "ar" ? "بنحتفل بإيه؟" : "What are we celebrating?"}>
              <div className="grid grid-cols-2 gap-3">
                {OCCASIONS[lang].map((o) => (
                  <Chip key={o} selected={state.occasion === o} onClick={() => set({ occasion: o })}>{o}</Chip>
                ))}
              </div>
            </Step>
          )}

          {state.step === 1 && (
            <Step title={lang === "ar" ? "تحب التورتة كام دور؟" : "How many tiers would you like?"}>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((n) => (
                  <Chip key={n} selected={state.tierCount === n} onClick={() => setTierCount(n as 1 | 2 | 3)}>
                    {lang === "ar" ? ["دور واحد", "دورين", "3 أدوار"][n - 1] : `${n} Tier${n > 1 ? "s" : ""}`}
                  </Chip>
                ))}
              </div>
            </Step>
          )}

          {state.step === 2 && (
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
            </Step>
          )}

          {state.step === 3 && (
            <Step title={lang === "ar" ? "الحجم والحشو" : "Size & Filling"}>
              <p className="text-sm font-semibold mb-2 text-[#633B2C]">{lang === "ar" ? "الحجم" : "Size"}</p>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {SIZES[lang].map((s) => <Chip key={s} small selected={state.size === s} onClick={() => set({ size: s })}>{s}</Chip>)}
              </div>
              <p className="text-sm font-semibold mb-2 text-[#633B2C]">{lang === "ar" ? "الحشو" : "Filling"}</p>
              <div className="grid grid-cols-2 gap-2">
                {(lang === "ar" ? FILLINGS_AR : FILLINGS_EN).map((f) => <Chip key={f} small selected={state.filling === f} onClick={() => set({ filling: f })}>{f}</Chip>)}
              </div>
              {(state.filling === "Other" || state.filling === "أخرى") && (
                <input value={state.fillingOther} onChange={(e) => set({ fillingOther: e.target.value })}
                  placeholder={lang === "ar" ? "اكتب الحشو..." : "Describe the filling..."}
                  className="mt-3 w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white" />
              )}
            </Step>
          )}

          {state.step === 4 && (
            <Step title={lang === "ar" ? "الألوان والكتابة على التورتة" : "Colors & Cake Message"}>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {(lang === "ar" ? COLORS_AR : COLORS_EN).map((c) => (
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
            </Step>
          )}

          {state.step === 5 && (
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
            </Step>
          )}

          {state.step === 6 && (
            <Step title={lang === "ar" ? "في تفاصيل تانية تحب تقولها لنا؟" : "Anything else we should know?"}>
              <textarea value={state.notes} onChange={(e) => set({ notes: e.target.value })} rows={5}
                placeholder={lang === "ar" ? "قول لنا أي تفاصيل إضافية عن التورتة اللي في بالك..." : "Tell us anything else about your dream cake..."}
                className="w-full border border-[#E8D8CC] rounded-xl px-4 py-3 text-sm bg-white resize-none" />
            </Step>
          )}

          {state.step === 7 && (
            <Step title={lang === "ar" ? "تورتتك" : "Your Custom Cake"}>
              <div className="space-y-3 text-sm">
                <ReviewRow label={lang === "ar" ? "المناسبة" : "Occasion"} value={state.occasion} onEdit={() => goToStep(0)} />
                <ReviewRow label={lang === "ar" ? "عدد الأدوار" : "Tiers"} value={String(state.tierCount)} onEdit={() => goToStep(1)} />
                {state.tiers.map((t, i) => (
                  <ReviewRow key={i} label={lang === "ar" ? ["الدور الأول", "الدور الثاني", "الدور الثالث"][i] : `Tier ${i + 1}`}
                    value={t.flavor === "other" ? t.otherFlavor || "" : FLAVORS.find((f) => f.key === t.flavor)?.[lang] || ""} onEdit={() => goToStep(2)} />
                ))}
                <ReviewRow label={lang === "ar" ? "الحجم" : "Size"} value={state.size} onEdit={() => goToStep(3)} />
                <ReviewRow label={lang === "ar" ? "الحشو" : "Filling"} value={state.filling === "Other" || state.filling === "أخرى" ? state.fillingOther : state.filling} onEdit={() => goToStep(3)} />
                <ReviewRow label={lang === "ar" ? "الألوان" : "Colors"} value={state.colors.map((c) => (c === "Other" || c === "لون آخر") ? state.colorOther : c).join(", ")} onEdit={() => goToStep(4)} />
                {state.message && <ReviewRow label={lang === "ar" ? "الكتابة على التورتة" : "Cake Message"} value={state.message} onEdit={() => goToStep(4)} />}
                {state.notes && <ReviewRow label={lang === "ar" ? "ملاحظات" : "Notes"} value={state.notes} onEdit={() => goToStep(6)} />}
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
          {state.step < 7 && (
            <button onClick={goNext} disabled={!canContinue}
              className={`flex-1 rounded-full py-3 font-semibold text-sm transition ${canContinue ? "bg-[#D96C7C] text-white hover:bg-[#C55769]" : "bg-[#F0E6DC] text-[#B8A99B] cursor-not-allowed"}`}>
              {lang === "ar" ? "التالي" : "Continue"}
            </button>
          )}
          {state.step === 7 && (
            <button onClick={handleSend} className="flex-1 bg-[#25D366] text-white rounded-full py-3 font-semibold text-sm flex items-center justify-center gap-2">
              <WhatsAppIcon /> {lang === "ar" ? "ابعت تفاصيل تورتتي على واتساب" : "Send My Cake on WhatsApp"}
            </button>
          )}
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
function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.2-.1-.4-.1-.6.1-.2.2-.6.9-.8 1-.1.2-.3.2-.5.1-1.5-.7-2.5-1.3-3.5-3-.1-.2 0-.4.1-.5l.5-.6c.1-.2.1-.4 0-.5-.1-.2-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9 1-.9 2.3 0 1.4 1 2.7 1.2 2.9.2.2 1.9 3 4.7 4.1 2.3.9 2.8.7 3.3.7.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3z" />
      <path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.5 5.3L2 22l4.9-1.3C8.4 21.5 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.6 0-3.2-.4-4.5-1.2l-.3-.2-3.1.8.8-3-.2-.3C3.9 14.9 3.4 13.5 3.4 12 3.4 7.3 7.3 3.4 12 3.4s8.6 3.9 8.6 8.6-3.9 8.6-8.6 8.6z" />
    </svg>
  );
}
