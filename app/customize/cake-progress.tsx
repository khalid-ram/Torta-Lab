"use client";

// A pseudo-3D assembling cake used as customization progress feedback,
// built from layered CSS transforms + a few small SVGs rather than a 3D
// engine — the brief called for creative differentiation without the
// weight of Three.js, and this stack (Tailwind + plain divs/SVG) already
// covers everything the animation needs. Stages are driven purely by
// `progress` (0..1) so the cake always reflects real completion state,
// never a decorative loop.

type Lang = "en" | "ar";

const COPY = {
  en: {
    building: "Building your cake...",
    ready: "Your cake is ready!",
  },
  ar: {
    building: "بنجهز تورتتك...",
    ready: "تورتتك جاهزة!",
  },
};

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

export function CakeProgress({ progress, lang, compact }: { progress: number; lang: Lang; compact?: boolean }) {
  const p = Math.max(0, Math.min(1, progress));
  const complete = p >= 1;
  const showLayer1 = p > 0;
  const showLayer2 = p >= 2 / 6;
  const showLayer3 = p >= 3 / 6;
  const showFrosting = p >= 4 / 6;
  const showDecor = p >= 5 / 6;
  const t = COPY[lang];

  const height = compact ? 116 : 260;

  return (
    <div className={`flex flex-col items-center justify-end select-none ${compact ? "" : "sticky top-24"}`}>
      <div className="relative w-full flex items-end justify-center" style={{ height }}>
        {complete && (
          <>
            <Sparkle className="top-2 start-[20%]" delay="0s" />
            <Sparkle className="top-6 end-[18%]" delay="0.3s" />
            <Sparkle className="top-0 start-1/2" delay="0.6s" />
          </>
        )}

        {/* Cake stand */}
        <div
          className="absolute bottom-0 rounded-[50%] bg-[#E8D8CC] shadow-[0_6px_16px_rgba(99,59,44,0.18)]"
          style={{ width: compact ? 84 : 168, height: compact ? 10 : 18 }}
        />

        {/* Tier 3 (bottom, widest) */}
        <div
          className={`absolute rounded-2xl bg-gradient-to-b from-[#B8945F] to-[#8E6B3F] shadow-[0_4px_14px_rgba(99,59,44,0.25)] transition-all duration-500 ease-out motion-reduce:transition-none ${
            showLayer1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{
            width: compact ? 92 : 176,
            height: compact ? 26 : 52,
            bottom: compact ? 8 : 16,
          }}
        />

        {/* Tier 2 */}
        <div
          className={`absolute rounded-2xl bg-gradient-to-b from-[#D9A86C] to-[#B8945F] shadow-[0_4px_12px_rgba(99,59,44,0.2)] transition-all duration-500 ease-out motion-reduce:transition-none ${
            showLayer2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{
            width: compact ? 68 : 132,
            height: compact ? 20 : 42,
            bottom: compact ? 30 : 62,
          }}
        />

        {/* Tier 1 (top, narrowest) */}
        <div
          className={`absolute rounded-2xl bg-gradient-to-b from-[#E9C99A] to-[#D9A86C] shadow-[0_4px_10px_rgba(99,59,44,0.18)] transition-all duration-500 ease-out motion-reduce:transition-none ${
            showLayer3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{
            width: compact ? 46 : 92,
            height: compact ? 16 : 34,
            bottom: compact ? 47 : 98,
          }}
        />

        {/* Frosting wrap + drips, layered over the top two tiers */}
        <div
          className={`absolute rounded-2xl bg-[#FFF6EC]/90 transition-all duration-500 ease-out motion-reduce:transition-none ${
            showFrosting ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
          style={{
            width: compact ? 70 : 136,
            height: compact ? 10 : 18,
            bottom: compact ? 44 : 94,
          }}
        />
        <svg
          viewBox="0 0 100 14"
          className={`absolute transition-all duration-500 ease-out motion-reduce:transition-none ${
            showFrosting ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
          style={{ width: compact ? 70 : 136, bottom: compact ? 34 : 78 }}
        >
          <path
            d="M0 0 Q5 14 10 4 Q15 14 20 4 Q25 14 30 4 Q35 14 40 4 Q45 14 50 4 Q55 14 60 4 Q65 14 70 4 Q75 14 80 4 Q85 14 90 4 Q95 14 100 0 V0 H0 Z"
            fill="#FFF6EC"
          />
        </svg>

        {/* Decorations: berries + topper */}
        <div
          className={`absolute flex gap-1.5 transition-all duration-500 ease-out motion-reduce:transition-none ${
            showDecor ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
          style={{ bottom: compact ? 52 : 108 }}
        >
          <span className="block rounded-full bg-[#D96C7C]" style={{ width: compact ? 6 : 10, height: compact ? 6 : 10 }} />
          <span className="block rounded-full bg-[#8E6B3F]" style={{ width: compact ? 6 : 10, height: compact ? 6 : 10 }} />
          <span className="block rounded-full bg-[#D96C7C]" style={{ width: compact ? 6 : 10, height: compact ? 6 : 10 }} />
        </div>

        {/* Topper / candle — only once everything required is done */}
        <div
          className={`absolute transition-all duration-500 ease-out motion-reduce:transition-none ${
            complete ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-75"
          }`}
          style={{ bottom: compact ? 58 : 122 }}
        >
          <div className="relative flex flex-col items-center">
            <span
              className="block rounded-full bg-[#FFB84D] motion-safe:animate-[cakeFlame_1.1s_ease-in-out_infinite] motion-reduce:animate-none"
              style={{ width: compact ? 5 : 8, height: compact ? 7 : 11 }}
            />
            <span className="block bg-[#F8EEE5]" style={{ width: 2, height: compact ? 10 : 16 }} />
          </div>
        </div>
      </div>

      <p className={`mt-2 text-xs font-semibold text-center ${complete ? "text-[#2E7D32]" : "text-[#79665E]"}`}>
        {complete ? t.ready : t.building}
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
