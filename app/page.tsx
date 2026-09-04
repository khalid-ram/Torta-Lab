"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getPublicBakedCakes, type PublicBakedCake } from "@/lib/api/baked-cakes";
import { WHATSAPP_NUMBER, buildWhatsAppUrl, WhatsAppIcon } from "@/lib/whatsapp";
import { PublicNavbar, CloseIcon } from "./navbar";
import { SOCIAL_LINKS } from "./social-links";
import { PUBLIC_CONTAINER_CLASS } from "./container";

type Lang = "en" | "ar";

const T = {
  en: {
    nav: { home: "Home", cakes: "Our Work", customize: "Customize", about: "About", signIn: "Sign In", signUp: "Sign Up", logout: "Logout", menu: "Open menu", closeMenu: "Close menu" },
    hero: { title: "You Design It. We Bake It.", primary: "Customize Cake", secondary: "Our Cakes",
      trust: ["Fresh Ingredients", "Made to Order", "Custom Designs"] },
    cakes: {
      title: "Our Work",
      subtitle: "A look at cakes we’ve created, each one made fresh for a special celebration.",
      videoLabel: "Video",
      playVideo: "Play video",
      previousSlide: "Previous",
      nextSlide: "Next",
    },
    orderNow: "Order Now",
    customizeYours: "Customize Yours",
    whatsappCakeMessage: (name: string) =>
      `Hello 👋\nI'd like to order this cake: ${name}\nPlease let me know the price and availability.`,
    whyUs: {
      title: "Why Torta Lab?",
      values: [
        { title: "Homemade Taste", body: "Made with care, just like home." },
        { title: "Fresh & Natural", body: "Fresh ingredients, no harmful additives." },
        { title: "Worth the Quality", body: "Great quality at a fair price." },
      ],
    },
    videoBanner: {
      title: "Watch Your Cake Come to Life",
      body: "Design your cake your way, and request a video capturing how it was made from the first step to the final touch.",
      cta: "Customize Yours",
    },
    about: { title: "About Us", body: "We're a small custom-cake studio that believes every celebration deserves something made just for it. Every cake is baked fresh, to order, with ingredients we trust." },
    whatsappFloat: "WhatsApp Now",
    footer: {
      rights: "All rights reserved.",
      social: { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", whatsapp: "WhatsApp", email: "Email" },
      socialAria: {
        facebook: "Torta Lab on Facebook",
        instagram: "Torta Lab on Instagram",
        tiktok: "Torta Lab on TikTok",
        whatsapp: "Contact Torta Lab on WhatsApp",
        email: "Email Torta Lab",
      },
    },
    customizeThis: "Customize This Cake",
  },
  ar: {
    nav: { home: "الرئيسية", cakes: "شغلنا", customize: "صمّم تورتتك", about: "من نحن", signIn: "تسجيل دخول", signUp: "إنشاء حساب", logout: "تسجيل الخروج", menu: "افتح القائمة", closeMenu: "اغلق القائمة" },
    hero: { title: "إنت تصمّمها، وإحنا نخبزها.", primary: "صمم تورتتك", secondary: "شوف شغلنا",
      trust: ["مكونات طازجة", "تتعمل عند الطلب", "تصميم حسب اختيارك"] },
    cakes: {
      title: "شغلنا",
      subtitle: "شوف بعض التورتات اللي عملناها فريش مخصوص لمناسبات مميزة.",
      videoLabel: "فيديو",
      playVideo: "شغّل الفيديو",
      previousSlide: "السابق",
      nextSlide: "التالي",
    },
    orderNow: "اطلب الآن",
    customizeYours: "صمم تورتتك",
    whatsappCakeMessage: (name: string) =>
      `مرحبًا 👋\nأريد طلب هذه التورتة: ${name}\nمن فضلك أخبرني بالسعر والتوفر.`,
    whyUs: {
      title: "ليه تورتا لاب؟",
      values: [
        { title: "طعم بيتي", body: "تورتة معمولة بعناية وطعم بيتي حقيقي." },
        { title: "طبيعية وفريش", body: "مكونات فريش وطبيعية، بدون ألوان ضارة أو إضافات صناعية." },
        { title: "جودة تستاهل", body: "خامات بجودة عالية وسعر مناسب من غير ما نضحي بالطعم." },
      ],
    },
    videoBanner: {
      title: "شوف تورتتك وهي بتتعمل",
      body: "صمّم تورتتك بطريقتك، واطلب فيديو يوثّق مراحل تحضيرها من أول خطوة لحد اللمسة الأخيرة.",
      cta: "صمّم تورتتك",
    },
    about: { title: "من نحن", body: "إحنا استوديو تورت مخصص بنؤمن إن كل مناسبة تستحق حاجة معمولة مخصوص ليها. كل تورتة بتتعمل فريش عند الطلب، بمكونات بنثق فيها." },
    whatsappFloat: "واتساب الان",
    footer: {
      rights: "جميع الحقوق محفوظة.",
      social: { facebook: "فيسبوك", instagram: "إنستجرام", tiktok: "تيك توك", whatsapp: "واتساب", email: "البريد الإلكتروني" },
      socialAria: {
        facebook: "تورتا لاب على فيسبوك",
        instagram: "تورتا لاب على إنستجرام",
        tiktok: "تورتا لاب على تيك توك",
        whatsapp: "تواصل مع تورتا لاب على واتساب",
        email: "راسل تورتا لاب بالإيميل",
      },
    },
    customizeThis: "صمّم حاجة شبهها",
  },
};

export default function Home() {
  const [lang, setLang] = useState<Lang>("ar");
  const [videoGalleryOpen, setVideoGalleryOpen] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const galleryVideoRef = useRef<HTMLVideoElement>(null);
  const touchStartY = useRef<number | null>(null);
  const cakesRowRef = useRef<HTMLDivElement>(null);
  const [canScrollCakes, setCanScrollCakes] = useState(false);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = T[lang];

  useEffect(() => {
    const el = cakesRowRef.current;
    if (!el) return;
    const checkOverflow = () => setCanScrollCakes(el.scrollWidth > el.clientWidth + 1);
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, []);

  const scrollCakes = (direction: 1 | -1) => {
    const el = cakesRowRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  useEffect(() => {
    if (!videoGalleryOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [videoGalleryOpen]);

  // Dynamic Baked Cake cards. Failure is swallowed on purpose: the
  // permanent Customize card must always render regardless of whether
  // this fetch succeeds (see spec: "Public API failure must not crash
  // the homepage").
  const [bakedCakes, setBakedCakes] = useState<PublicBakedCake[]>([]);
  useEffect(() => {
    let cancelled = false;
    getPublicBakedCakes()
      .then((cakes) => {
        if (!cancelled) setBakedCakes(cakes);
      })
      .catch(() => {
        // Homepage stays fully functional with just the Customize card.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const videoCakes = bakedCakes.filter((cake) => cake.mediaType === "video");

  // Mobile-only priority: newest ACTIVE video cake first, then the rest of
  // bakedCakes in their existing (already active-only, newest-first) order.
  // bakedCakes is exactly what the backend returns for /baked-cakes — active
  // only, ordered by created_at desc — so the first video-type entry here
  // already IS the most recently uploaded active video; no extra fetch or
  // hardcoded cake is needed. Desktop is untouched (see mobileOrderById use
  // below): it keeps the plain backend order.
  const mobileBakedCakes = useMemo(() => {
    const videoIndex = bakedCakes.findIndex((cake) => cake.mediaType === "video");
    if (videoIndex <= 0) return bakedCakes;
    const promoted = bakedCakes[videoIndex];
    const rest = bakedCakes.filter((_, i) => i !== videoIndex);
    return [promoted, ...rest];
  }, [bakedCakes]);
  // Same JSX/section renders both breakpoints — only which array feeds the
  // .map() below differs, so DOM order (and therefore scroll-snap/initial
  // scroll position) is always correct for the active breakpoint, with no
  // separate mobile/desktop implementation.
  const [isMobileOurWork, setIsMobileOurWork] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileOurWork(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const displayCakes = isMobileOurWork ? mobileBakedCakes : bakedCakes;

  // Root cause of the "wrong card shows first" bug: this row is
  // dir="rtl" + snap-mandatory, and browsers don't reliably default an
  // RTL snap-scroll container to its start (Chromium lands it at the far
  // (negative) end of the scroll range instead) — so without this, the
  // LAST card (the static Customize card) is what's actually in view on
  // load, regardless of DOM/array order. Forcing scrollLeft back to 0
  // (the true start in both RTL and LTR) whenever the card list changes
  // — initial load, or the mobile/desktop list swapping at the md
  // breakpoint — is the fix, not a cosmetic scroll nudge.
  useEffect(() => {
    const el = cakesRowRef.current;
    if (!el || displayCakes.length === 0) return;
    el.scrollLeft = 0;
  }, [displayCakes]);

  useEffect(() => {
    if (!videoGalleryOpen) return;
    const video = galleryVideoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
  }, [videoGalleryOpen, activeVideoIndex]);

  const openVideoGallery = (cakeId: string) => {
    const index = videoCakes.findIndex((cake) => cake.id === cakeId);
    setActiveVideoIndex(index === -1 ? 0 : index);
    setVideoGalleryOpen(true);
  };

  const handleGalleryTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleGalleryTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;
    if (deltaY <= 60) return;
    if (activeVideoIndex < videoCakes.length - 1) {
      setActiveVideoIndex((index) => index + 1);
    } else {
      setVideoGalleryOpen(false);
    }
  };

  return (
    <div dir={dir} lang={lang} className="bg-white text-[#33221C] min-h-screen font-sans">
      <PublicNavbar lang={lang} onLangChange={setLang} />

      <section className={`pt-2 md:pt-4 pb-6 md:pb-10 ${PUBLIC_CONTAINER_CLASS}`}>
        <div className="relative rounded-[2rem] overflow-hidden h-[55vh] sm:h-[60vh] md:h-[65vh] max-h-[680px] min-h-[380px] shadow-[0_20px_60px_rgba(99,59,44,0.14)]">
          <Image
            src="/assets/hero-personalized-cake.jpg"
            alt={lang === "ar" ? "تورتة مخصصة مزينة بالورد الطازج على طاولة مطبخ دافئة" : "A personalized cake decorated with fresh flowers on a warm kitchen counter"}
            fill
            priority
            sizes="(min-width: 1800px) 1800px, 100vw"
            className="object-cover object-right"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-28 sm:pt-0 gap-5 sm:gap-6 px-6 sm:px-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold leading-tight whitespace-normal text-center text-black [text-shadow:0_2px_20px_rgba(255,255,255,0.7)]">{t.hero.title}</h1>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              <Link href="/customize?new=1" className="bg-[#D96C7C]/70 hover:bg-[#D96C7C]/85 border border-white/60 backdrop-blur-lg text-white px-6 sm:px-7 py-3 rounded-full font-semibold transition shadow-[0_8px_24px_rgba(0,0,0,0.15)]">{t.hero.primary}</Link>
              <a href="#cakes" className="bg-white/55 hover:bg-white/70 border border-white/60 backdrop-blur-lg text-[#33221C] px-6 sm:px-7 py-3 rounded-full font-semibold transition">{t.hero.secondary}</a>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-6 md:py-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#F7F4F1] to-[#F0ECE7] px-8 py-12 sm:px-12 sm:py-14 md:px-16 md:py-16 flex flex-col md:flex-row items-center gap-10 md:gap-16">
          <div className="flex-1 text-center md:text-start">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#33221C] leading-snug">{t.videoBanner.title}</h2>
            <p className="mt-4 text-[#633B2C] leading-relaxed max-w-md mx-auto md:mx-0">{t.videoBanner.body}</p>
            <Link href="/customize?new=1" className="inline-block mt-6 bg-[#D96C7C] hover:bg-[#C55769] text-white px-7 py-3 rounded-full font-semibold transition">
              {t.videoBanner.cta}
            </Link>
          </div>
          <MakingOfIllustration />
        </div>
      </section>

      <section id="cakes" className="group relative max-w-6xl mx-auto px-6 py-10 md:py-12">
        <h2 className="text-3xl font-serif font-bold text-center">{t.cakes.title}</h2>
        <p className="text-center text-[#79665E] mt-3 max-w-xl mx-auto">{t.cakes.subtitle}</p>

        {canScrollCakes && (
          <>
            <button
              type="button"
              onClick={() => scrollCakes(-1)}
              aria-label={t.cakes.previousSlide}
              className="hidden md:flex absolute start-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white text-xl text-[#633B2C] shadow-md opacity-0 group-hover:opacity-100 transition"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scrollCakes(1)}
              aria-label={t.cakes.nextSlide}
              className="hidden md:flex absolute end-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white text-xl text-[#633B2C] shadow-md opacity-0 group-hover:opacity-100 transition"
            >
              ›
            </button>
          </>
        )}

        <div
          ref={cakesRowRef}
          className="mt-10 flex gap-5 md:gap-8 overflow-x-auto snap-x snap-mandatory pb-2 -mx-6 px-6 sm:mx-0 sm:px-0 md:justify-center"
        >
          {displayCakes.map((cake) => (
            <div
              key={cake.id}
              className="relative shrink-0 w-[70vw] sm:w-64 md:w-72 aspect-[9/16] snap-center rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(99,59,44,0.08)] bg-black"
            >
              <Image
                src={cake.mediaType === "video" ? cake.thumbnailUrl ?? "" : cake.mediaUrl}
                alt={cake.name}
                fill
                sizes="(min-width: 768px) 18rem, 70vw"
                className="object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              {cake.mediaType === "video" && (
                <>
                  <span className="absolute start-4 top-4 rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-xs font-bold text-white">
                    {t.cakes.videoLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => openVideoGallery(cake.id)}
                    aria-label={t.cakes.playVideo}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/25 backdrop-blur-lg border border-white/50 shadow-lg transition-transform hover:scale-105">
                      <PlayIcon className="w-6 h-6 text-white ms-1" />
                    </span>
                  </button>
                </>
              )}

              <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-3">
                <h3 className="font-serif font-bold text-lg text-white line-clamp-2">{cake.name}</h3>
                {cake.isAvailableToOrder ? (
                  <a
                    href={buildWhatsAppUrl(t.whatsappCakeMessage(cake.name))}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 text-center bg-[#25D366] hover:bg-[#20BD5A] border border-white/60 backdrop-blur-lg text-white rounded-full px-4 py-2.5 font-semibold text-sm transition"
                  >
                    <WhatsAppIcon /> {t.orderNow}
                  </a>
                ) : (
                  <Link
                    href="/customize?new=1"
                    className="w-full text-center bg-[#D96C7C]/70 hover:bg-[#D96C7C]/85 border border-white/60 backdrop-blur-lg text-white rounded-full px-4 py-2.5 font-semibold text-sm transition"
                  >
                    {t.customizeYours}
                  </Link>
                )}
              </div>
            </div>
          ))}

          {/* Static, frontend-owned card — never backed by baked_cakes data.
              Always last: it must never be the first card when an active
              cake (video or otherwise) exists, but still needs its own
              place in the priority list. */}
          <div className="relative shrink-0 w-[70vw] sm:w-64 md:w-72 aspect-[9/16] snap-center rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(99,59,44,0.08)] bg-[#F3C7CC]/40 flex flex-col items-center justify-center text-center p-5">
            <span className="text-[#D96C7C] text-6xl leading-none">+</span>
            <h3 className="font-serif font-bold text-xl mt-4">{lang === "ar" ? "صمّم تورتتك" : "Build Your Own Cake"}</h3>
            <p className="text-sm text-[#79665E] mt-2">
              {lang === "ar" ? "اختار كل تفصيلة بنفسك واعمل تورتة مخصوصة ليك." : "Choose every detail and build a cake made just for you."}
            </p>
            <Link href="/customize?new=1" className="w-full text-center mt-5 bg-[#D96C7C] text-white rounded-full py-2.5 px-4 font-semibold text-sm">
              {t.customizeThis}
            </Link>
          </div>
        </div>
      </section>

      {videoGalleryOpen && videoCakes[activeVideoIndex] && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex flex-col items-center justify-center"
          role="dialog"
          aria-modal="true"
          onTouchStart={handleGalleryTouchStart}
          onTouchEnd={handleGalleryTouchEnd}
        >
          <button
            type="button"
            onClick={() => setVideoGalleryOpen(false)}
            aria-label={t.nav.closeMenu}
            className="absolute top-4 end-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <CloseIcon className="text-white" />
          </button>
          <p className="text-white font-serif font-bold text-lg sm:text-xl mb-4 px-6 text-center">{videoCakes[activeVideoIndex].name}</p>
          <video
            key={videoCakes[activeVideoIndex].id}
            ref={galleryVideoRef}
            className="max-h-[75vh] max-w-full rounded-2xl"
            controls
            playsInline
          >
            <source src={videoCakes[activeVideoIndex].mediaUrl} type="video/mp4" />
          </video>
        </div>
      )}

      <section className="max-w-6xl mx-auto px-6 py-10 md:py-12">
        <h2 className="text-3xl font-serif font-bold text-center">{t.whyUs.title}</h2>
        <div className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-10">
          {t.whyUs.values.map((v, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-3">
              <span className="w-16 h-16 rounded-full bg-[#F8EEE5] flex items-center justify-center text-[#D96C7C]">
                {WHY_US_ICONS[i]}
              </span>
              <h3 className="font-serif font-bold text-lg">{v.title}</h3>
              <p className="text-sm text-[#79665E] max-w-[220px]">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="max-w-2xl mx-auto px-6 py-10 md:py-12 text-center">
        <h2 className="text-3xl font-serif font-bold">{t.about.title}</h2>
        <p className="text-[#79665E] mt-4 leading-relaxed">{t.about.body}</p>
      </section>

      <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer"
        className="fixed bottom-6 end-6 bg-[#25D366] text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 font-semibold text-sm z-50">
        <WhatsAppIcon /> {t.whatsappFloat}
      </a>

      <footer className="bg-[#633B2C] text-[#F8EEE5] py-10 mt-4">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xl font-serif font-bold">{lang === "ar" ? "تورتا لاب" : "TORTA LAB"}</p>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <a href="#cakes">{t.nav.cakes}</a>
            <Link href="/customize?new=1">{t.nav.customize}</Link>
            <a href="#about">{t.nav.about}</a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 mt-5">
            {SOCIAL_LINKS.map(({ key, href, external, Icon }) => (
              <a
                key={key}
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                aria-label={t.footer.socialAria[key]}
                className="flex items-center gap-1.5 text-sm text-[#F8EEE5]/90 hover:text-[#F3C7CC] focus-visible:text-[#F3C7CC] transition rounded-full px-2.5 py-2 -mx-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[#F3C7CC]"
              >
                <Icon />
                {t.footer.social[key]}
              </a>
            ))}
          </div>
          <p className="mt-5 text-xs opacity-60">© {new Date().getFullYear()} {lang === "ar" ? "تورتا لاب" : "TORTA LAB"}. {t.footer.rights}</p>
        </div>
      </footer>
    </div>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function WhiskIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v5" />
      <path d="M8 7c-1 4 1 10 4 10s5-6 4-10" />
      <path d="M9.5 7c-.6 3.5.6 8 2.5 8s3.1-4.5 2.5-8" />
      <path d="M12 17v5" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19c9 0 14-6 14-15-9 0-15 5-15 14-.2 1.6.4 1.2 1 1z" />
      <path d="M6 18c2.5-3.5 6-7 10-10" />
    </svg>
  );
}

function RibbonIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4.3" />
      <path d="M9.3 11.7L7.5 20l4.5-2.7 4.5 2.7-1.8-8.3" />
    </svg>
  );
}

const WHY_US_ICONS = [<WhiskIcon key="whisk" />, <LeafIcon key="leaf" />, <RibbonIcon key="ribbon" />];

function MakingOfIllustration() {
  return (
    <div className="relative shrink-0 w-40 h-40 sm:w-48 sm:h-48 flex items-end justify-center">
      <span className="absolute top-0 start-0 w-6 h-6 border-t-2 border-s-2 border-[#79665E]/45 rounded-tl-lg" />
      <span className="absolute top-0 end-0 w-6 h-6 border-t-2 border-e-2 border-[#79665E]/45 rounded-tr-lg" />
      <span className="absolute bottom-0 start-0 w-6 h-6 border-b-2 border-s-2 border-[#79665E]/45 rounded-bl-lg" />
      <span className="absolute bottom-0 end-0 w-6 h-6 border-b-2 border-e-2 border-[#79665E]/45 rounded-br-lg" />

      <span className="absolute top-3 end-3 flex items-center gap-1.5 bg-black/30 rounded-full px-2 py-1">
        <span className="w-2 h-2 rounded-full bg-[#E8574A] motion-safe:animate-pulse" />
        <span className="text-[10px] font-semibold text-white/90">REC</span>
      </span>

      <div className="relative flex flex-col items-center pb-4">
        <div className="w-16 h-10 rounded-xl bg-gradient-to-b from-[#F3C7CC] to-[#D96C7C]" />
        <div className="w-24 h-12 rounded-xl bg-gradient-to-b from-[#E9C99A] to-[#D9A86C] -mt-1" />
      </div>
    </div>
  );
}

