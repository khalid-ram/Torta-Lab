import { ApiError, extractMessage, request } from "./client";
import type { Occasion } from "../occasions";
import { convertHeicIfNeeded } from "../heic";

export { ApiError as BakedCakesApiError, NetworkError as BakedCakesNetworkError } from "./client";

export type MediaType = "image" | "video";
export type CakeStatus = "active" | "paused";
export type StatusFilter = "all" | CakeStatus;
export type AvailabilityFilter = "all" | "available" | "unavailable";
export type MediaFilter = "all" | MediaType;

export interface BakedCake {
  id: string;
  name: string;
  description: string;
  is_available_to_order: boolean;
  status: CakeStatus;
  media_type: MediaType;
  media_url: string;
  media_path: string;
  thumbnail_url: string | null;
  thumbnail_path: string | null;
  occasion: Occasion | null;
  // Admin-only values — present here because this type backs the Admin
  // API response only; PublicBakedCake below is the public shape and
  // deliberately omits cost/actual_selling_price entirely.
  cost: number | null;
  recommended_selling_price: number | null;
  actual_selling_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface PublicBakedCake {
  id: string;
  name: string;
  description: string;
  isAvailableToOrder: boolean;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string | null;
  occasion: Occasion | null;
  recommendedSellingPrice: number | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListBakedCakesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: StatusFilter;
  availability?: AvailabilityFilter;
  media?: MediaFilter;
}

// name/description/etc only — the media itself is uploaded separately
// (see uploadCakeFile below) before this is ever sent; mediaPath/
// thumbnailPath just point at what's already in Storage.
export interface BakedCakeFormFields {
  name: string;
  description: string;
  is_available_to_order: boolean;
  status: CakeStatus;
  media_type: MediaType;
  // null = left blank (occasion unset / price not entered) — distinct
  // from the 0 a money field can validly hold (see baked-cakes.service.ts).
  occasion: Occasion | null;
  cost: number | null;
  recommended_selling_price: number | null;
  actual_selling_price: number | null;
  mediaPath?: string;
  thumbnailPath?: string;
}

export type UploadPurpose = "media" | "thumbnail";

// Step 1+2 of the direct-upload flow: ask the backend for a one-time
// signed Storage upload slot (admin-only, see
// backend/src/baked-cakes/baked-cakes.service.ts#requestUploadUrl), then
// upload straight to Storage — the file's bytes never touch this
// backend request, which is what keeps large video uploads working.
export async function requestUploadUrl(input: { purpose: UploadPurpose; fileKind: MediaType; contentType: string }): Promise<{ path: string; token: string }> {
  const res = await request("/admin/baked-cakes/uploads", { method: "POST", body: JSON.stringify(input) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body;
}

// HEIC photos are converted client-side first (see lib/heic.ts) so the
// bytes that actually land in Storage are always a normal JPEG — the
// backend never needs to understand HEIC at all. Returns the uploaded
// object's Storage path, ready to pass as mediaPath/thumbnailPath.
export async function uploadCakeFile(file: File, purpose: UploadPurpose, fileKind: MediaType): Promise<string> {
  const prepared = fileKind === "image" ? await convertHeicIfNeeded(file) : file;
  const { path, token } = await requestUploadUrl({ purpose, fileKind, contentType: prepared.type });
  // Dynamic import so @supabase/supabase-js is only ever pulled into the
  // Admin bundle that actually uploads — public pages (the homepage,
  // which also imports this module for getPublicBakedCakes) never
  // trigger this code path and shouldn't pay for its bundle size.
  const { uploadToSignedPath } = await import("../supabase/direct-upload");
  await uploadToSignedPath(path, token, prepared, prepared.type);
  return path;
}

export async function listBakedCakes(params: ListBakedCakesParams): Promise<{ data: BakedCake[]; pagination: Pagination }> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.availability && params.availability !== "all") query.set("availability", params.availability);
  if (params.media && params.media !== "all") query.set("media", params.media);

  const res = await request(`/admin/baked-cakes?${query.toString()}`, { method: "GET" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body;
}

export async function getBakedCake(id: string): Promise<BakedCake> {
  const res = await request(`/admin/baked-cakes/${id}`, { method: "GET" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.cake;
}

export async function createBakedCake(fields: BakedCakeFormFields): Promise<BakedCake> {
  const res = await request("/admin/baked-cakes", { method: "POST", body: JSON.stringify(fields) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.cake;
}

export async function updateBakedCake(id: string, fields: Partial<BakedCakeFormFields>): Promise<BakedCake> {
  const res = await request(`/admin/baked-cakes/${id}`, { method: "PATCH", body: JSON.stringify(fields) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.cake;
}

export async function setBakedCakeStatus(id: string, status: CakeStatus): Promise<BakedCake> {
  const res = await request(`/admin/baked-cakes/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.cake;
}

export async function getPublicBakedCakes(): Promise<PublicBakedCake[]> {
  const res = await request("/baked-cakes", { method: "GET" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.data;
}
