// One anonymous, non-fingerprinting identifier per browser — a random
// id stored in localStorage, nothing derived from the device/browser
// itself. Sessions must work before signup (see the V1 analytics spec),
// so this is the only thing that ties a visitor's sessions together
// before they ever log in.
const VISITOR_ID_KEY = "torta_lab_visitor_id";

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    // Storage unavailable (private mode, disabled storage, ...) — fall
    // back to a per-call id rather than breaking the caller. Analytics
    // staying imperfect here is fine; the site must not be.
    return crypto.randomUUID();
  }
}
