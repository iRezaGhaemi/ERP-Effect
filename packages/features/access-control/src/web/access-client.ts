import { ApiError, ErrorEnvelopeSchema, OkResponseSchema, UuidIdParamsSchema } from "@effect-erp/contracts";
import { z } from "zod";

import { AccessPageQuerySchema, CreateRoleSchema, PermissionPageSchema, ReplacePermissionOverridesSchema, ReplaceUserRolesSchema, RoleDtoSchema, RolePageSchema, UpdateRoleSchema, type AccessPageQuery, type CreateRoleInput, type ReplacePermissionOverridesInput, type UpdateRoleInput } from "../contracts/index.js";

function csrfToken(): string | undefined { return document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("effect_csrf="))?.slice("effect_csrf=".length); }
function toApiError(body: unknown): ApiError { const parsed = ErrorEnvelopeSchema.safeParse(body); return parsed.success ? ApiError.fromEnvelope(parsed.data) : new ApiError({ code: "REQUEST_FAILED", message: "ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.", fields: {}, requestId: "unknown" }); }

export class AccessClient {
  private async request<T>(path: string, schema: z.ZodType<T>, options: { method?: "GET" | "POST" | "PATCH" | "PUT"; body?: unknown; csrf?: boolean } = {}): Promise<T> {
    const headers = new Headers();
    if (options.body !== undefined) headers.set("content-type", "application/json");
    if (options.csrf) { const token = csrfToken(); if (!token) throw new ApiError({ code: "CSRF_TOKEN_MISSING", message: "نشست شما منقضی شده است. دوباره وارد شوید.", fields: {}, requestId: "unknown" }); headers.set("x-csrf-token", token); }
    const request: RequestInit = { method: options.method ?? "GET", credentials: "include", headers };
    if (options.body !== undefined) request.body = JSON.stringify(options.body);
    const response = await fetch(`/api/v1${path}`, request);
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) throw toApiError(body);
    return schema.parse(body);
  }
  listRoles(query: Partial<AccessPageQuery> = {}) { const parsed = AccessPageQuerySchema.parse(query); return this.request(`/roles?page=${parsed.page}&pageSize=${parsed.pageSize}`, RolePageSchema); }
  listPermissions(query: Partial<AccessPageQuery> = {}) { const parsed = AccessPageQuerySchema.parse(query); return this.request(`/permissions?page=${parsed.page}&pageSize=${parsed.pageSize}`, PermissionPageSchema); }
  createRole(input: CreateRoleInput) { return this.request("/roles", RoleDtoSchema, { method: "POST", body: CreateRoleSchema.parse(input), csrf: true }); }
  updateRole(id: string, input: UpdateRoleInput) { return this.request(`/roles/${UuidIdParamsSchema.parse({ id }).id}`, RoleDtoSchema, { method: "PATCH", body: UpdateRoleSchema.parse(input), csrf: true }); }
  replaceRoles(id: string, input: { roleIds: string[] }) { return this.request(`/users/${UuidIdParamsSchema.parse({ id }).id}/roles`, OkResponseSchema, { method: "PUT", body: ReplaceUserRolesSchema.parse(input), csrf: true }).then(() => undefined); }
  replaceOverrides(id: string, input: ReplacePermissionOverridesInput) { return this.request(`/users/${UuidIdParamsSchema.parse({ id }).id}/permission-overrides`, OkResponseSchema, { method: "PUT", body: ReplacePermissionOverridesSchema.parse(input), csrf: true }).then(() => undefined); }
}
