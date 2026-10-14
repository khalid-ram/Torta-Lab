"use client";

// "Your Cake, Your Budget" — lead-generation entry point on the
// homepage. Three internal stages in one component: pick a budget ->
// name+phone (lead capture) -> recommendations, computed server-side
// from the approved cake_price_options / cake_extra_option_prices
// catalog (see backend/src/budget-leads). This is a lead tool, not an
// order flow — nothing here creates a baked-cakes order or an account.

import { useState } from "react";
import Link from "next/link";
import * as api from "@/lib/api/budget-leads";
import { useAuth } from "@/lib/auth/auth-context";

type Lang = "en" | "ar";
type Stage = "closed" | "form" | "results";

const PRESET_BUDGETS = [200, 300, 500, 700, 1000, 1500];
const MIN_BUDGET = 200;

const T: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    budgetLabel: string;
    customLabel: string;
    customPlaceholder: string;
    cta: string;
    newBadge: string;
    formTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    phoneLabel: string;
    phoneCountryEgypt: string;
    phoneCountryOther: string;
    phonePlaceholderEgypt: string;
    phonePlaceholderOther: string;
    privacyNotice: string;
    privacyAgree: string;
    submit: string;
    submitting: string;
    errorGeneric: string;
    errorName: string;
    errorPhone: string;
    errorPrivacy: string;
    errorBudget: string;
    resultsTitle: string;
    categoryBestValue: string;
    categoryBestTaste: string;
    categoryBestDesign: string;
    categoryNearest: string;
    cakeLabel: (size: number, layers: number) => string;
    startingFrom: string;
    remainingBudget: (n: number) => string;
    exceedsBudget: (n: number) => string;
    continueCta: string;
    close: string;
    back: string;
    egp: string;
  }
> = {
  en: {
    title: "Your Cake, Your Budget 🎂",
    subtitle: "Tell us your budget, and we'll recommend cakes that fit!",
    budgetLabel: "Choose your budget",
    customLabel: "Custom amount",
    customPlaceholder: "e.g. 650",
    cta: "Find My Cake",
    newBadge: "✨ New",
    formTitle: "Almost there",
    nameLabel: "Full name",
    namePlaceholder: "Your name",
    phoneLabel: "Mobile number",
    phoneCountryEgypt: "🇪🇬 Egypt (+20)",
    phoneCountryOther: "🌍 Other country",
    phonePlaceholderEgypt: "01012345678",
    phonePlaceholderOther: "+1 555 123 4567",
    privacyNotice: "Torta Lab may contact you about your cake request using the details above.",
    privacyAgree: "I agree",
    submit: "Show My Cakes",
    submitting: "Submitting...",
    errorGeneric: "Something went wrong. Please try again.",
    errorName: "Please enter your name.",
    errorPhone: "Please enter a valid mobile number.",
    errorPrivacy: "Please acknowledge the privacy notice to continue.",
    errorBudget: `Minimum budget is ${MIN_BUDGET} EGP.`,
    resultsTitle: "Here's what fits your budget",
    categoryBestValue: "Best Value",
    categoryBestTaste: "Best Taste",
    categoryBestDesign: "Best Design",
    categoryNearest: "Closest Match",
    cakeLabel: (size, layers) => `${size}cm cake, ${layers} layers`,
    startingFrom: "from",
    remainingBudget: (n) => `EGP ${formatAmount(n)} left in your budget`,
    exceedsBudget: (n) => `EGP ${formatAmount(n)} above your budget`,
    continueCta: "Continue to Customize",
    close: "Close",
    back: "Back",
    egp: "EGP",
  },
  ar: {
    title: "تورتتك على قد ميزانيتك 🎂",
    subtitle: "قولنا ميزانيتك كام، وإحنا نرشحلك التورت اللي تناسبك!",
    budgetLabel: "اختار ميزانيتك",
    customLabel: "مبلغ آخر",
    customPlaceholder: "مثلاً 650",
    cta: "وريني التورت اللي تناسبني",
    newBadge: "✨ جديد",
    formTitle: "خطوة أخيرة",
    nameLabel: "الاسم بالكامل",
    namePlaceholder: "اسمك",
    phoneLabel: "رقم الموبايل",
    phoneCountryEgypt: "🇪🇬 مصر (+20)",
    phoneCountryOther: "🌍 دولة أخرى",
    phonePlaceholderEgypt: "01012345678",
    phonePlaceholderOther: "+1 555 123 4567",
    privacyNotice: "قد تتواصل معاك تورتا لاب بخصوص طلب التورتة باستخدام البيانات اللي فوق.",
    privacyAgree: "موافق",
    submit: "اعرض التورت المناسبة",
    submitting: "جارٍ الإرسال...",
    errorGeneric: "حدث خطأ ما. حاول مرة أخرى.",
    errorName: "من فضلك اكتب اسمك.",
    errorPhone: "من فضلك اكتب رقم موبايل صحيح.",
    errorPrivacy: "من فضلك وافق على إشعار الخصوصية للمتابعة.",
    errorBudget: `أقل ميزانية هي ${MIN_BUDGET} جنيه.`,
    resultsTitle: "دي التورت اللي تناسب ميزانيتك",
    categoryBestValue: "أفضل قيمة",
    categoryBestTaste: "أفضل مذاق",
    categoryBestDesign: "أفضل تصميم",
    categoryNearest: "أقرب خيار",
    cakeLabel: (size, layers) => `تورتة ${size} سم، ${layers} طبقات`,
    startingFrom: "تبدأ من",
    remainingBudget: (n) => `باقي ${formatAmount(n)} جنيه من ميزانيتك`,
    exceedsBudget: (n) => `أعلى من ميزانيتك بـ ${formatAmount(n)} جنيه`,
    continueCta: "كمّل التخصيص",
    close: "إغلاق",
    back: "رجوع",
    egp: "ج.م",
  },
};

