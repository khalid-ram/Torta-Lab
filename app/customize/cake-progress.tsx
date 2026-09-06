"use client";

// A pseudo-3D assembling cake that renders the customer's ACTUAL
// selections (shape, tier count, per-tier color, filling, ceremony)
// rather than a generic staged animation — see cake-visual-model.ts for
// the mapping from raw answers to this component's props. Built from
// layered CSS transforms + a few small SVGs, no 3D engine: that stack
// already covers everything this needs.

import type { CakeVisualModel, CeremonyDecoration, ShapeKind } from "./cake-visual-model";

type Lang = "en" | "ar";

// Structural reveal stages (which layers exist) are separate from what
// each layer looks like — a tier's color updates live the moment it's
// chosen, regardless of which stage the tier itself appeared in. The
// ceremony medallion is NOT gated by a stage: it must respond the
// instant a ceremony is picked (see CakeProgress below).
const STAGE = { tiers: 0.2, frosting: 0.4, details: 0.6 };

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

// Darkens (negative percent) or lightens (positive percent) a hex color
// by a flat RGB amount, used to give each tier's flat chosen color a
// touch of frosting-like depth (a two-stop gradient of its own hue)
// instead of a single flat, lifeless fill.
function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
  return `rgb(${r}, ${g}, ${b})`;
}

function tierFill(colorHex: string | null): string {
  if (!colorHex) return "linear-gradient(180deg, #E9C99A, #D9A86C)"; // undecided neutral
  return `linear-gradient(180deg, ${shade(colorHex, 14)}, ${shade(colorHex, -16)})`;
}

// The customer's chosen Cake Shape stays recognizable at every tier —
// resolved once here so the tier-rendering loop below stays a plain
// style lookup instead of scattering shape conditionals through JSX.
const HEART_CLIP =
  "polygon(50% 15%, 61% 3%, 75% 0%, 88% 5%, 96% 15%, 100% 28%, 96% 42%, 85% 55%, 50% 85%, 15% 55%, 4% 42%, 0% 28%, 4% 15%, 12% 5%, 25% 0%, 39% 3%)";
const TRIANGLE_CLIP = "polygon(50% 0%, 2% 100%, 98% 100%)";

