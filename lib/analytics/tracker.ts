"use client";

// The session + active-time engine behind the V1 Admin Analytics
// dashboard. One module-level instance per tab (this file is only ever
// imported by the single AnalyticsProvider mounted at the app root).
//
// Session: a continuous visit by one browser, ending after 30 minutes
// of inactivity — re-checked on every visibility/focus resume, not just
// once at page load, so a tab left backgrounded past the timeout and
// then revisited correctly starts a new session.
//
// Active time: accumulated ONLY while the tab is actually visible and
// focused (Page Visibility API), never "close time minus open time".
// Flushed periodically (not every second) plus reliably on
// hide/unload via a keepalive request.

import { getVisitorId } from "./visitor";
import * as api from "@/lib/api/analytics";

const SESSION_KEY = "torta_lab_session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 20 * 1000;
const MIN_FLUSH_MS = 1000; // don't bother sending sub-second dust

interface StoredSession {
  id: string;
  lastActivityAt: number;
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage unavailable — the session just won't survive a reload;
    // the site itself is unaffected.
  }
}

let currentSessionId: string | null = null;
let activeStretchStartedAt: number | null = null; // performance.now() when the current visible+focused stretch began
let pendingActiveMs = 0;

function isVisibleAndFocused(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "visible" && document.hasFocus();
}

function startActiveStretch(): void {
  if (activeStretchStartedAt === null) activeStretchStartedAt = performance.now();
}

function stopActiveStretch(): void {
  if (activeStretchStartedAt !== null) {
    pendingActiveMs += performance.now() - activeStretchStartedAt;
    activeStretchStartedAt = null;
  }
}

function touchSession(): void {
  const existing = readSession();
  if (!existing || existing.id !== currentSessionId) return;
  writeSession({ id: existing.id, lastActivityAt: Date.now() });
}

// Decides new-vs-continuing per the 30-minute rule and (re)points
// currentSessionId — called at init and again on every visibility/focus
// resume, which is what makes the timeout actually enforced rather than
// only checked once per page load.
function ensureSession(): void {
  const now = Date.now();
  const existing = readSession();

  if (existing && now - existing.lastActivityAt < SESSION_TIMEOUT_MS) {
    currentSessionId = existing.id;
    writeSession({ id: existing.id, lastActivityAt: now });
    return;
  }

  // Crossing a session boundary mid-active-stretch must not lose the
  // time already accumulated under the outgoing session.
  flush(true);

  const id = crypto.randomUUID();
  currentSessionId = id;
  writeSession({ id, lastActivityAt: now });
  void api.startSession({ id, visitorId: getVisitorId() });
}

function flush(reliable = false): void {
  if (!currentSessionId) return;
  const ms = pendingActiveMs;
  if (ms < MIN_FLUSH_MS) return;
  pendingActiveMs = 0;
  void api.sendHeartbeat(currentSessionId, Math.round(ms / 1000), reliable);
  touchSession();
}

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

// Call once from the analytics provider; returns a cleanup function.
export function initAnalyticsTracking(): () => void {
  if (typeof window === "undefined") return () => {};

  ensureSession();
  if (isVisibleAndFocused()) startActiveStretch();

  const onVisibilityChange = () => {
    if (isVisibleAndFocused()) {
      ensureSession();
      startActiveStretch();
    } else {
      stopActiveStretch();
      flush();
    }
  };
  const onFocus = () => {
    if (isVisibleAndFocused()) {
      ensureSession();
      startActiveStretch();
    }
  };
  const onBlur = () => {
    stopActiveStretch();
    flush();
  };
  const onPageHide = () => {
    stopActiveStretch();
    flush(true);
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", onFocus);
  window.addEventListener("blur", onBlur);
  window.addEventListener("pagehide", onPageHide);

  // Periodic flush while active — bounded, infrequent, never per-second.
  heartbeatTimer = setInterval(() => {
    if (isVisibleAndFocused()) {
      stopActiveStretch();
      flush();
      startActiveStretch();
    }
  }, HEARTBEAT_INTERVAL_MS);

  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("pagehide", onPageHide);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    stopActiveStretch();
    flush(true);
  };
}

export function getActiveSessionId(): string | null {
  return currentSessionId;
}
