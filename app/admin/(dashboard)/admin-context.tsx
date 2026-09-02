"use client";

import { ReactNode, createContext, useContext, useState } from "react";

export type Lang = "en" | "ar";

interface AdminUiContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  dir: "ltr" | "rtl";
}

const AdminUiContext = createContext<AdminUiContextValue | null>(null);

// Scoped to the admin shell so language selection persists while
// navigating between /admin and /admin/users (the layout doesn't
// remount on child-route navigation, unlike the buyer-facing pages
// which each own an independent lang useState).
export function AdminUiProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");
  const dir = lang === "ar" ? "rtl" : "ltr";
  return <AdminUiContext.Provider value={{ lang, setLang, dir }}>{children}</AdminUiContext.Provider>;
}

export function useAdminUi(): AdminUiContextValue {
  const ctx = useContext(AdminUiContext);
  if (!ctx) throw new Error("useAdminUi must be used within AdminUiProvider");
  return ctx;
}
