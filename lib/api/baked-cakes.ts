import { ApiError, extractMessage, request } from "./client";

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

export interface BakedCakeFormFields {
  name: string;
  description: string;
  is_available_to_order: boolean;
  status: CakeStatus;
  media_type: MediaType;
  media?: File;
  thumbnail?: File;
}

function toFormData(fields: BakedCakeFormFields | Partial<BakedCakeFormFields>): FormData {
  const formData = new FormData();
  if (fields.name !== undefined) formData.set("name", fields.name);
  if (fields.description !== undefined) formData.set("description", fields.description);
  if (fields.is_available_to_order !== undefined) formData.set("is_available_to_order", String(fields.is_available_to_order));
  if (fields.status !== undefined) formData.set("status", fields.status);
  if (fields.media_type !== undefined) formData.set("media_type", fields.media_type);
  if (fields.media) formData.set("media", fields.media);
  if (fields.thumbnail) formData.set("thumbnail", fields.thumbnail);
  return formData;
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
  const res = await request("/admin/baked-cakes", { method: "POST", body: toFormData(fields) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.cake;
}

export async function updateBakedCake(id: string, fields: Partial<BakedCakeFormFields>): Promise<BakedCake> {
  const res = await request(`/admin/baked-cakes/${id}`, { method: "PATCH", body: toFormData(fields) });
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
