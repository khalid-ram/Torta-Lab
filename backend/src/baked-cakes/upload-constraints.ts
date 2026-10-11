// Shared between the signed-upload-URL request (cosmetic — picks a file
// extension) and the post-upload validation that actually decides
// whether an uploaded object is accepted (security-relevant). Kept in
// one place so the two can never silently drift apart.

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const;
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

// Real magic-byte signatures, not the client-declared Content-Type. A
// browser (or a HEIC file wearing a spoofed image/jpeg content type —
// the exact bug this project hit before) can assert whatever
// Content-Type it likes when uploading directly to Storage, so this is
// what actually decides whether an "image" upload gets accepted.
export const IMAGE_SIGNATURES: Record<string, (buf: Buffer) => boolean> = {
  'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  'image/png': (buf) =>
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a,
  'image/webp': (buf) => buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP',
};
