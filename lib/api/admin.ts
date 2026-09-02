import { ApiError, extractMessage, request } from "./client";

export { ApiError as AdminApiError, NetworkError as AdminNetworkError } from "./client";

export type UserRole = "buyer" | "admin";
export type UserStatus = "active" | "inactive";
export type RoleFilter = "all" | UserRole;
export type StatusFilter = "all" | UserStatus;

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: RoleFilter;
  status?: StatusFilter;
}

export async function listUsers(params: ListUsersParams): Promise<{ data: AdminUser[]; pagination: Pagination }> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.role && params.role !== "all") query.set("role", params.role);
  if (params.status && params.status !== "all") query.set("status", params.status);

  const res = await request(`/admin/users?${query.toString()}`, { method: "GET" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body;
}

export async function getUser(id: string): Promise<AdminUser> {
  const res = await request(`/admin/users/${id}`, { method: "GET" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.user;
}

export interface UpdateUserInput {
  name?: string;
  username?: string;
  phone?: string;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<AdminUser> {
  const res = await request(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.user;
}

export async function setUserStatus(id: string, isActive: boolean): Promise<AdminUser> {
  const res = await request(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body.user;
}
