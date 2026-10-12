import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Egyptian mobile national numbers (E.164 minus the +20) are always 10
// digits: 1 followed by 0/1/2/5, e.g. +201012345678 -> national
// "1012345678" -> prefix "10" (local "010"). This is checked
// explicitly rather than trusted to libphonenumber-js's generic number
// "type" classification, which is metadata-driven and less reliable
// for this one specific, well-known business rule than a direct regex.
const EGYPT_MOBILE_NATIONAL = /^1[0125]\d{8}$/;

export function normalizeAndValidatePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Accepts "01012345678" and "+201012345678" directly. A bare
  // "201012345678" (international digits, no +) isn't a valid local
  // Egyptian number on its own, so if the first attempt (assuming
  // Egypt as the default country) fails, retry once with a leading +
  // added — covers that exact format from the spec without otherwise
  // loosening validation.
  let parsed = parsePhoneNumberFromString(trimmed, 'EG');
  if ((!parsed || !parsed.isValid()) && !trimmed.startsWith('+')) {
    parsed = parsePhoneNumberFromString(`+${trimmed}`);
  }
  if (!parsed || !parsed.isValid()) return null;

  if (parsed.country === 'EG' && !EGYPT_MOBILE_NATIONAL.test(parsed.nationalNumber)) {
    return null; // valid E.164 shape, but not a 010/011/012/015 mobile (e.g. a landline)
  }

  return parsed.number; // E.164, e.g. "+201012345678"
}
