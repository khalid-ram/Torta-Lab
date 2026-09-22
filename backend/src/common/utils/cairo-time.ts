// Torta Lab's one reporting timezone for Admin Analytics day boundaries
// (see AGENTS.md / the analytics V1 spec: "do not mix browser-local
// date boundaries between visitors" — every admin sees the same "Today"
// regardless of their own browser timezone). Egypt has observed no DST
// since abolishing it again in 2023, so a fixed UTC+2 offset is correct
// and avoids pulling in a timezone-database dependency for one constant.
// If Egypt reinstates DST, this constant is the one place to revisit.
const CAIRO_UTC_OFFSET_HOURS = 2;

// "Today" in Cairo, as a plain YYYY-MM-DD, regardless of the server's
// own OS timezone (Railway runs UTC).
export function cairoTodayDateString(): string {
  const shifted = new Date(Date.now() + CAIRO_UTC_OFFSET_HOURS * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

// Whole-day calendar arithmetic on a YYYY-MM-DD string — timezone-
// agnostic on purpose, since shifting by whole days never crosses a
// fractional-offset boundary.
export function shiftCairoDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The UTC instants corresponding to 00:00:00 and 23:59:59.999 of a
// given Cairo calendar day.
export function cairoDayStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000+02:00`);
}
export function cairoDayEnd(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999+02:00`);
}
