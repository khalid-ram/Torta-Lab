"use client";
import { useState } from "react";

type Lang = "en" | "ar";

const T = {
  en: {
    nav: { home: "Home", cakes: "Cakes", customize: "Customize", about: "About", cta: "Customize Your Cake" },
    hero: { title: "You Design It. We Bake It.", primary: "Build Your Cake", secondary: "Order a Ready Cake",
      trust: ["Fresh Ingredients", "Made to Order", "Custom Designs"] },
    cakes: { title: "Our Cakes", subtitle: "Ready-made designs you can order anytime, baked fresh the moment you order." },
    about: { title: "About Us", body: "We're a small custom-cake studio that believes every celebration deserves something made just for it. Every cake is baked fresh, to order, with ingredients we trust." },
    whatsappFloat: "WhatsApp Now",
    footer: { rights: "All rights reserved." },
    orderNow: "Order Now",
    customizeThis: "Customize This Cake",
    startingFrom: "Starting from",
    egp: "EGP",
    cards: [
      { name: "Choco Fruit Fusion", desc: "Rich chocolate with refreshing fruit and a creamy finish, bringing different flavors together in every slice.", size: "Medium, 20 cm", price: 750, img: "/assets/choco-fruit-fusion.webp" },
      { name: "Chocolate Berry Bliss", desc: "Rich chocolate cake with a smooth chocolate finish and a fresh berry touch.", size: "Medium, 20 cm", price: 850, img: "/assets/choclate-torta.webp" },
      { name: "Peach & Cream Dream", desc: "Light and fluffy cream cake topped with juicy peaches for a fresh, delicate finish.", size: "Medium, 20 cm", price: 700, img: "/assets/torta-cream-1.jpg" },
    ],
  },
  ar: {
    nav: { home: "الرئيسية", cakes: "التورت", customize: "صمّم تورتتك", about: "من نحن", cta: "صمّم تورتتك" },
    hero: { title: "إنت تصمّمها، وإحنا نخبزها.", primary: "ابدأ تصميم تورتتك", secondary: "اطلب تورت جاهزة",
      trust: ["مكونات طازجة", "تتعمل عند الطلب", "تصميم حسب اختيارك"] },
    cakes: { title: "تورتنا", subtitle: "أشكال جاهزة للطلب في أي وقت، وبتتعمل فريش عند الطلب." },
    about: { title: "من نحن", body: "إحنا استوديو تورت مخصص بنؤمن إن كل مناسبة تستحق حاجة معمولة مخصوص ليها. كل تورتة بتتعمل فريش عند الطلب، بمكونات بنثق فيها." },
    whatsappFloat: "واتساب الان",
    footer: { rights: "جميع الحقوق محفوظة." },
    orderNow: "اطلب الآن",
    customizeThis: "صمّم حاجة شبهها",
    startingFrom: "تبدأ من",
    egp: "ج.م",
    cards: [
      { name: "مكس الشوكولاتة والفواكه", desc: "شوكولاتة غنية مع فواكه منعشة ولمسة كريمية، مزيج مميز لمحبي أكتر من طعم.", size: "متوسط، حوالي 20 سم", price: 750, img: "/assets/choco-fruit-fusion.webp" },
      { name: "شوكولاتة بيري", desc: "تورتة شوكولاتة غنية بطبقة شوكولاتة ناعمة ولمسة من التوت المنعش.", size: "متوسط، حوالي 20 سم", price: 850, img: "/assets/choclate-torta.webp" },
      { name: "بيتش آند كريم", desc: "تورتة كريمة خفيفة وناعمة مزينة بالخوخ، بطعم بسيط ومنعش يناسب كل مناسبة.", size: "متوسط، حوالي 20 سم", price: 700, img: "/assets/torta-cream-1.jpg" },
    ],
  },
};

const WHATSAPP_NUMBER = "201148350515";

