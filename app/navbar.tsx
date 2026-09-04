"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { PUBLIC_CONTAINER_CLASS } from "./container";

export type Lang = "en" | "ar";

const NAV_T = {
  en: { home: "Home", cakes: "Our Work", customize: "Customize", about: "About", signIn: "Sign In", signUp: "Sign Up", logout: "Logout", menu: "Open menu", closeMenu: "Close menu" },
  ar: { home: "الرئيسية", cakes: "شغلنا", customize: "صمّم تورتتك", about: "من نحن", signIn: "تسجيل دخول", signUp: "إنشاء حساب", logout: "تسجيل الخروج", menu: "افتح القائمة", closeMenu: "اغلق القائمة" },
};

export function CloseIcon({ className = "text-[#633B2C]" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
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

function Logo({ lang }: { lang: Lang }) {
  return (
    <Link href="/" className="flex flex-col leading-none">
      <span className="text-2xl font-serif font-bold">{lang === "ar" ? "تورتا لاب" : "TORTA LAB"}</span>
      {lang === "ar" && (
        <span className="text-[11px] font-medium tracking-wide text-[#79665E] mt-0.5">TORTA LAB</span>
      )}
    </Link>
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

// The one shared header for every public customer-facing page (homepage,
// /customize, ...). "Our Work" and "About" are homepage sections, so from
// another page they route to "/#cakes" / "/#about" — Next's Link still
// does a soft client-side navigation there and then lets the browser
// scroll to the anchor, so this works identically whether you're already
// on "/" or coming from elsewhere.
export function PublicNavbar({ lang, onLangChange }: { lang: Lang; onLangChange: (lang: Lang) => void }) {
  const t = NAV_T[lang];
  const { state, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-[#E8D8CC]">
        <div className={`flex items-center justify-between py-4 ${PUBLIC_CONTAINER_CLASS}`}>
          <div className="flex-1 flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t.menu}
              className="flex md:hidden items-center justify-center w-9 h-9 rounded-full hover:bg-[#F8EEE5] transition -ms-1.5"
            >
              <MenuIcon />
            </button>
            <Logo lang={lang} />
          </div>

          <div className="hidden md:flex gap-8 text-sm font-medium text-[#633B2C]">
            <Link href="/" className="hover:text-[#D96C7C] transition-colors">{t.home}</Link>
            <Link href="/#cakes" className="hover:text-[#D96C7C] transition-colors">{t.cakes}</Link>
            <Link href="/customize?new=1" className="hover:text-[#D96C7C] transition-colors">{t.customize}</Link>
            <Link href="/#about" className="hover:text-[#D96C7C] transition-colors">{t.about}</Link>
          </div>

          <div className="flex-1 flex items-center justify-end gap-2 md:gap-3">
            <button
              onClick={() => onLangChange(lang === "ar" ? "en" : "ar")}
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
              <UserMenu name={state.user.name} logoutLabel={t.logout} onLogout={() => logout()} />
            )}
            {state.status !== "logged-in" && (
              <div className="flex items-center gap-2 md:gap-3">
                <Link href="/sign-in" className="border border-[#633B2C]/50 text-[#633B2C] px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium hover:bg-[#F8EEE5] transition whitespace-nowrap">{t.signIn}</Link>
                <Link href="/sign-up" className="bg-[#D96C7C] hover:bg-[#C55769] text-white px-3.5 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition whitespace-nowrap">{t.signUp}</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={t.closeMenu}
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 w-72 max-w-[80vw] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8D8CC]">
              <Logo lang={lang} />
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label={t.closeMenu}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F8EEE5] transition"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="flex flex-col px-5 py-4 text-[#633B2C] font-medium">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="py-3 border-b border-[#F3EAE0]">{t.home}</Link>
              <Link href="/#cakes" onClick={() => setMobileMenuOpen(false)} className="py-3 border-b border-[#F3EAE0]">{t.cakes}</Link>
              <Link href="/customize?new=1" onClick={() => setMobileMenuOpen(false)} className="py-3 border-b border-[#F3EAE0]">{t.customize}</Link>
              <Link href="/#about" onClick={() => setMobileMenuOpen(false)} className="py-3">{t.about}</Link>
            </nav>
            <div className="mt-auto px-5 py-5 border-t border-[#E8D8CC] flex items-center justify-center">
              <button
                onClick={() => onLangChange(lang === "ar" ? "en" : "ar")}
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
    </>
  );
}
