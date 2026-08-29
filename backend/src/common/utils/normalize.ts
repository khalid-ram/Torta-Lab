const EGYPT_E164_PATTERN = /^\+20\d{10}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Accepts common Egyptian input shapes (01012345678, +201012345678,
 * 00201012345678, 201012345678) and returns canonical E.164, or null
 * if the input can't be resolved to a valid Egyptian mobile number.
 */
export function normalizePhone(value: string): string | null {
  const stripped = value.trim().replace(/[\s()-]/g, '');

  let candidate: string;
  if (stripped.startsWith('+20')) {
    candidate = stripped;
  } else if (stripped.startsWith('0020')) {
    candidate = `+${stripped.slice(2)}`;
  } else if (stripped.startsWith('20')) {
    candidate = `+${stripped}`;
  } else if (stripped.startsWith('0')) {
    candidate = `+20${stripped.slice(1)}`;
  } else {
    candidate = `+20${stripped}`;
  }

  return EGYPT_E164_PATTERN.test(candidate) ? candidate : null;
}
