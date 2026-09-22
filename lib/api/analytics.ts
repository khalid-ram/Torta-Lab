import { ApiError, extractMessage, request } from "./client";

// These three calls are fire-and-forget by design: analytics must never
// break the customer journey (site, customization, WhatsApp, navigation
// all keep working if a request fails or the backend is unreachable) —
// see the V1 analytics spec's "Failure Behavior" section. Every export
// here swallows its own errors instead of throwing.

export async function startSession(input: { id: string; visitorId: string }): Promise<void> {
  try {
    await request("/analytics/sessions", { method: "POST", body: JSON.stringify(input) });
  } catch {
    // Silent by design.
  }
}

export async function sendHeartbeat(sessionId: string, activeSecondsDelta: number, reliable = false): Promise<void> {
  try {
    await request(`/analytics/sessions/${sessionId}/heartbeat`, {
      method: "PATCH",
      body: JSON.stringify({ activeSecondsDelta }),
      // keepalive lets this specific request survive the page
      // unloading/hiding right after it's sent — the "reliable browser
      // mechanism" the spec asks for on navigation/unload flushes.
      keepalive: reliable,
    });
  } catch {
    // Silent by design.
  }
}

export type AnalyticsEventName = "customize_started" | "customization_completed" | "customization_whatsapp_clicked";

export async function trackEvent(input: {
  sessionId: string;
  attemptId: string;
  eventName: AnalyticsEventName;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await request("/analytics/events", { method: "POST", body: JSON.stringify(input) });
  } catch {
    // Silent by design.
  }
}

// --- Admin-only reporting (this one DOES throw — the dashboard needs
// to know if it failed so it can show an error state). ---

export type AnalyticsPeriod = "today" | "last7" | "last30" | "custom";

export interface AnalyticsOverview {
  period: { from: string; to: string };
  sessions: {
    total: number;
    engaged: { count: number; percent: number };
    bounced: { count: number; percent: number };
    avgActiveSeconds: number;
  };
  funnel: {
    customizeClicked: number;
    completed: number;
    completionRate: number;
    whatsappOrders: number;
    conversionRate: number;
  };
  business: {
    users: { buyers: number; admins: number };
    bakedCakes: { total: number; active: number; paused: number };
  };
}

export async function getOverview(params: { period: AnalyticsPeriod; from?: string; to?: string }): Promise<AnalyticsOverview> {
  const query = new URLSearchParams();
  query.set("period", params.period);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  const res = await request(`/admin/analytics/overview?${query.toString()}`, { method: "GET" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body as AnalyticsOverview;
}

export { ApiError as AnalyticsApiError, NetworkError as AnalyticsNetworkError } from "./client";
