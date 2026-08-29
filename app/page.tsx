"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";

type Lang = "en" | "ar";

const T = {
  en: {
    nav: { home: "Home", cakes: "Cakes", customize: "Customize", about: "About", cta: "Customize Your Cake", signIn: "Sign In", signUp: "Sign Up", logout: "Logout" },
    hero: { title: "You Design It. We Bake It.", primary: "Build Your Cake", secondary: "Order a Ready Cake",
      trust: ["Fresh Ingredients", "Made to Order", "Custom Designs"] },
    cakes: {
      title: "Cakes We’ve Made",
      subtitle: "A look at cakes we’ve created, each one made fresh for a special celebration.",
      featuredTitle: "A Cake We Made",
      featuredDesc: "Watch this custom cake come to life, then create one made especially for your celebration.",
      videoLabel: "Video",
      playVideo: "Play video",
      previousSlide: "Previous slide",
      nextSlide: "Next slide",
    },
    about: { title: "About Us", body: "We're a small custom-cake studio that believes every celebration deserves something made just for it. Every cake is baked fresh, to order, with ingredients we trust." },
    whatsappFloat: "WhatsApp Now",
    footer: { rights: "All rights reserved." },
    customizeThis: "Customize This Cake",
  },
  ar: {
    nav: { home: "الرئيسية", cakes: "التورت", customize: "صمّم تورتتك", about: "من نحن", cta: "صمّم تورتتك", signIn: "تسجيل الدخول", signUp: "صمّم حسابك", logout: "تسجيل الخروج" },
    hero: { title: "إنت تصمّمها، وإحنا نخبزها.", primary: "ابدأ تصميم تورتتك", secondary: "اطلب تورت جاهزة",
      trust: ["مكونات طازجة", "تتعمل عند الطلب", "تصميم حسب اختيارك"] },
    cakes: {
      title: "تورتات عملناها",
      subtitle: "شوف بعض التورتات اللي عملناها فريش مخصوص لمناسبات مميزة.",
      featuredTitle: "تورتة من شغلنا",
      featuredDesc: "شوف التورتة دي وهي بتتعمل، وبعدها صمّم تورتة معمولة مخصوص لمناسبتك.",
      videoLabel: "فيديو",
      playVideo: "شغّل الفيديو",
      previousSlide: "الصورة السابقة",
      nextSlide: "الصورة التالية",
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
  const [activeCakeSlide, setActiveCakeSlide] = useState(0);
  const [isCakeVideoPlaying, setIsCakeVideoPlaying] = useState(false);
  const cakeVideoRef = useRef<HTMLVideoElement>(null);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = T[lang];
  const { state, logout } = useAuth();
  const cakeSlides = [
    { type: "image", src: "/assets/cake-made-1.jpg" },
    { type: "image", src: "/assets/cake-made-2.jpg" },
    { type: "video", src: "/assets/cake-we-made.mp4" },
  ] as const;

  const showCakeSlide = (index: number) => {
    cakeVideoRef.current?.pause();
    setIsCakeVideoPlaying(false);
    setActiveCakeSlide((index + cakeSlides.length) % cakeSlides.length);
  };

  const playCakeVideo = () => {
    void cakeVideoRef.current?.play();
  };

  return (
    <div dir={dir} lang={lang} className="bg-[#FFF9F3] text-[#33221C] min-h-screen font-sans">
      <nav className="sticky top-0 z-50 bg-[#FFF9F3]/95 backdrop-blur border-b border-[#E8D8CC]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="text-2xl font-serif font-bold">{lang === "ar" ? "تورتا لاب" : "TORTA LAB"}</span>
          <div className="hidden md:flex gap-8 text-sm font-medium">
            <a href="#" className="hover:text-[#D96C7C]">{t.nav.home}</a>
            <a href="#cakes" className="hover:text-[#D96C7C]">{t.nav.cakes}</a>
            <Link href="/customize" className="hover:text-[#D96C7C]">{t.nav.customize}</Link>
            <a href="#about" className="hover:text-[#D96C7C]">{t.nav.about}</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/customize" className="hidden md:inline-block bg-[#D96C7C] hover:bg-[#C55769] text-white px-5 py-2 rounded-full text-sm font-semibold transition">{t.nav.cta}</Link>
            {state.status === "logged-in" && (
              <div className="hidden md:flex items-center gap-3">
                <span className="text-sm font-medium text-[#633B2C]">{state.user.name}</span>
                <button onClick={() => logout()} className="border border-[#633B2C] text-[#633B2C] px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#F8EEE5] transition">{t.nav.logout}</button>
              </div>
            )}
            {state.status === "logged-out" && (
              <div className="hidden md:flex items-center gap-3">
                <Link href="/sign-in" className="border border-[#633B2C] text-[#633B2C] px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#F8EEE5] transition">{t.nav.signIn}</Link>
                <Link href="/sign-up" className="bg-[#D96C7C] hover:bg-[#C55769] text-white px-5 py-2 rounded-full text-sm font-semibold transition">{t.nav.signUp}</Link>
              </div>
            )}
            <div className="flex items-center bg-[#F8EEE5] border border-[#E8D8CC] rounded-full p-1">
              <button onClick={() => setLang("en")} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${lang === "en" ? "bg-[#D96C7C] text-white shadow-sm" : "text-[#79665E]"}`}>EN</button>
              <button onClick={() => setLang("ar")} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${lang === "ar" ? "bg-[#D96C7C] text-white shadow-sm" : "text-[#79665E]"}`}>AR</button>
            </div>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div className="text-center md:text-start">
          <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight whitespace-normal">{t.hero.title}</h1>
          <div className="flex flex-wrap justify-center gap-4 mt-8 md:justify-start">
            <Link href="/customize" className="bg-[#D96C7C] hover:bg-[#C55769] text-white px-7 py-3 rounded-full font-semibold transition">{t.hero.primary}</Link>
            <a href="#cakes" className="border border-[#633B2C] text-[#633B2C] px-7 py-3 rounded-full font-semibold hover:bg-[#F8EEE5] transition">{t.hero.secondary}</a>
          </div>
          <div className="mt-8 flex flex-row items-center justify-center gap-2 overflow-x-auto pb-1 md:justify-start md:flex-wrap md:gap-3">
            {t.hero.trust.map((item) => (
              <span key={item} className="flex shrink-0 items-center gap-1.5 text-[#633B2C] text-[12px] font-medium leading-none md:bg-[#F3C7CC]/40 md:px-4 md:py-2 md:rounded-full md:text-sm md:shrink">
                <span className="w-3.5 h-3.5 shrink-0 rounded-full bg-[#D96C7C] text-white flex items-center justify-center text-[9px] md:w-4 md:h-4 md:text-[10px]">✓</span>
                <span className="whitespace-nowrap">{item}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-[#F8EEE5] aspect-square overflow-hidden hidden md:block">
          <picture>
            {/* Desktop-only source: only requested on viewports >= 768px */}
            <source media="(min-width:768px)" srcSet="/assets/hero-cake.jpg" />
            {/* Mobile fallback is a tiny inline SVG placeholder to avoid downloading the large image */}
            <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'><rect width='600' height='600' fill='%23F8EEE5'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='18' fill='%23666'>TORTA LAB</text></svg>" alt="Hero image" className="w-full h-full object-cover" />
          </picture>
        </div>
      </section>

      <section id="cakes" className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="text-3xl font-serif font-bold text-center">{t.cakes.title}</h2>
        <p className="text-center text-[#79665E] mt-3 max-w-xl mx-auto">{t.cakes.subtitle}</p>
        <div className="grid max-w-4xl mx-auto sm:grid-cols-2 gap-8 mt-10">
          <div className="bg-[#FFFCF8] rounded-3xl shadow-[0_4px_20px_rgba(99,59,44,0.08)] flex flex-col overflow-hidden">
            <div className="relative h-[28rem] sm:h-[32rem] overflow-hidden bg-black">
              {cakeSlides.map((slide, index) => (
                <div
                  key={slide.src}
                  aria-hidden={activeCakeSlide !== index}
                  className={`absolute inset-0 transition-opacity duration-300 ${
                    activeCakeSlide === index
                      ? "z-10 opacity-100"
                      : "pointer-events-none opacity-0"
                  }`}
                >
                  {slide.type === "image" ? (
                    <Image
                      src={slide.src}
                      alt={`${t.cakes.featuredTitle} ${index + 1}`}
                      fill
                      sizes="(min-width: 640px) 28rem, 100vw"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <>
                      <video
                        ref={cakeVideoRef}
                        aria-label={t.cakes.featuredTitle}
                        className="cake-reel h-full w-full object-cover"
                        controls={isCakeVideoPlaying}
                        playsInline
                        preload="metadata"
                        onPlay={() => setIsCakeVideoPlaying(true)}
                        onPause={() => setIsCakeVideoPlaying(false)}
                        onEnded={() => setIsCakeVideoPlaying(false)}
                      >
                        <source src={slide.src} type="video/mp4" />
                      </video>
                      {!isCakeVideoPlaying && (
                        <button
                          type="button"
                          onClick={playCakeVideo}
                          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/20 text-white"
                          aria-label={t.cakes.playVideo}
                        >
                          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-2xl text-[#D96C7C] shadow-lg transition-transform hover:scale-105">
                            <span className="translate-x-0.5">▶</span>
                          </span>
                          <span className="rounded-full bg-black/60 px-4 py-2 text-sm font-semibold">
                            {t.cakes.playVideo}
                          </span>
                        </button>
                      )}
                      <span className="absolute start-4 top-4 rounded-full bg-[#D96C7C] px-3 py-1 text-xs font-bold text-white shadow-sm">
                        {t.cakes.videoLabel}
                      </span>
                    </>
                  )}
                </div>
              ))}

              {!isCakeVideoPlaying && (
                <>
                  <button
                    type="button"
                    onClick={() => showCakeSlide(activeCakeSlide - 1)}
                    aria-label={t.cakes.previousSlide}
                    className="absolute start-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-[#633B2C] shadow-md"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => showCakeSlide(activeCakeSlide + 1)}
                    aria-label={t.cakes.nextSlide}
                    className="absolute end-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-[#633B2C] shadow-md"
                  >
                    ›
                  </button>
                  <div className="absolute bottom-4 start-1/2 z-20 flex -translate-x-1/2 gap-2" dir="ltr">
                    {cakeSlides.map((slide, index) => (
                      <button
                        key={slide.src}
                        type="button"
                        onClick={() => showCakeSlide(index)}
                        aria-label={`${t.cakes.featuredTitle} ${index + 1}`}
                        className={`h-2.5 rounded-full shadow transition-all ${
                          activeCakeSlide === index
                            ? "w-7 bg-[#D96C7C]"
                            : "w-2.5 bg-white/90"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="p-6 flex flex-col flex-1">
              <h3 className="font-serif font-bold text-xl">{t.cakes.featuredTitle}</h3>
              <p className="text-sm text-[#79665E] mt-2 flex-1">{t.cakes.featuredDesc}</p>
              <Link href="/customize" className="mt-5 bg-[#D96C7C] text-white rounded-full py-2.5 flex items-center justify-center font-semibold text-sm">
                {t.customizeThis}
              </Link>
            </div>
          </div>
          <div className="bg-[#FFFCF8] rounded-3xl shadow-[0_4px_20px_rgba(99,59,44,0.08)] flex flex-col overflow-hidden">
            <div className="h-[28rem] sm:h-[32rem] bg-[#F3C7CC]/40 flex items-center justify-center text-[#D96C7C] text-6xl">+</div>
            <div className="p-6 flex flex-col flex-1">
              <h3 className="font-serif font-bold text-xl">{lang === "ar" ? "صمّم تورتتك" : "Build Your Own Cake"}</h3>
              <p className="text-sm text-[#79665E] mt-2 flex-1">
                {lang === "ar" ? "اختار كل تفصيلة بنفسك واعمل تورتة مخصوصة ليك." : "Choose every detail and build a cake made just for you."}
              </p>
              <Link href="/customize" className="mt-5 bg-[#D96C7C] text-white rounded-full py-2.5 flex items-center justify-center font-semibold text-sm">
                {t.customizeThis}
              </Link>
            </div>
          </div>
        </div>
      </section>

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

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.2-.1-.4-.1-.6.1-.2.2-.6.9-.8 1-.1.2-.3.2-.5.1-1.5-.7-2.5-1.3-3.5-3-.1-.2 0-.4.1-.5l.5-.6c.1-.2.1-.4 0-.5-.1-.2-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9 1-.9 2.3 0 1.4 1 2.7 1.2 2.9.2.2 1.9 3 4.7 4.1 2.3.9 2.8.7 3.3.7.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3z" />
      <path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.5 5.3L2 22l4.9-1.3C8.4 21.5 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.6 0-3.2-.4-4.5-1.2l-.3-.2-3.1.8.8-3-.2-.3C3.9 14.9 3.4 13.5 3.4 12 3.4 7.3 7.3 3.4 12 3.4s8.6 3.9 8.6 8.6-3.9 8.6-8.6 8.6z" />
    </svg>
  );
}
