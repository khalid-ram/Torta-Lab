// Shared transform for Cost / Recommended Selling Price / Actual
// Selling Price: multipart form fields always arrive as strings, and
// these three fields must preserve a real distinction between "not
// entered" (null) and "0" (a deliberate value, e.g. a cake given away
// for free) — see the Baked Cakes pricing spec. An empty string means
// the admin cleared the field, so it becomes null; any other
// non-numeric string is left untouched so @IsNumber still rejects it
// with a proper validation error instead of silently turning into null.
export const toNullableMoney = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? trimmed : parsed;
};
