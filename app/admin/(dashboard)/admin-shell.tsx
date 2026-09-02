"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminUi } from "./admin-context";
import { adminT } from "./translations";

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17.5" cy="9" r="2.4" />
      <path d="M15.7 14.3c2.4.3 4.3 2.5 4.3 5.2" />
    </svg>
  );
}

function CakeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M4 21v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" />
      <path d="M2 21h20" />
      <path d="M7 12V8a5 5 0 0 1 10 0v4" />
      <path d="M12 8V3" />
      <path d="M9.5 4.5c1-1.2 4-1.2 5 0" />
    </svg>
  );
}

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { lang } = useAdminUi();
  const t = adminT[lang];

  const links = [
    { href: "/admin", label: t.nav.dashboard, icon: <DashboardIcon />, active: pathname === "/admin" },
    { href: "/admin/users", label: t.nav.users, icon: <UsersIcon />, active: pathname?.startsWith("/admin/users") },
    { href: "/admin/baked-cakes", label: t.nav.bakedCakes, icon: <CakeIcon />, active: pathname?.startsWith("/admin/baked-cakes") },
  ];

  return (
    <nav className="flex flex-col gap-1 px-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
            link.active ? "bg-[#F8EEE5] text-[#633B2C]" : "text-[#79665E] hover:bg-[#F8EEE5]/60 hover:text-[#633B2C]"
          }`}
        >
          {link.icon}
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default function AdminShell({
  adminName,
  onLogout,
  children,
}: {
  adminName: string;
  onLogout: () => Promise<void>;
  children: ReactNode;
}) {
  const { lang, setLang, dir } = useAdminUi();
  const t = adminT[lang];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div dir={dir} lang={lang} className="min-h-screen bg-white text-[#33221C] font-sans md:flex">
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-e md:border-[#E8D8CC] md:py-6">
        <div className="px-5 pb-6">
          <span className="text-xl font-serif font-bold">{lang === "ar" ? "تورتا لاب" : "TORTA LAB"}</span>
          <span className="block text-xs font-semibold text-[#D96C7C] mt-1">{t.topbar.badge}</span>
        </div>
        <SidebarLinks />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={t.close}
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 w-72 max-w-[80vw] bg-white shadow-xl flex flex-col py-6">
            <div className="flex items-center justify-between px-5 pb-6">
              <div>
                <span className="text-xl font-serif font-bold">{lang === "ar" ? "تورتا لاب" : "TORTA LAB"}</span>
                <span className="block text-xs font-semibold text-[#D96C7C] mt-1">{t.topbar.badge}</span>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label={t.close}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F8EEE5] transition"
              >
                <CloseIcon />
              </button>
            </div>
            <SidebarLinks onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E8D8CC]">
          <div className="flex items-center justify-between gap-3 px-4 md:px-8 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileNavOpen(true)}
                aria-label={t.nav.dashboard}
                className="flex md:hidden items-center justify-center w-9 h-9 rounded-full hover:bg-[#F8EEE5] transition"
              >
                <MenuIcon />
              </button>
              <span className="font-serif font-bold text-lg md:hidden">{lang === "ar" ? "تورتا لاب" : "TORTA LAB"}</span>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                className="text-sm font-medium text-[#633B2C] hover:text-[#79665E] transition"
              >
                {lang === "ar" ? "EN" : "عربي"}
              </button>
              <span className="hidden sm:inline text-sm font-medium text-[#633B2C]">{adminName}</span>
              <button
                onClick={() => void onLogout()}
                className="border border-[#633B2C]/50 text-[#633B2C] px-3 py-1.5 rounded-full text-xs md:text-sm font-medium hover:bg-[#F8EEE5] transition whitespace-nowrap"
              >
                {t.topbar.logout}
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 md:px-8 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
