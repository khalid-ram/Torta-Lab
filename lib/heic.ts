// Client-side HEIC/HEIF -> JPEG conversion, so a photo uploaded straight
// from an iPhone lands in Storage as something every browser can decode
// — without ever routing the raw bytes through the backend (see
// lib/api/baked-cakes.ts for why). Detection uses real magic bytes, not
// File.type/extension: Safari/iOS can report a HEIC photo's mimetype as
// image/jpeg or image/png (the file's actual bytes stay HEIC-encoded),
// the exact issue backend/src/baked-cakes/upload-constraints.ts's
// post-upload signature check also guards against server-side.

const HEIC_BRANDS = ["heic", "heix", "heim", "heis", "hevc", "hevx", "hevm", "hevs", "mif1", "msf1"];

// No display message here on purpose — this is a shared, non-UI module,
// and the message the admin sees must stay bilingual (AR/EN). The
// caller catches this and shows its own translated error text.
export class HeicConversionError extends Error {
  constructor() {
    super("heic_conversion_failed");
  }
}

async function isHeicFile(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (head.length < 12) return false;
  const ftyp = String.fromCharCode(...head.slice(4, 8));
  if (ftyp !== "ftyp") return false;
  const brand = String.fromCharCode(...head.slice(8, 12));
  return HEIC_BRANDS.includes(brand);
}

function withJpegExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const base = dot === -1 ? fileName : fileName.slice(0, dot);
  return `${base}.jpg`;
}

// Returns the original file unchanged if it isn't HEIC. Throws
// HeicConversionError (safe to show directly to the admin) if it is
// HEIC but conversion fails — never silently drops the photo.
export async function convertHeicIfNeeded(file: File): Promise<File> {
  if (!(await isHeicFile(file))) return file;

  let converted: Blob;
  try {
    // Dynamic import on purpose: heic2any touches `window` at module
    // load time, which crashes Next.js's server-side prerender pass for
    // any page that transitively imports this file (e.g. the public
    // homepage, via lib/api/baked-cakes.ts) if this were a static
    // top-level import instead.
    const { default: heic2any } = await import("heic2any");
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    converted = Array.isArray(result) ? result[0] : result;
  } catch (err) {
    // Logged (not surfaced) so a real decode failure is diagnosable —
    // the admin only ever sees the caller's translated error message.
    console.error("HEIC conversion failed:", err);
    throw new HeicConversionError();
  }

  return new File([converted], withJpegExtension(file.name), { type: "image/jpeg" });
}
