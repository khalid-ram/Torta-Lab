"use client";

// A pseudo-3D assembling cake that renders the customer's ACTUAL
// selections (tier count, per-tier flavor, chosen colors, filling,
// occasion) rather than a generic staged animation — see
// cake-visual-model.ts for the mapping from raw answers to this
// component's props. Built from layered CSS transforms + a few small
// SVGs, no 3D engine: that stack already covers everything this needs.

import type { CakeVisualModel, TierVisualFlavor, OccasionDecoration } from "./cake-visual-model";

type Lang = "en" | "ar";

// Structural reveal stages (which layers exist) are separate from what
// each layer looks like — a tier's flavor color updates live the moment
// it's chosen, regardless of which stage the tier itself appeared in.
const STAGE = { tiers: 0.2, frosting: 0.4, details: 0.6, decoration: 0.8 };

function Sparkle({ className, delay }: { className: string; delay: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`absolute w-3 h-3 text-[#F3C7CC] motion-safe:animate-[cakeSparkle_1.6s_ease-in-out_infinite] motion-reduce:animate-none ${className}`}
      style={{ animationDelay: delay }}
    >
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
    </svg>
  );
}

function tierBackground(flavor: TierVisualFlavor): string {
  switch (flavor) {
    case "chocolate":
      return "linear-gradient(180deg, #8E6B3F, #5C3A22)";
    case "cream":
      return "linear-gradient(180deg, #FFF8ED, #F0E2CC)";
    case "half":
      return "linear-gradient(90deg, #FFF8ED 50%, #6B4226 50%)";
    case "other":
      return "linear-gradient(180deg, #E7B7A6, #C98F7C)";
    case "undecided":
    default:
      return "linear-gradient(180deg, #E9C99A, #D9A86C)";
  }
}

// Geometry for up to 3 tier slots. Slots beyond the real tier count stay
// mounted (collapsed at the top of the visible stack, zero-opacity) so a
// tier-count change animates via ordinary CSS transitions on width/
// height/bottom instead of an abrupt mount/unmount.
function tierSlots(tierCount: 1 | 2 | 3, sizeScale: number, compact: boolean) {
  const maxW = (compact ? 92 : 176) * sizeScale;
  const totalH = compact ? 62 : 128;
  const standH = compact ? 10 : 18;

  const widths = Array.from({ length: tierCount }, (_, i) => {
    const t = tierCount === 1 ? 0 : i / (tierCount - 1);
    return maxW * (1 - t * 0.46);
  });
  const weights = Array.from({ length: tierCount }, (_, i) => 1 - (i / tierCount) * 0.22);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const heights = weights.map((w) => (w / weightSum) * totalH);

  const bottoms: number[] = [];
  let acc = standH;
  for (let i = 0; i < tierCount; i++) {
    bottoms.push(acc);
    acc += heights[i];
  }
  const stackTop = acc;

  const slots = [0, 1, 2].map((i) => {
    if (i < tierCount) return { width: widths[i], height: heights[i], bottom: bottoms[i], visible: true };
    const collapsedWidth = widths[widths.length - 1] ?? maxW * 0.5;
    return { width: collapsedWidth, height: 6, bottom: stackTop, visible: false };
  });

  return { slots, stackTop };
}

