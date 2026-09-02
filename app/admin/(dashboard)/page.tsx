"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { useAdminUi } from "./admin-context";
import { adminT } from "./translations";

export default function AdminDashboardPage() {
  const { state } = useAuth();
  const { lang } = useAdminUi();
  const t = adminT[lang];

  const adminName = state.status === "logged-in" ? state.user.name : "";

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-[#33221C]">
        {t.dashboard.welcome}, {adminName}
      </h1>

      <div className="mt-8 max-w-sm bg-[#FFFCF8] border border-[#E8D8CC] rounded-2xl p-6">
        <h2 className="font-serif font-bold text-lg text-[#33221C]">{t.dashboard.manageTitle}</h2>
        <p className="text-sm text-[#79665E] mt-2">{t.dashboard.manageDesc}</p>
        <Link
          href="/admin/users"
          className="inline-block mt-5 bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full px-5 py-2.5 font-semibold text-sm transition"
        >
          {t.dashboard.manageCta}
        </Link>
      </div>
    </div>
  );
}
