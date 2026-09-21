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
// Expanded state caps at ~25% of the viewer's height and scrolls
// internally with `overscroll-behavior: contain`, which is what stops a
// scroll gesture inside the description from also advancing the outer
// snap feed to the next video — it only starts affecting the ancestor
// scroller once this inner one has nowhere further to scroll.
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
    <div>
      <p
        ref={pRef}
        className={`description-scroll text-sm text-white/90 leading-relaxed ${expanded ? "max-h-[25dvh] overflow-y-auto [overscroll-behavior:contain]" : "line-clamp-2"}`}
      >
        {text}
      </p>
      {(truncated || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-xs font-semibold text-white underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded"
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

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
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

      {/* Tap-to-play/pause — sits behind the bottom content block (lower
          in the DOM / lower z-index), so title/description/CTA taps
          still reach their own controls. */}
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

      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? t.unmute : t.mute}
        className="absolute top-4 start-4 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <SpeakerIcon muted={muted} />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-8 pb-8 sm:pb-10 flex flex-col gap-2 max-w-xl">
        <h3 className="font-serif font-bold text-xl sm:text-2xl text-white">{cake.name}</h3>
        <ExpandableDescription text={cake.description} lang={lang} />

        <div className="flex items-center gap-3 mt-3">
          {cake.isAvailableToOrder ? (
            <>
              <a
                href={buildWhatsAppUrl(whatsappMessage(cake.name))}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 text-center bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full px-4 py-3 font-semibold text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <WhatsAppIcon /> {t.orderThisCake}
              </a>
              <Link
                href="/customize?new=1"
                className="flex-1 text-center bg-white/15 hover:bg-white/25 border border-white/40 backdrop-blur-sm text-white rounded-full px-4 py-3 font-semibold text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {t.customizeYourCake}
              </Link>
            </>
          ) : (
            <Link
              href="/customize?new=1"
              className="flex-1 text-center bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full px-4 py-3 font-semibold text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {t.customizeYourCake}
            </Link>
          )}
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
    <div className="fixed inset-0 z-[80] bg-black" role="dialog" aria-modal="true">
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