function OccasionTopper({ decoration, compact }: { decoration: OccasionDecoration; compact: boolean }) {
  const size = compact ? 0.72 : 1;
  if (decoration === "birthday") {
    return (
      <div className="relative flex flex-col items-center">
        <span
          className="block rounded-full bg-[#FFB84D] motion-safe:animate-[cakeFlame_1.1s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ width: 5 * size + 3, height: 7 * size + 4 }}
        />
        <span className="block bg-[#F8EEE5]" style={{ width: 2, height: 16 * size }} />
      </div>
    );
  }
  if (decoration === "wedding") {
    return (
      <svg width={26 * size} height={22 * size} viewBox="0 0 26 22" fill="none">
        <circle cx="13" cy="8" r="4.2" fill="#FFF6EC" stroke="#F3C7CC" strokeWidth="1" />
        <circle cx="7" cy="11" r="3.4" fill="#FBEAE0" stroke="#F3C7CC" strokeWidth="1" />
        <circle cx="19" cy="11" r="3.4" fill="#FBEAE0" stroke="#F3C7CC" strokeWidth="1" />
        <circle cx="13" cy="8" r="1.3" fill="#D9A86C" />
        <path d="M11 15c-1 2-1 4 0 6" stroke="#8FAE7C" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  if (decoration === "engagement") {
    return (
      <div className="relative">
        <svg width={22 * size} height={20 * size} viewBox="0 0 24 22" fill="none">
          <path
            d="M12 20s-8-5-8-10.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 3.5C20 15 12 20 12 20z"
            fill="#D96C7C"
          />
        </svg>
        <svg viewBox="0 0 24 24" fill="currentColor" className="absolute -top-1.5 -end-1.5 w-2.5 h-2.5 text-[#F3C7CC] motion-safe:animate-[cakeSparkle_1.8s_ease-in-out_infinite] motion-reduce:animate-none">
          <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
        </svg>
      </div>
    );
  }
  return (
    <svg width={18 * size} height={18 * size} viewBox="0 0 24 24" fill="#D9A86C">
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
    </svg>
  );
}

export function CakeProgress({ model, lang, compact }: { model: CakeVisualModel; lang: Lang; compact?: boolean }) {
  const p = Math.max(0, Math.min(1, model.progress));
  const percent = Math.round(p * 100);
  const showTiers = p >= STAGE.tiers;
  const showFrosting = p >= STAGE.frosting;
  const showDetails = p >= STAGE.details;
  const showDecoration = p >= STAGE.decoration;

  const height = compact ? 116 : 260;
  const { slots, stackTop } = tierSlots(model.tierCount, model.sizeScale, !!compact);
  const topWidth = slots[model.tierCount - 1]?.width ?? (compact ? 60 : 110);

  return (
    <div className={`flex flex-col items-center justify-end select-none ${compact ? "" : "sticky top-24"}`}>
      <div className="relative w-full flex items-end justify-center" style={{ height }}>
        {model.completed && (
          <>
            <Sparkle className="top-2 start-[20%]" delay="0s" />
            <Sparkle className="top-6 end-[18%]" delay="0.3s" />
            <Sparkle className="top-0 start-1/2" delay="0.6s" />
          </>
        )}

        {/* Cake stand */}
        <div
          className="absolute bottom-0 rounded-[50%] bg-[#E8D8CC] shadow-[0_6px_16px_rgba(99,59,44,0.18)] transition-all duration-500 motion-reduce:transition-none"
          style={{ width: (compact ? 84 : 168) * model.sizeScale, height: compact ? 10 : 18 }}
        />

        {/* Tiers — exactly model.tierCount, colored by each tier's real flavor */}
        {slots.map((slot, i) => (
          <div
            key={i}
            className={`absolute rounded-2xl shadow-[0_4px_14px_rgba(99,59,44,0.22)] transition-all duration-500 ease-out motion-reduce:transition-none ${
              showTiers && slot.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
            style={{
              width: slot.width,
              height: slot.height,
              bottom: slot.bottom,
              background: tierBackground(model.tiers[i]?.flavor ?? "undecided"),
            }}
          />
        ))}

        {/* Filling stripe between tiers, once a filling is chosen */}
        {showDetails &&
          model.fillingColor &&
          (() => {
            const fillingColor = model.fillingColor;
            return slots.slice(0, Math.max(model.tierCount - 1, 0)).map((slot, i) => (
              <div
                key={`filling-${i}`}
                className="absolute rounded-full transition-opacity duration-500 motion-reduce:transition-none"
                style={{
                  width: slots[i + 1]?.width ?? slot.width,
                  height: 3,
                  bottom: slots[i + 1]?.bottom ?? slot.bottom,
                  background: fillingColor,
                  opacity: 0.85,
                }}
              />
            ));
          })()}

        {/* Frosting wrap + drip, layered over the top tier */}
        <div
          className={`absolute rounded-2xl bg-[#FFF6EC]/90 transition-all duration-500 ease-out motion-reduce:transition-none ${
            showFrosting ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
          style={{ width: topWidth * 0.9, height: compact ? 8 : 14, bottom: Math.max(stackTop - (compact ? 8 : 16), 0) }}
        />
        <svg
          viewBox="0 0 100 14"
          className={`absolute transition-all duration-500 ease-out motion-reduce:transition-none ${
            showFrosting ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
          style={{ width: topWidth * 0.9, bottom: Math.max(stackTop - (compact ? 18 : 32), 0) }}
        >
          <path
            d="M0 0 Q5 14 10 4 Q15 14 20 4 Q25 14 30 4 Q35 14 40 4 Q45 14 50 4 Q55 14 60 4 Q65 14 70 4 Q75 14 80 4 Q85 14 90 4 Q95 14 100 0 V0 H0 Z"
            fill="#FFF6EC"
          />
        </svg>

        {/* Accent details: dots colored by the customer's actual chosen colors */}
        {model.accentColors.length > 0 && (
          <div
            className={`absolute flex gap-1.5 transition-all duration-500 ease-out motion-reduce:transition-none ${
              showDetails ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
            }`}
            style={{ bottom: Math.max(stackTop + (compact ? 2 : 4), 0) }}
          >
            {model.accentColors.slice(0, 4).map((hex, i) => (
              <span key={i} className="block rounded-full border border-black/5" style={{ width: compact ? 6 : 10, height: compact ? 6 : 10, background: hex }} />
            ))}
          </div>
        )}

        {/* Occasion-specific topper — the final touch */}
        <div
          className={`absolute transition-all duration-500 ease-out motion-reduce:transition-none ${
            showDecoration ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-75"
          }`}
          style={{ bottom: Math.max(stackTop + (compact ? 8 : 14), 0) }}
        >
          <OccasionTopper decoration={model.occasionDecoration} compact={!!compact} />
        </div>
      </div>

      <p className={`mt-2 text-xs font-semibold text-center ${model.completed ? "text-[#2E7D32]" : "text-[#79665E]"}`}>
        {lang === "ar" ? `${percent}% مكتمل` : `${percent}% Complete`}
      </p>

      <style jsx>{`
        @keyframes cakeSparkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes cakeFlame {
          0%, 100% { transform: scaleY(1) scaleX(1); }
          50% { transform: scaleY(1.15) scaleX(0.9); }
        }
      `}</style>
    </div>
  );
}
