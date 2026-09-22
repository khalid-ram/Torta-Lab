"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initAnalyticsTracking } from "./tracker";

// Mounted once in the root layout so every public page shares one
// continuous session/active-time tracker across client-side navigation.
// Admin routes are excluded on purpose — an admin viewing their own
// dashboard shouldn't inflate the traffic they're looking at.
export function AnalyticsProvider() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    if (isAdminRoute) return;
    return initAnalyticsTracking();
  }, [isAdminRoute]);

  return null;
}