type CategoryLabelKey = "categoryBestValue" | "categoryBestTaste" | "categoryBestDesign" | "categoryNearest";

const CATEGORY_LABEL_KEY: Record<api.Recommendation["category"], CategoryLabelKey> = {
  best_value: "categoryBestValue",
  best_taste: "categoryBestTaste",
  best_design: "categoryBestDesign",
  nearest: "categoryNearest",
};

function formatAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function BudgetBanner({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [stage, setStage] = useState<Stage>("closed");
  const [budget, setBudget] = useState<number | null>(null);
  const [customBudget, setCustomBudget] = useState("");
  const [budgetError, setBudgetError] = useState("");

  const [name, setName] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<"EG" | "OTHER">("EG");
  const [phone, setPhone] = useState("");
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<api.Recommendation[]>([]);

  const { state: authState, refresh } = useAuth();
  const isLoggedIn = authState.status === "logged-in";

  const submitLead = async (amount: number, key: string) => {
    setSubmitting(true);
    setFormError("");
    try {
      const result = await api.submitBudgetLead({
        budgetEgp: amount,
        idempotencyKey: key,
        ...(isLoggedIn ? {} : { name: name.trim(), phone: phone.trim(), privacyAcknowledged: true }),
      });
      setRecommendations(result.recommendations);
      setStage("results");
      if (!isLoggedIn) void refresh(); // picks up a session if one was just created
    } catch (err) {
      setFormError(err instanceof api.BudgetLeadsApiError ? err.message : t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  const openForm = (selected: number) => {
    setBudget(selected);
    setBudgetError("");
    setFormError("");
    const key = crypto.randomUUID();
    setIdempotencyKey(key);

    // Already recognized — nothing left to ask, go straight to results.
    if (isLoggedIn) {
      setStage("results");
      void submitLead(selected, key);
      return;
    }
    setStage("form");
  };

  const handlePresetClick = (amount: number) => openForm(amount);

  const handleCustomSubmit = () => {
    const amount = Number(customBudget);
    if (!customBudget || Number.isNaN(amount) || amount < MIN_BUDGET) {
      setBudgetError(t.errorBudget);
      return;
    }
    openForm(amount);
  };

  const close = () => {
    setStage("closed");
    setName("");
    setPhone("");
    setPrivacyChecked(false);
    setFormError("");
    setRecommendations([]);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(t.errorName);
      return;
    }
    if (!privacyChecked) {
      setFormError(t.errorPrivacy);
      return;
    }
    if (!budget || !idempotencyKey) return;
    await submitLead(budget, idempotencyKey);
  };

  return (
    <section className="py-10 md:py-14 px-6">
      <div className="max-w-3xl mx-auto rounded-[2rem] bg-gradient-to-br from-[#FBEAE4] to-[#F7D9D0] px-6 py-10 sm:px-10 sm:py-14 text-center shadow-[0_12px_40px_rgba(217,108,124,0.2)] ring-1 ring-[#D96C7C]/20">
        <span className="inline-block bg-[#D96C7C] text-white text-xs font-bold tracking-wide rounded-full px-3 py-1">
          {t.newBadge}
        </span>
        <h2 className="mt-3 text-3xl sm:text-4xl font-serif font-bold text-[#33221C]">{t.title}</h2>
        <p className="mt-3 text-[#633B2C] max-w-md mx-auto">{t.subtitle}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {PRESET_BUDGETS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => handlePresetClick(amount)}
              className="bg-[#D96C7C] hover:bg-[#C55769] hover:scale-105 motion-reduce:hover:scale-100 text-white rounded-full px-5 py-2.5 font-bold text-sm sm:text-base shadow-[0_4px_14px_rgba(217,108,124,0.35)] transition"
            >
              {amount} {t.egp}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <label className="text-sm text-[#79665E]">{t.customLabel}</label>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_BUDGET}
            value={customBudget}
            onChange={(e) => setCustomBudget(e.target.value)}
            placeholder={t.customPlaceholder}
            className="w-28 border border-[#E8D8CC] rounded-xl px-3 py-1.5 text-sm bg-white text-center"
          />
          <button
            type="button"
            onClick={handleCustomSubmit}
            className="bg-[#D96C7C] hover:bg-[#C55769] hover:scale-105 motion-reduce:hover:scale-100 text-white rounded-full px-4 py-1.5 text-sm font-bold shadow-[0_4px_14px_rgba(217,108,124,0.35)] transition"
          >
            {t.cta}
          </button>
        </div>
        {budgetError && <p className="mt-2 text-sm font-medium text-[#C55769]">{budgetError}</p>}
      </div>

      {stage !== "closed" && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <button type="button" aria-label={t.close} className="absolute inset-0 bg-black/40" onClick={() => !submitting && close()} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8D8CC] sticky top-0 bg-white">
              <h3 className="font-serif font-bold text-lg text-[#33221C]">
                {stage === "form" ? t.formTitle : t.resultsTitle}
              </h3>
              <button onClick={() => !submitting && close()} aria-label={t.close} className="text-[#79665E] text-2xl leading-none">
                ×
              </button>
            </div>

            {stage === "form" && (
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.nameLabel}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    disabled={submitting}
                    maxLength={120}
                    className="w-full border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#633B2C] mb-1.5">{t.phoneLabel}</label>
                  <div className="flex gap-2">
                    <select
                      value={phoneCountry}
                      onChange={(e) => setPhoneCountry(e.target.value as "EG" | "OTHER")}
                      disabled={submitting}
                      className="border border-[#E8D8CC] rounded-xl px-2 py-2.5 text-sm bg-white disabled:opacity-60 shrink-0"
                    >
                      <option value="EG">{t.phoneCountryEgypt}</option>
                      <option value="OTHER">{t.phoneCountryOther}</option>
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={phoneCountry === "EG" ? t.phonePlaceholderEgypt : t.phonePlaceholderOther}
                      disabled={submitting}
                      className="flex-1 min-w-0 border border-[#E8D8CC] rounded-xl px-4 py-2.5 text-sm bg-white disabled:opacity-60"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-sm text-[#79665E]">
                  <input
                    type="checkbox"
                    checked={privacyChecked}
                    onChange={(e) => setPrivacyChecked(e.target.checked)}
                    disabled={submitting}
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    {t.privacyNotice} <span className="font-semibold text-[#633B2C]">({t.privacyAgree})</span>
                  </span>
                </label>

                {formError && <p className="text-sm font-medium text-[#C55769]">{formError}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full py-2.5 font-semibold text-sm transition disabled:opacity-60"
                >
                  {submitting ? t.submitting : t.submit}
                </button>
              </form>
            )}

            {stage === "results" && submitting && (
              <div className="p-10 text-center text-sm text-[#79665E]">{t.submitting}</div>
            )}

            {stage === "results" && !submitting && formError && (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-[#C55769]">{formError}</p>
              </div>
            )}

            {stage === "results" && !submitting && !formError && (
              <div className="p-6 space-y-4">
                {recommendations.map((rec) => (
                  <div key={`${rec.category}-${rec.priceOptionId}`} className="border border-[#E8D8CC] rounded-2xl p-4">
                    <span className="inline-block text-xs font-bold text-[#D96C7C] bg-[#FBEAE4] rounded-full px-2.5 py-1">
                      {t[CATEGORY_LABEL_KEY[rec.category]]}
                    </span>
                    <h4 className="mt-2 font-serif font-bold text-[#33221C]">{t.cakeLabel(rec.sizeCm, rec.layers)}</h4>
                    {rec.extra && (
                      <p className="text-sm text-[#79665E] mt-0.5">
                        {lang === "ar" ? rec.extra.nameAr : rec.extra.nameEn}
                      </p>
                    )}
                    <p className="mt-1.5 font-semibold text-[#633B2C]">
                      {rec.isStartingPrice ? `${t.startingFrom} ` : ""}
                      {formatAmount(rec.totalPrice)} {t.egp}
                    </p>
                    <p className="text-xs text-[#A08D80] mt-0.5">
                      {rec.exceedsBudgetBy !== null
                        ? t.exceedsBudget(rec.exceedsBudgetBy)
                        : rec.remainingBudget !== null && rec.remainingBudget >= 0
                          ? t.remainingBudget(rec.remainingBudget)
                          : null}
                    </p>
                    <Link
                      href={`/customize?new=1&budgetSizeCm=${rec.sizeCm}&budgetLayers=${rec.layers}`}
                      className="mt-3 inline-block w-full text-center bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full px-4 py-2 font-semibold text-sm transition"
                    >
                      {t.continueCta}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
