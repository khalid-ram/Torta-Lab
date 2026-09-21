"use client";

// A TikTok/Reels-style vertical video feed for the homepage's Our Work
// section. Replaces the previous single-video lightbox: instead of only
// showing the clicked video, the customer can keep scrolling through
// every other active video cake without closing and reopening. Built on
// native CSS scroll-snap (no scroll-hijacking JS) + IntersectionObserver
// to know which item is currently in view, which is what drives
// play/pause and the native scrollbar being hidden purely with CSS —
// the same technique already used for the horizontal Our Work row.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PublicBakedCake } from "@/lib/api/baked-cakes";
import { buildWhatsAppUrl, WhatsAppIcon } from "@/lib/whatsapp";
import { CloseIcon } from "./navbar";

type Lang = "en" | "ar";

const VIDEO_FEED_T: Record<
  Lang,
  {
    close: string;
    play: string;
    pause: string;
    mute: string;
    unmute: string;
    showMore: string;
    showLess: string;
    orderThisCake: string;
    customizeYourCake: string;
  }
> = {
  en: {
    close: "Close video",
    play: "Play video",
    pause: "Pause video",
    mute: "Mute",
    unmute: "Unmute",
    showMore: "Show more",
    showLess: "Show less",
    orderThisCake: "Order This Cake",
    customizeYourCake: "Customize Your Cake",
  },
  ar: {
    close: "إغلاق الفيديو",
    play: "شغّل الفيديو",
    pause: "إيقاف الفيديو",
    mute: "كتم الصوت",
    unmute: "تشغيل الصوت",
    showMore: "عرض المزيد",
    showLess: "عرض أقل",
    orderThisCake: "اطلب التورتة",
    customizeYourCake: "صمّم تورتتك",
  },
};

