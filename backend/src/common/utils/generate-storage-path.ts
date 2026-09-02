import { randomUUID } from 'crypto';

// Extension is derived from the already-validated MIME type, never from
// the caller's original filename, so the generated path can't carry
// user input at all (no traversal, no injection, no collisions).
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

export type StorageFolder = 'images' | 'videos' | 'thumbnails';

export function generateStoragePath(folder: StorageFolder, mimeType: string): string {
  const extension = EXTENSION_BY_MIME_TYPE[mimeType];
  if (!extension) {
    throw new Error(`Unsupported MIME type for storage path: ${mimeType}`);
  }
  return `${folder}/${randomUUID()}.${extension}`;
}
