import { ApiError, extractMessage, request } from "./client";

export { ApiError as CustomizationApiError, NetworkError as CustomizationNetworkError } from "./client";

export type FieldType = "text" | "number" | "selection";
export type SelectionMode = "single" | "multi";
export type FieldStatus = "active" | "paused";
export type PlacementType = "core_step" | "separate_step";

// The 7 placeable Core Steps of /customize, in their fixed order.
// "review" is never a valid placement target — see app/customize/page.tsx.
export const CORE_STEP_KEYS = ["occasion", "tiers", "flavors", "sizeFilling", "colorsMessage", "photo", "notes"] as const;
export type CoreStepKey = (typeof CORE_STEP_KEYS)[number];

export interface FieldOption {
  id: string;
  label: string;
}

export interface AdminField {
  id: string;
  label: string;
  description: string | null;
  isRequired: boolean;
  fieldType: FieldType;
  selectionMode: SelectionMode | null;
  status: FieldStatus;
  placementType: PlacementType;
  coreStepKey: CoreStepKey | null;
  afterCoreStepKey: CoreStepKey | null;
  order: number;
  options: FieldOption[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicCustomizationField {
  id: string;
  label: string;
  description: string | null;
  required: boolean;
  type: FieldType;
  selectionMode: SelectionMode | null;
  options: { id: string; label: string }[] | null;
  placementType: PlacementType;
  coreStepKey: CoreStepKey | null;
  afterCoreStepKey: CoreStepKey | null;
  order: number;
}

export interface CustomizationFieldFormFields {
  label: string;
  description: string;
  isRequired: boolean;
  fieldType: FieldType;
  selectionMode?: SelectionMode;
  options?: { label: string }[];
  placementType: PlacementType;
  coreStepKey?: CoreStepKey;
  afterCoreStepKey?: CoreStepKey;
}

export async function listAdminFields(): Promise<AdminField[]> {
  const res = await request("/admin/customization/fields", { method: "GET" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.fields;
}

export async function getAdminField(id: string): Promise<AdminField> {
  const res = await request(`/admin/customization/fields/${id}`, { method: "GET" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.field;
}

export async function createCustomizationField(fields: CustomizationFieldFormFields): Promise<AdminField> {
  const res = await request("/admin/customization/fields", { method: "POST", body: JSON.stringify(fields) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.field;
}

export async function updateCustomizationField(
  id: string,
  fields: Partial<CustomizationFieldFormFields>,
): Promise<AdminField> {
  const res = await request(`/admin/customization/fields/${id}`, { method: "PATCH", body: JSON.stringify(fields) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.field;
}

export async function setFieldStatus(id: string, status: FieldStatus): Promise<AdminField> {
  const res = await request(`/admin/customization/fields/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.field;
}

export async function moveField(id: string, direction: "up" | "down"): Promise<AdminField[]> {
  const res = await request(`/admin/customization/fields/${id}/move`, {
    method: "PATCH",
    body: JSON.stringify({ direction }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.fields;
}

export async function deleteCustomizationField(id: string): Promise<void> {
  const res = await request(`/admin/customization/fields/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, extractMessage(body));
  }
}

export async function getPublicCustomization(): Promise<{ fields: PublicCustomizationField[] }> {
  const res = await request("/customization", { method: "GET" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body;
}