export default function Home() {
  const [lang, setLang] = useState<Lang>("ar");
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = T[lang];

  const orderCakeUrl = (name: string, price: number) => {
    const msg = lang === "ar"
      ? `مرحبًا 👋\nأريد طلب: ${name}\nالسعر: ${price} ج.م\nمن فضلك أخبرني بالتوفر.`
      : `Hello 👋\nI'd like to order: ${name}\nPrice: ${price} EGP\nPlease confirm availability.`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div dir={dir} lang={lang} className="bg-[#FFF9F3] text-[#33221C] min-h-screen font-sans">
      <nav className="sticky top-0 z-50 bg-[#FFF9F3]/95 backdrop-blur border-b border-[#E8D8CC]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="text-2xl font-serif font-bold">TORTA LAB</span>
          <div className="hidden md:flex gap-8 text-sm font-medium">
            <a href="#" className="hover:text-[#D96C7C]">{t.nav.home}</a>
            <a href="#cakes" className="hover:text-[#D96C7C]">{t.nav.cakes}</a>
            <a href="/customize" className="hover:text-[#D96C7C]">{t.nav.customize}</a>
            <a href="#about" className="hover:text-[#D96C7C]">{t.nav.about}</a>
          </div>
          <div className="flex items-center gap-4">
            <a href="/customize" className="hidden md:inline-block bg-[#D96C7C] hover:bg-[#C55769] text-white px-5 py-2 rounded-full text-sm font-semibold transition">{t.nav.cta}</a>
            <div className="flex items-center bg-[#F8EEE5] border border-[#E8D8CC] rounded-full p-1">
              <button onClick={() => setLang("en")} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${lang === "en" ? "bg-[#D96C7C] text-white shadow-sm" : "text-[#79665E]"}`}>EN</button>
              <button onClick={() => setLang("ar")} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${lang === "ar" ? "bg-[#D96C7C] text-white shadow-sm" : "text-[#79665E]"}`}>AR</button>
            </div>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight whitespace-nowrap md:whitespace-normal">{t.hero.title}</h1>
          <div className="flex flex-wrap gap-4 mt-8">
            <a href="/customize" className="bg-[#D96C7C] hover:bg-[#C55769] text-white px-7 py-3 rounded-full font-semibold transition">{t.hero.primary}</a>
            <a href="#cakes" className="border border-[#633B2C] text-[#633B2C] px-7 py-3 rounded-full font-semibold hover:bg-[#F8EEE5] transition">{t.hero.secondary}</a>
          </div>
          <div className="flex flex-wrap gap-3 mt-8">
            {t.hero.trust.map((item) => (
              <span key={item} className="flex items-center gap-2 bg-[#F3C7CC]/40 text-[#633B2C] text-sm font-medium px-4 py-2 rounded-full">
                <span className="w-4 h-4 rounded-full bg-[#D96C7C] text-white flex items-center justify-center text-[10px]">✓</span>
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-[#F8EEE5] aspect-square overflow-hidden">
          <img src="/assets/hero-cake.jpg" alt="" className="w-full h-full object-cover" />
        </div>
      </section>

      <section id="cakes" className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="text-3xl font-serif font-bold text-center">{t.cakes.title}</h2>
        <p className="text-center text-[#79665E] mt-3 max-w-xl mx-auto">{t.cakes.subtitle}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {t.cards.map((c) => (
            <div key={c.name} className="bg-[#FFFCF8] rounded-3xl shadow-[0_4px_20px_rgba(99,59,44,0.08)] flex flex-col overflow-hidden">
              <div className="relative aspect-[4/3] bg-[#F8EEE5]">
                <img src={c.img} alt={c.name} className="w-full h-full object-cover" />
                <span className="absolute top-3 start-3 bg-white/90 text-xs font-semibold px-3 py-1 rounded-full">{c.size}</span>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-serif font-bold text-lg">{c.name}</h3>
                <p className="text-sm text-[#79665E] mt-2 flex-1">{c.desc}</p>
                <p className="text-sm font-semibold text-[#633B2C] mt-3">{t.startingFrom} {c.price} {t.egp}</p>
                <a href={orderCakeUrl(c.name, c.price)} target="_blank" rel="noreferrer"
                  className="mt-4 bg-[#25D366] text-white rounded-full py-2.5 flex items-center justify-center gap-2 font-semibold text-sm">
                  <WhatsAppIcon /> {t.orderNow}
                </a>
              </div>
            </div>
          ))}
          <div className="bg-[#FFFCF8] rounded-3xl shadow-[0_4px_20px_rgba(99,59,44,0.08)] flex flex-col overflow-hidden">
            <div className="aspect-[4/3] bg-[#F3C7CC]/40 flex items-center justify-center text-[#D96C7C] text-4xl">+</div>
            <div className="p-5 flex flex-col flex-1">
              <h3 className="font-serif font-bold text-lg">{lang === "ar" ? "صمّم تورتتك" : "Build Your Own Cake"}</h3>
              <p className="text-sm text-[#79665E] mt-2 flex-1">
                {lang === "ar" ? "اختار كل تفصيلة بنفسك واعمل تورتة مخصوصة ليك." : "Choose every detail and build a cake made just for you."}
              </p>
              <a href="/customize" className="mt-4 bg-[#D96C7C] text-white rounded-full py-2.5 flex items-center justify-center font-semibold text-sm">
                {t.customizeThis}
              </a>
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
          <p className="text-xl font-serif font-bold">TORTA LAB</p>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <a href="#cakes">{t.nav.cakes}</a>
            <a href="/customize">{t.nav.customize}</a>
            <a href="#about">{t.nav.about}</a>
          </div>
          <p className="mt-4 text-sm opacity-80">+20 114 835 0515 · Instagram · Facebook</p>
          <p className="mt-2 text-xs opacity-60">© {new Date().getFullYear()} TORTA LAB. {t.footer.rights}</p>
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