function tierShapeStyle(shape: ShapeKind): React.CSSProperties {
  switch (shape) {
    case "circle":
      return { borderRadius: "50%" };
    case "triangle":
      return { clipPath: TRIANGLE_CLIP, borderRadius: 0 };
    case "heart":
      return { clipPath: HEART_CLIP, borderRadius: 0 };
    case "rectangle":
    case "undecided":
    default:
      return { borderRadius: 10 };
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

// The ceremony's identity color — the medallion's background wash.
function ceremonyAccentColor(decoration: CeremonyDecoration): string {
  switch (decoration) {
    case "birthday":
      return "#FFB84D";
    case "wedding":
      return "#F3C7CC";
    case "engagement":
      return "#D96C7C";
    case "anniversary":
      return "#D9A86C";
    case "other":
    default:
      return "#D9A86C";
  }
}

function BirthdayCandle({ size, tall }: { size: number; tall: boolean }) {
  const height = (tall ? 20 : 14) * size;
  return (
    <div className="relative flex flex-col items-center">
      <span
        className="block rounded-full bg-[#FFB84D] motion-safe:animate-[cakeFlame_1.1s_ease-in-out_infinite] motion-reduce:animate-none"
        style={{ width: 6 * size + 3, height: 8 * size + 4 }}
      />
      <span className="block bg-white" style={{ width: 3, height }} />
    </div>
  );
}

// Two abstracted figures — deliberately not one generic person — reading
// clearly as a wedding couple: a narrower, darker "groom" silhouette and
// a wider, lighter "bride" silhouette (a dress-like shape), joined by a
// hand-level line, with the two rings above. Clean flat shapes, no
// faces/features, so it stays premium rather than illustrative-cute.
function WeddingCoupleIcon({ size }: { size: number }) {
  const s = size;
  return (
    <svg width={44 * s} height={40 * s} viewBox="0 0 44 40" fill="none">
      <circle cx="18.5" cy="7" r="3.4" fill="none" stroke="#D9A86C" strokeWidth="1.3" />
      <circle cx="25.5" cy="7" r="3.4" fill="none" stroke="#D9A86C" strokeWidth="1.3" />
      <circle cx="15" cy="18" r="3.4" fill="#633B2C" />
      <path d="M10.2 37c0-7.2 2-11.5 4.8-11.5s4.8 4.3 4.8 11.5z" fill="#633B2C" />
      <circle cx="29" cy="18" r="3.4" fill="#79665E" />
      <path d="M21.5 37c0-8.3 3-12.6 7.5-12.6s7.5 4.3 7.5 12.6z" fill="#F3C7CC" />
      <path d="M19 29.5h6" stroke="#D9A86C" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CeremonyIcon({ decoration, size }: { decoration: CeremonyDecoration; size: number }) {
  if (decoration === "birthday") {
    return (
      <div className="flex items-end gap-1.5">
        <BirthdayCandle size={size * 0.82} tall={false} />
        <BirthdayCandle size={size} tall />
        <BirthdayCandle size={size * 0.82} tall={false} />
      </div>
    );
  }
  if (decoration === "wedding") {
    return <WeddingCoupleIcon size={size} />;
  }
  if (decoration === "engagement") {
    return (
      <div className="relative">
        <svg width={36 * size} height={32 * size} viewBox="0 0 24 22" fill="none">
          <path d="M12 20s-8-5-8-10.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 3.5C20 15 12 20 12 20z" fill="#D96C7C" />
        </svg>
        <svg viewBox="0 0 24 24" fill="currentColor" className="absolute -top-1.5 -end-2 w-4 h-4 text-[#F3C7CC] motion-safe:animate-[cakeSparkle_1.8s_ease-in-out_infinite] motion-reduce:animate-none">
          <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
        </svg>
      </div>
    );
  }
  if (decoration === "anniversary") {
    return (
      <svg width={40 * size} height={40 * size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="9.5" r="6.4" fill="#FBEAE0" stroke="#D9A86C" strokeWidth="1.2" />
        <path d="M12 5.2l1.15 3.5 3.65.05-2.95 2.2 1.1 3.55L12 12.3l-2.95 2.2 1.1-3.55-2.95-2.2 3.65-.05z" fill="#D9A86C" />
        <path d="M8.6 15.4l-1.8 6 3-1.45 2.1 2.3 2.1-2.3 3 1.45-1.8-6" stroke="#D9A86C" strokeWidth="1.2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={30 * size} height={30 * size} viewBox="0 0 24 24" fill="#D9A86C">
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

  const height = compact ? 116 : 260;
  const { slots, stackTop } = tierSlots(model.tierCount, model.sizeScale, !!compact);
  const topWidth = slots[model.tierCount - 1]?.width ?? (compact ? 60 : 110);

  const accentColor = ceremonyAccentColor(model.ceremonyDecoration);
  const medallionSize = compact ? 58 : 84;
  const iconSize = compact ? 0.78 : 1.15;

  return (
    <div className={`flex flex-col items-center justify-end select-none ${compact ? "" : "sticky top-24"}`}>
      {/* The ceremony medallion — the main "what is this cake for" visual.
          It appears the instant a ceremony is chosen (never gated behind
          a progress stage) and overlaps slightly into the cake scene
          below so the two read as one composition, not a disconnected
          badge floating above empty space. */}
      {model.ceremonySelected && (
        <div
          className="relative z-10 flex items-center justify-center rounded-full shadow-[0_10px_24px_rgba(99,59,44,0.22)] border-2 border-white transition-transform duration-500 motion-reduce:transition-none"
          style={{
            width: medallionSize,
            height: medallionSize,
            marginBottom: -(medallionSize * 0.18),
            background: `radial-gradient(circle at 35% 30%, ${shade(accentColor, 22)}, ${accentColor})`,
          }}
        >
          <CeremonyIcon decoration={model.ceremonyDecoration} size={iconSize} />
        </div>
      )}

      <div className="relative w-full flex items-end justify-center" style={{ height }}>
        {/* Soft ambient wash tying the medallion and cake together. */}
        {model.ceremonySelected && (
          <div
            className="absolute rounded-full blur-2xl transition-opacity duration-700 motion-reduce:transition-none"
            style={{
              width: (compact ? 140 : 250) * model.sizeScale,
              height: (compact ? 140 : 250) * model.sizeScale,
              bottom: -10,
              background: accentColor,
              opacity: 0.1 + p * 0.14,
            }}
          />
        )}

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

        {/* Tiers — exactly model.tierCount, each shaped by the chosen Cake
            Shape and colored by that tier's own chosen color. */}
        {slots.map((slot, i) => (
          <div
            key={i}
            className={`absolute shadow-[0_4px_14px_rgba(99,59,44,0.22)] transition-all duration-500 ease-out motion-reduce:transition-none ${
              showTiers && slot.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
            style={{
              width: slot.width,
              height: slot.height,
              bottom: slot.bottom,
              background: tierFill(model.tiers[i]?.colorHex ?? null),
              ...tierShapeStyle(model.shape),
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
