"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useAdminUi, type Lang } from "./admin-context";
import { adminT } from "./translations";
import * as api from "@/lib/api/analytics";

function formatActiveTime(totalSeconds: number, lang: Lang): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const sUnit = lang === "ar" ? "ث" : "s";
  const mUnit = lang === "ar" ? "د" : "m";
  if (s < 60) return `${s}${sUnit}`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}${mUnit} ${rem}${sUnit}` : `${m}${mUnit}`;
}

function formatPercent(n: number): string {
  return `${n % 1 === 0 ? n : n.toFixed(1)}%`;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#FFFCF8] border border-[#E8D8CC] rounded-2xl p-5">
      <p className="text-sm text-[#79665E]">{label}</p>
      <p className="mt-1.5 text-2xl font-serif font-bold text-[#33221C]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#A08D80]">{sub}</p>}
    </div>
  );
}

const DONUT_COLORS = ["#D96C7C", "#79665E"];

function Donut({ segments, size = 88, thickness = 14 }: { segments: { value: number; color: string }[]; size?: number; thickness?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const holeSize = size - thickness * 2;

  let background = "#F0ECE7";
  if (total > 0) {
    let cumulative = 0;
    const stops = segments.map((seg) => {
      const startPct = (cumulative / total) * 100;
      cumulative += seg.value;
      const endPct = (cumulative / total) * 100;
      return `${seg.color} ${startPct}% ${endPct}%`;
    });
    background = `conic-gradient(${stops.join(", ")})`;
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size, borderRadius: "9999px", background }}>
      <div
        className="absolute inset-0 m-auto rounded-full bg-[#FFFCF8] flex items-center justify-center"
        style={{ width: holeSize, height: holeSize }}
      >
        <span className="text-lg font-serif font-bold text-[#33221C]">{total}</span>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[#79665E]">{label}</span>
      <span className="font-semibold text-[#33221C]">{value}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { state } = useAuth();
  const { lang, dir } = useAdminUi();
  const t = adminT[lang];

  const adminName = state.status === "logged-in" ? state.user.name : "";

  const [period, setPeriod] = useState<api.AnalyticsPeriod>("last30");
  const [customFrom, setCustomFrom] = useState(todayDateString());
  const [customTo, setCustomTo] = useState(todayDateString());
  const [overview, setOverview] = useState<api.AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchOverview = useCallback(async (p: api.AnalyticsPeriod, from?: string, to?: string) => {
    setLoading(true);
    setError(false);
    try {
      const data = await api.getOverview(p === "custom" ? { period: p, from, to } : { period: p });
      setOverview(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (period === "custom") return; // custom range only refetches on explicit Apply
    fetchOverview(period);
  }, [period, fetchOverview]);

  function handleApplyCustom() {
    fetchOverview("custom", customFrom, customTo);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#33221C]">{t.dashboard.title}</h1>
          <p className="mt-1 text-sm text-[#79665E]">
            {t.dashboard.welcome}, {adminName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as api.AnalyticsPeriod)}
              className="appearance-none border border-[#E8D8CC] rounded-xl ps-3 pe-8 py-2.5 text-sm bg-white text-[#33221C]"
            >
              <option value="today">{t.dashboard.filter.today}</option>
              <option value="last7">{t.dashboard.filter.last7}</option>
              <option value="last30">{t.dashboard.filter.last30}</option>
              <option value="custom">{t.dashboard.filter.custom}</option>
            </select>
          </div>

          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-sm text-[#79665E]">
                {t.dashboard.filter.from}
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="border border-[#E8D8CC] rounded-xl px-2.5 py-2 text-sm bg-white text-[#33221C]"
                />
              </label>
              <label className="flex items-center gap-1.5 text-sm text-[#79665E]">
                {t.dashboard.filter.to}
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={todayDateString()}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="border border-[#E8D8CC] rounded-xl px-2.5 py-2 text-sm bg-white text-[#33221C]"
                />
              </label>
              <button
                type="button"
                onClick={handleApplyCustom}
                className="bg-[#D96C7C] hover:bg-[#C55769] text-white rounded-full px-4 py-2 font-semibold text-sm transition"
              >
                {t.dashboard.filter.apply}
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && <p className="mt-8 text-sm text-[#79665E]">{t.loading}</p>}

      {!loading && error && <p className="mt-8 text-sm text-[#C55769]">{t.dashboard.loadError}</p>}

      {!loading && !error && overview && (
        <div className="mt-8 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label={t.dashboard.kpi.totalSessions} value={String(overview.sessions.total)} />
            <KpiCard
              label={t.dashboard.kpi.engagedSessions}
              value={String(overview.sessions.engaged.count)}
              sub={`${formatPercent(overview.sessions.engaged.percent)} ${t.dashboard.kpi.ofSessions}`}
            />
            <KpiCard
              label={t.dashboard.kpi.bouncedSessions}
              value={String(overview.sessions.bounced.count)}
              sub={`${formatPercent(overview.sessions.bounced.percent)} ${t.dashboard.kpi.ofSessions}`}
            />
            <KpiCard label={t.dashboard.kpi.avgActiveTime} value={formatActiveTime(overview.sessions.avgActiveSeconds, lang)} />
          </div>

          <div>
            <h2 className="font-serif font-bold text-lg text-[#33221C]">{t.dashboard.funnel.title}</h2>
            <div className="mt-4 bg-[#FFFCF8] border border-[#E8D8CC] rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row items-stretch gap-4">
                <div className="flex-1">
                  <p className="text-sm text-[#79665E]">{t.dashboard.funnel.customizeClicked}</p>
                  <p className="mt-1 text-2xl font-serif font-bold text-[#33221C]">{overview.funnel.customizeClicked}</p>
                </div>
                <div className="flex items-center justify-center text-[#A08D80]" aria-hidden="true">
                  {dir === "rtl" ? "←" : "→"}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#79665E]">{t.dashboard.funnel.completed}</p>
                  <p className="mt-1 text-2xl font-serif font-bold text-[#33221C]">{overview.funnel.completed}</p>
                  <p className="mt-1 text-xs text-[#A08D80]">
                    {formatPercent(overview.funnel.completionRate)} {t.dashboard.funnel.completionRate.toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center justify-center text-[#A08D80]" aria-hidden="true">
                  {dir === "rtl" ? "←" : "→"}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#79665E]">{t.dashboard.funnel.whatsappOrders}</p>
                  <p className="mt-1 text-2xl font-serif font-bold text-[#33221C]">{overview.funnel.whatsappOrders}</p>
                  <p className="mt-1 text-xs text-[#A08D80]">
                    {formatPercent(overview.funnel.conversionRate)} {t.dashboard.funnel.overallConversion}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-serif font-bold text-lg text-[#33221C]">{t.dashboard.business.title}</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#FFFCF8] border border-[#E8D8CC] rounded-2xl p-5">
                <p className="text-sm text-[#79665E]">{t.dashboard.business.registeredUsers}</p>
                <div className="mt-3 flex items-center gap-5">
                  <Donut
                    segments={[
                      { value: overview.business.users.buyers, color: DONUT_COLORS[0] },
                      { value: overview.business.users.admins, color: DONUT_COLORS[1] },
                    ]}
                  />
                  <div className="space-y-1.5">
                    <LegendRow color={DONUT_COLORS[0]} label={t.dashboard.business.buyers} value={overview.business.users.buyers} />
                    <LegendRow color={DONUT_COLORS[1]} label={t.dashboard.business.admins} value={overview.business.users.admins} />
                  </div>
                </div>
                <p className="mt-3 text-xs text-[#A08D80]">{t.dashboard.business.lifetimeTotal}</p>
              </div>
              <div className="bg-[#FFFCF8] border border-[#E8D8CC] rounded-2xl p-5">
                <p className="text-sm text-[#79665E]">{t.dashboard.business.ourWorkCakes}</p>
                <div className="mt-3 flex items-center gap-5">
                  <Donut
                    segments={[
                      { value: overview.business.bakedCakes.active, color: DONUT_COLORS[0] },
                      { value: overview.business.bakedCakes.paused, color: DONUT_COLORS[1] },
                    ]}
                  />
                  <div className="space-y-1.5">
                    <LegendRow color={DONUT_COLORS[0]} label={t.dashboard.business.active} value={overview.business.bakedCakes.active} />
                    <LegendRow color={DONUT_COLORS[1]} label={t.dashboard.business.paused} value={overview.business.bakedCakes.paused} />
                  </div>
                </div>
                <p className="mt-3 text-xs text-[#A08D80]">{t.dashboard.business.lifetimeTotal}</p>
              </div>
            </div>
          </div>

          {overview.sessions.total === 0 && <p className="text-sm text-[#A08D80]">{t.dashboard.empty}</p>}
        </div>
      )}
    </div>
  );
}
