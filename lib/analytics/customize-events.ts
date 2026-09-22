"use client";

// Correlates the 3 funnel events (customize_started, completed,
// whatsapp_clicked) to one Customize attempt, mirroring the existing
// fresh-session behavior in app/customize/page.tsx: a genuinely new
// Customize CTA gets a new attempt id, while refresh/Back/Next within
// the same active customization keep reusing it.
//
// Each event is also flag-deduplicated per attempt here, on top of the
// database's own unique(attempt_id, event_name) constraint — belt and
// braces against "repeated clicking artificially inflating the funnel".

import * as api from "@/lib/api/analytics";
import { getActiveSessionId } from "./tracker";

const ATTEMPT_KEY = "torta_lab_customize_attempt";

interface StoredAttempt {
  id: string;
  startedSent: boolean;
  completedSent: boolean;
  whatsappSent: boolean;
}

function readAttempt(): StoredAttempt | null {
  try {
    const raw = localStorage.getItem(ATTEMPT_KEY);
    return raw ? (JSON.parse(raw) as StoredAttempt) : null;
  } catch {
    return null;
  }
}

function writeAttempt(attempt: StoredAttempt): void {
  try {
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
  } catch {
    // Storage unavailable — dedup just falls back to the database's own
    // unique constraint; nothing customer-facing depends on this.
  }
}

function freshAttempt(): StoredAttempt {
  return { id: crypto.randomUUID(), startedSent: false, completedSent: false, whatsappSent: false };
}

// Call exactly where a NEW Customize session begins (the ?new=1 branch)
// — generates a fresh attempt id and immediately records the start.
export function startNewCustomizeAttempt(): void {
  const attempt = freshAttempt();
  writeAttempt(attempt);
  sendOnce(attempt, "startedSent", "customize_started");
}

function getOrCreateAttempt(): StoredAttempt {
  return readAttempt() ?? freshAttempt();
}

export function trackCustomizationCompleted(): void {
  const attempt = getOrCreateAttempt();
  sendOnce(attempt, "completedSent", "customization_completed");
}

export function trackCustomizationWhatsappClicked(): void {
  const attempt = getOrCreateAttempt();
  sendOnce(attempt, "whatsappSent", "customization_whatsapp_clicked");
}

function sendOnce(attempt: StoredAttempt, flag: keyof Omit<StoredAttempt, "id">, eventName: api.AnalyticsEventName): void {
  if (attempt[flag]) return;
  writeAttempt({ ...attempt, [flag]: true });

  const sessionId = getActiveSessionId();
  if (!sessionId) return; // tracker not active in this context (e.g. never initialized) — skip quietly
  void api.trackEvent({ sessionId, attemptId: attempt.id, eventName });
}
