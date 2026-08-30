"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";

type Lang = "en" | "ar";

const T = {
  en: {
    nav: { home: "Home", cakes: "Cakes", customize: "Customize", about: "About", signIn: "Sign In", signUp: "Sign Up", logout: "Logout", menu: "Open menu", closeMenu: "Close menu" },
    hero: { title: "You Design It. We Bake It.", primary: "Customize Cake", secondary: "Our Cakes",
      trust: ["Fresh Ingredients", "Made to Order", "Custom Designs"] },
    cakes: {
      title: "Cakes We’ve Made",
      subtitle: "A look at cakes we’ve created, each one made fresh for a special celebration.",
      featuredTitle: "A Cake We Made",
      videoLabel: "Video",
      playVideo: "Play video",
      previousSlide: "Previous",
      nextSlide: "Next",
    },
    about: { title: "About Us", body: "We're a small custom-cake studio that believes every celebration deserves something made just for it. Every cake is baked fresh, to order, with ingredients we trust." },
    whatsappFloat: "WhatsApp Now",
    footer: { rights: "All rights reserved." },
    customizeThis: "Customize This Cake",
  },
  ar: {
    nav: { home: "الرئيسية", cakes: "التورت", customize: "صمّم تورتتك", about: "من نحن", signIn: "تسجيل دخول", signUp: "إنشاء حساب", logout: "تسجيل الخروج", menu: "افتح القائمة", closeMenu: "اغلق القائمة" },
    hero: { title: "إنت تصمّمها، وإحنا نخبزها.", primary: "صمم تورتتك", secondary: "شوف شغلنا",
      trust: ["مكونات طازجة", "تتعمل عند الطلب", "تصميم حسب اختيارك"] },
    cakes: {
      title: "تورتات عملناها",
      subtitle: "شوف بعض التورتات اللي عملناها فريش مخصوص لمناسبات مميزة.",
      featuredTitle: "تورتة من شغلنا",
      videoLabel: "فيديو",
      playVideo: "شغّل الفيديو",
      previousSlide: "السابق",
      nextSlide: "التالي",
    },
    about: { title: "من نحن", body: "إحنا استوديو تورت مخصص بنؤمن إن كل مناسبة تستحق حاجة معمولة مخصوص ليها. كل تورتة بتتعمل فريش عند الطلب، بمكونات بنثق فيها." },
    whatsappFloat: "واتساب الان",
    footer: { rights: "جميع الحقوق محفوظة." },
    customizeThis: "صمّم حاجة شبهها",
  },
};

const WHATSAPP_NUMBER = "201148350515";