function PlayGlyph({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="white" stroke="none" />
      {muted ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 6a9 9 0 0 1 0 12" />}
    </svg>
  );
}

// Collapses to 2 lines with a "Show more" affordance only when the text
// actually overflows 2 lines (measured, not guessed from length — a
// short line-1 sentence and a long word-heavy one clamp differently).
// Expanded state caps at 1/4 of the video's own height (the parent box
// this sits in has a concrete pixel height via aspect-ratio, so a plain
// CSS percentage resolves correctly here) and scrolls internally with
// `overscroll-behavior: contain`, which is what stops a scroll gesture
// inside the description from also advancing the outer snap feed to the
// next video — it only starts affecting the ancestor scroller once this
// inner one has nowhere further to scroll. The white/80 glass panel is
// the same treatment collapsed or expanded, just taller when expanded,
// so toggling it never swaps to a visually different card.
function ExpandableDescription({ text, lang }: { text: string; lang: Lang }) {
  const t = VIDEO_FEED_T[lang];
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const pRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = pRef.current;
    if (!el) return;
    setTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  if (!text) return null;

  return (
    <div className={`flex flex-col bg-white/80 backdrop-blur-md px-4 py-3 sm:px-5 sm:py-4 ${expanded ? "max-h-[25%]" : ""}`}>
      <p
        ref={pRef}
        className={`description-scroll text-sm text-[#33221C] leading-relaxed ${expanded ? "flex-1 min-h-0 overflow-y-auto [overscroll-behavior:contain]" : "line-clamp-2"}`}
      >
        {text}
      </p>
      {(truncated || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 shrink-0 text-xs font-semibold text-[#633B2C] underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-[#633B2C]/60 rounded self-start"
        >
          {expanded ? t.showLess : t.showMore}
        </button>
      )}
      <style jsx>{`
        .description-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .description-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

function VideoFeedItem({
  cake,
  lang,
  active,
  near,
  muted,
  onToggleMute,
  whatsappMessage,
}: {
  cake: PublicBakedCake;
  lang: Lang;
  active: boolean;
  near: boolean;
  muted: boolean;
  onToggleMute: () => void;
  whatsappMessage: (name: string) => string;
}) {
  const t = VIDEO_FEED_T[lang];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [userPaused, setUserPaused] = useState(false);

  // Only the active (fully in-view) item plays; a previous item pauses
  // the instant it stops being active. Nearby items get their metadata
  // preloaded so the next swipe starts instantly; everything else stays
  // untouched until it's about to be scrolled into view.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.currentTime = 0;
      setUserPaused(false);
      void video.play();
    } else {
      video.pause();
    }
  }, [active]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setUserPaused(false);
    } else {
      video.pause();
      setUserPaused(true);
    }
  };

  const ctaButtons = cake.isAvailableToOrder ? (
    <>
      <a
        href={buildWhatsAppUrl(whatsappMessage(cake.name))}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 whitespace-nowrap bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-xs sm:text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <WhatsAppIcon /> {t.orderThisCake}
      </a>
      <Link
        href="/customize?new=1"
        className="whitespace-nowrap bg-white/15 hover:bg-white/25 border border-white/40 backdrop-blur-sm text-white rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-xs sm:text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {t.customizeYourCake}
      </Link>
    </>
  ) : (
    <Link
      href="/customize?new=1"
      className="whitespace-nowrap bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-xs sm:text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      {t.customizeYourCake}
    </Link>
  );

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Header: title + CTAs sit above the video, not overlaid on it. In
          Arabic the title reads at the (right) start edge and the CTAs
          sit at the (left) end edge; English mirrors automatically since
          this follows the page's own dir, not a hardcoded side. Extra
          end-side padding keeps this clear of the fixed close button. */}
      <div className="shrink-0 flex flex-wrap items-start justify-between gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 pe-16 sm:pe-20">
        <h3 className="font-serif font-bold text-white text-base sm:text-lg leading-snug line-clamp-1 min-w-0">{cake.name}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? t.unmute : t.mute}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <SpeakerIcon muted={muted} />
          </button>
          {ctaButtons}
        </div>
      </div>

      {/* Video, centered in the remaining space with the 90%-opacity
          black backdrop showing through around it. The box itself stays
          fully opaque black (standard video-player backing) so it never
          looks broken/see-through before a frame has painted — only the
          surrounding backdrop is the translucent one. */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-4 pb-4">
        <div className="relative h-full max-w-full aspect-[9/16] bg-black rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            src={cake.mediaUrl}
            poster={cake.thumbnailUrl ?? undefined}
            muted={muted}
            loop
            playsInline
            preload={active ? "auto" : near ? "metadata" : "none"}
            className="absolute inset-0 w-full h-full object-contain"
          />

          {/* Tap-to-play/pause — sits behind the description (lower
              z-index), so its "Show more" / scroll taps still land. */}
          <button
            type="button"
            onClick={togglePlayPause}
            aria-label={userPaused ? t.play : t.pause}
            className="absolute inset-0 z-10 flex items-center justify-center outline-none"
          >
            {userPaused && (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                <PlayGlyph playing={false} />
              </span>
            )}
          </button>

          {/* Description overlay — anchored to the video's own box, so it
              always matches the video's width exactly, not the screen's. */}
          <div className="absolute inset-x-0 bottom-0 z-20">
            <ExpandableDescription text={cake.description} lang={lang} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoFeed({
  cakes,
  startIndex,
  lang,
  whatsappMessage,
  onClose,
}: {
  cakes: PublicBakedCake[];
  startIndex: number;
  lang: Lang;
  whatsappMessage: (name: string) => string;
  onClose: () => void;
}) {
  const t = VIDEO_FEED_T[lang];
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [muted, setMuted] = useState(true);

  // Jump straight to the video the customer clicked, with no visible
  // scroll animation — this must happen before paint (useLayoutEffect),
  // not after, or the feed would flash open on item 0 first.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const target = itemRefs.current[startIndex];
    if (!container || !target) return;
    container.scrollTop = target.offsetTop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const index = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex(index);
          }
        }
      },
      { root: container, threshold: [0.6] },
    );
    itemRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [cakes.length]);

  const goToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(cakes.length - 1, index));
    itemRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        goToIndex(activeIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goToIndex(activeIndex - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, cakes.length]);

  if (cakes.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/90" role="dialog" aria-modal="true">
      <button
        type="button"
        onClick={onClose}
        aria-label={t.close}
        className="absolute top-4 end-4 z-40 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <CloseIcon className="text-white" />
      </button>

      <div ref={containerRef} className="video-feed-scroll h-full w-full overflow-y-auto snap-y snap-mandatory">
        {cakes.map((cake, index) => (
          <div
            key={cake.id}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            data-index={index}
            className="h-dvh w-full snap-start snap-always"
          >
            <VideoFeedItem
              cake={cake}
              lang={lang}
              active={index === activeIndex}
              near={Math.abs(index - activeIndex) <= 1}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              whatsappMessage={whatsappMessage}
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        .video-feed-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .video-feed-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
