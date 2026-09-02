"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { AdminUiProvider, useAdminUi } from "./admin-context";
import { adminT } from "./translations";
import AdminShell from "./admin-shell";

function Gate({ children }: { children: ReactNode }) {
  const { state, logout } = useAuth();
  const { lang, dir } = useAdminUi();
  const t = adminT[lang];
  const router = useRouter();

  useEffect(() => {
    if (state.status === "logged-out") {
      router.replace("/admin/login");
    }
  }, [state.status, router]);

  if (state.status === "loading" || state.status === "logged-out") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-[#79665E] text-sm">
        {t.loading}
      </div>
    );
  }

  if (state.user.role !== "admin") {
    return (
      <div dir={dir} lang={lang} className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white text-center px-6 font-sans">
        <h1 className="text-2xl font-serif font-bold text-[#33221C]">{t.forbidden.title}</h1>
        <p className="text-[#79665E]">{t.forbidden.body}</p>
        <Link href="/" className="text-[#D96C7C] font-semibold">{t.forbidden.home}</Link>
      </div>
    );
  }

  return (
    <AdminShell adminName={state.user.name} onLogout={logout}>
      {children}
    </AdminShell>
  );
}

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AdminUiProvider>
      <Gate>{children}</Gate>
    </AdminUiProvider>
  );
}