export default function Home() {
  const [lang, setLang] = useState<Lang>("ar");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoGalleryOpen, setVideoGalleryOpen] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const galleryVideoRef = useRef<HTMLVideoElement>(null);
  const touchStartY = useRef<number | null>(null);
  const cakesRowRef = useRef<HTMLDivElement>(null);
  const [canScrollCakes, setCanScrollCakes] = useState(false);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = T[lang];
  const { state, logout } = useAuth();

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
    if (!mobileMenuOpen && !videoGalleryOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen, videoGalleryOpen]);

  const cakeSlides = [{ type: "video", src: "/assets/cake-we-made.mp4" }] as const;

  type CakeSlide = (typeof cakeSlides)[number];
  const videoSlides = cakeSlides.filter((slide): slide is Extract<CakeSlide, { type: "video" }> => slide.type === "video");

  useEffect(() => {
    if (!videoGalleryOpen) return;
    const video = galleryVideoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
  }, [videoGalleryOpen, activeVideoIndex]);

  const openVideoGallery = (src: string) => {
    const index = videoSlides.findIndex((slide) => slide.src === src);
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
    if (activeVideoIndex < videoSlides.length - 1) {
      setActiveVideoIndex((index) => index + 1);
    } else {
      setVideoGalleryOpen(false);
    }
  };

  return (
    <div dir={dir} lang={lang} className="bg-white text-[#33221C] min-h-screen font-sans">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-[#E8D8CC]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex-1 flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t.nav.menu}
              className="flex md:hidden items-center justify-center w-9 h-9 rounded-full hover:bg-[#F8EEE5] transition -ms-1.5"
            >
              <MenuIcon />
            </button>
            <Logo lang={lang} />
          </div>

          <div className="hidden md:flex gap-8 text-sm font-medium text-[#633B2C]">
            <a href="#" className="hover:text-[#D96C7C] transition-colors">{t.nav.home}</a>
            <a href="#cakes" className="hover:text-[#D96C7C] transition-colors">{t.nav.cakes}</a>
            <Link href="/customize" className="hover:text-[#D96C7C] transition-colors">{t.nav.customize}</Link>
            <a href="#about" className="hover:text-[#D96C7C] transition-colors">{t.nav.about}</a>
          </div>

          <div className="flex-1 flex items-center justify-end gap-2 md:gap-3">
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="hidden md:flex items-center gap-1.5 text-sm font-medium text-[#633B2C] hover:text-[#79665E] transition"
            >
              {lang === "ar" ? (
                <>
                  <span aria-hidden="true">🇬🇧</span>
                  EN
                </>
              ) : (
                <>
                  <span aria-hidden="true">🇪🇬</span>
                  عربي
                </>
              )}
            </button>
            {state.status === "logged-in" && (
              <UserMenu name={state.user.name} logoutLabel={t.nav.logout} onLogout={() => logout()} />
            )}
            {state.status !== "logged-in" && (
              <div className="flex items-center gap-2 md:gap-3">
                <Link href="/sign-in" className="border border-[#633B2C]/50 text-[#633B2C] px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium hover:bg-[#F8EEE5] transition whitespace-nowrap">{t.nav.signIn}</Link>
                <Link href="/sign-up" className="bg-[#D96C7C] hover:bg-[#C55769] text-white px-3.5 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition whitespace-nowrap">{t.nav.signUp}</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={t.nav.closeMenu}
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 w-72 max-w-[80vw] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8D8CC]">
              <Logo lang={lang} />
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label={t.nav.closeMenu}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F8EEE5] transition"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="flex flex-col px-5 py-4 text-[#633B2C] font-medium">
              <a href="#" onClick={() => setMobileMenuOpen(false)} className="py-3 border-b border-[#F3EAE0]">{t.nav.home}</a>
              <a href="#cakes" onClick={() => setMobileMenuOpen(false)} className="py-3 border-b border-[#F3EAE0]">{t.nav.cakes}</a>
              <Link href="/customize" onClick={() => setMobileMenuOpen(false)} className="py-3 border-b border-[#F3EAE0]">{t.nav.customize}</Link>
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="py-3">{t.nav.about}</a>
            </nav>
            <div className="mt-auto px-5 py-5 border-t border-[#E8D8CC] flex items-center justify-center">
              <button
                onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                className="flex items-center gap-1.5 text-sm font-medium text-[#633B2C] hover:text-[#79665E] transition"
              >
                {lang === "ar" ? (
                  <>
                    <span aria-hidden="true">🇬🇧</span>
                    EN
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">🇪🇬</span>
                    عربي
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto px-6 sm:px-10 md:px-16 pt-2 md:pt-4 pb-8 md:pb-14 max-w-[1800px]">
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
              <Link href="/customize" className="bg-[#D96C7C]/70 hover:bg-[#D96C7C]/85 border border-white/60 backdrop-blur-lg text-white px-6 sm:px-7 py-3 rounded-full font-semibold transition shadow-[0_8px_24px_rgba(0,0,0,0.15)]">{t.hero.primary}</Link>
              <a href="#cakes" className="bg-white/55 hover:bg-white/70 border border-white/60 backdrop-blur-lg text-[#33221C] px-6 sm:px-7 py-3 rounded-full font-semibold transition">{t.hero.secondary}</a>
            </div>
          </div>
        </div>
      </section>

      <section id="cakes" className="group relative max-w-6xl mx-auto px-6 py-14">
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
          {cakeSlides.map((slide) => (
            <div
              key={slide.src}
              className="relative shrink-0 w-[70vw] sm:w-64 md:w-72 aspect-[9/16] snap-center rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(99,59,44,0.08)] bg-black"
            >
              <video className="h-full w-full object-cover" playsInline muted preload="metadata">
                <source src={slide.src} type="video/mp4" />
              </video>

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              <span className="absolute start-4 top-4 rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-xs font-bold text-white">
                {t.cakes.videoLabel}
              </span>
              <button
                type="button"
                onClick={() => openVideoGallery(slide.src)}
                aria-label={t.cakes.playVideo}
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/25 backdrop-blur-lg border border-white/50 shadow-lg transition-transform hover:scale-105">
                  <PlayIcon className="w-6 h-6 text-white ms-1" />
                </span>
              </button>

              <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-3">
                <h3 className="font-serif font-bold text-lg text-white">{t.cakes.featuredTitle}</h3>
                <Link
                  href="/customize"
                  className="w-full text-center bg-[#D96C7C]/70 hover:bg-[#D96C7C]/85 border border-white/60 backdrop-blur-lg text-white rounded-full px-4 py-2.5 font-semibold text-sm transition"
                >
                  {t.customizeThis}
                </Link>
              </div>
            </div>
          ))}

          <div className="relative shrink-0 w-[70vw] sm:w-64 md:w-72 aspect-[9/16] snap-center rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(99,59,44,0.08)] bg-[#F3C7CC]/40 flex flex-col items-center justify-center text-center p-5">
            <span className="text-[#D96C7C] text-6xl leading-none">+</span>
            <h3 className="font-serif font-bold text-xl mt-4">{lang === "ar" ? "صمّم تورتتك" : "Build Your Own Cake"}</h3>
            <p className="text-sm text-[#79665E] mt-2">
              {lang === "ar" ? "اختار كل تفصيلة بنفسك واعمل تورتة مخصوصة ليك." : "Choose every detail and build a cake made just for you."}
            </p>
            <Link href="/customize" className="w-full text-center mt-5 bg-[#D96C7C] text-white rounded-full py-2.5 px-4 font-semibold text-sm">
              {t.customizeThis}
            </Link>
          </div>
        </div>
      </section>

      {videoGalleryOpen && videoSlides[activeVideoIndex] && (
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
          <p className="text-white font-serif font-bold text-lg sm:text-xl mb-4 px-6 text-center">{t.cakes.featuredTitle}</p>
          <video
            key={videoSlides[activeVideoIndex].src}
            ref={galleryVideoRef}
            className="max-h-[75vh] max-w-full rounded-2xl"
            controls
            playsInline
          >
            <source src={videoSlides[activeVideoIndex].src} type="video/mp4" />
          </video>
        </div>
      )}

      <section id="about" className="max-w-2xl mx-auto px-6 py-14 text-center">
        <h2 className="text-3xl font-serif font-bold">{t.about.title}</h2>
        <p className="text-[#79665E] mt-4 leading-relaxed">{t.about.body}</p>
      </section>

      <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer"
        className="fixed bottom-6 end-6 bg-[#25D366] text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 font-semibold text-sm z-50">
        <WhatsAppIcon /> {t.whatsappFloat}
      </a>

      <footer className="bg-[#633B2C] text-[#F8EEE5] py-10 mt-6">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xl font-serif font-bold">{lang === "ar" ? "تورتا لاب" : "TORTA LAB"}</p>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <a href="#cakes">{t.nav.cakes}</a>
            <Link href="/customize">{t.nav.customize}</Link>
            <a href="#about">{t.nav.about}</a>
          </div>
          <p className="mt-4 text-sm opacity-80">+20 114 835 0515 · Instagram · Facebook</p>
          <p className="mt-2 text-xs opacity-60">© {new Date().getFullYear()} {lang === "ar" ? "تورتا لاب" : "TORTA LAB"}. {t.footer.rights}</p>
        </div>
      </footer>
    </div>
  );
}

function Logo({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col leading-none">
      <span className="text-2xl font-serif font-bold">{lang === "ar" ? "تورتا لاب" : "TORTA LAB"}</span>
      {lang === "ar" && (
        <span className="text-[11px] font-medium tracking-wide text-[#79665E] mt-0.5">TORTA LAB</span>
      )}
    </div>
  );
}

function UserMenu({ name, logoutLabel, onLogout }: { name: string; logoutLabel: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 md:gap-2 pe-1.5 ps-1 py-1 rounded-full hover:bg-[#F8EEE5] transition"
      >
        <span className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#D96C7C] text-white flex items-center justify-center text-xs md:text-sm font-semibold shrink-0">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden md:inline text-sm font-medium text-[#633B2C]">{name}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`text-[#633B2C] shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-40 bg-white border border-[#E8D8CC] rounded-xl shadow-lg overflow-hidden z-50">
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full text-start px-4 py-2.5 text-sm font-medium text-[#633B2C] hover:bg-[#F8EEE5] transition"
          >
            {logoutLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuIcon({ className = "text-[#633B2C]" }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

function CloseIcon({ className = "text-[#633B2C]" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5v14l11-7z" />
    </svg>
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
