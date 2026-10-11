// The one place the frontend talks to Supabase directly — only for
// uploading a file to a path+token pair the backend already minted and
// authorized (see POST /admin/baked-cakes/uploads in lib/api/baked-cakes.ts).
// The anon key below is safe to ship to the browser: it cannot read or
// write anything on its own (Storage RLS grants it nothing — see
// migration 0004), the actual permission to write to this exact path
// comes entirely from the one-time, 2-hour signed token the backend
// returns, not from this key.

import { createClient } from "@supabase/supabase-js";

const BUCKET = "baked-cakes";

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createClient(url, anonKey);
}

export async function uploadToSignedPath(path: string, token: string, file: File | Blob, contentType: string): Promise<void> {
  const client = getStorageClient();
  const { error } = await client.storage.from(BUCKET).uploadToSignedUrl(path, token, file, { contentType });
  if (error) {
    throw error;
  }
}
