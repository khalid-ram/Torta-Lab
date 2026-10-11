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

// supabaseUrl/supabaseAnonKey are passed in rather than read here via
// process.env.NEXT_PUBLIC_* directly: this module is only ever reached
// through a dynamic import() (see lib/api/baked-cakes.ts), and Next.js's
// build-time inlining of NEXT_PUBLIC_* vars does not reliably apply
// inside dynamically-imported chunks — confirmed in production, where
// the reference survived as a runtime `process.env` lookup (which
// doesn't exist in the browser) instead of being replaced with the
// actual value, silently hanging every upload. Reading the vars in the
// statically-bundled caller and passing the resolved strings down
// sidesteps the issue entirely.
export async function uploadToSignedPath(
  supabaseUrl: string,
  supabaseAnonKey: string,
  path: string,
  token: string,
  file: File | Blob,
  contentType: string,
): Promise<void> {
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await client.storage.from(BUCKET).uploadToSignedUrl(path, token, file, { contentType });
  if (error) {
    throw error;
  }
}
