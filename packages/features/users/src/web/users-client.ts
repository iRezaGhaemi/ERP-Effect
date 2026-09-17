import { ApiError, ErrorEnvelopeSchema, OkResponseSchema, UuidIdParamsSchema } from "@effect-erp/contracts";
import { z } from "zod";

import { CreatePasswordUserSchema, UpdateUserSchema, UserDetailDtoSchema, UserDtoSchema, UserPageQuerySchema, UserPageSchema, type CreatePasswordUserInput, type UpdateUserInput, type UserPageQuery } from "../contracts/index.js";

function csrfToken(): string | undefined {
  return document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("effect_csrf="))?.slice("effect_csrf=".length);
}

function toApiError(body: unknown): ApiError {
  const parsed = ErrorEnvelopeSchema.safeParse(body);
  return parsed.success ? ApiError.fromEnvelope(parsed.data) : new ApiError({ code: "REQUEST_FAILED", message: "ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.", fields: {}, requestId: "unknown" });
}

export class UsersClient {
  private async request<T>(path: string, schema: z.ZodType<T>, options: { method?: "GET" | "POST" | "PATCH"; body?: unknown; csrf?: boolean } = {}): Promise<T> {
    const headers = new Headers();
    if (options.body !== undefined) headers.set("content-type", "application/json");
    if (options.csrf) {
      const token = csrfToken();
      if (!token) throw new ApiError({ code: "CSRF_TOKEN_MISSING", message: "نشست شما منقضی شده است. دوباره وارد شوید.", fields: {}, requestId: "unknown" });
      headers.set("x-csrf-token", token);
    }
    const request: RequestInit = { method: options.method ?? "GET", credentials: "include", headers };
    if (options.body !== undefined) request.body = JSON.stringify(options.body);
    const response = await fetch(`/api/v1${path}`, request);
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) throw toApiError(body);
    return schema.parse(body);
  }

  list(query: Partial<UserPageQuery> = {}) {
    const parsed = UserPageQuerySchema.parse(query);
    return this.request(`/users?page=${parsed.page}&pageSize=${parsed.pageSize}`, UserPageSchema);
  }
  get(id: string) { return this.request(`/users/${UuidIdParamsSchema.parse({ id }).id}`, UserDetailDtoSchema); }
  create(input: CreatePasswordUserInput) { return this.request("/users", UserDtoSchema, { method: "POST", body: CreatePasswordUserSchema.parse(input), csrf: true }); }
  update(id: string, input: UpdateUserInput) { return this.request(`/users/${UuidIdParamsSchema.parse({ id }).id}`, UserDtoSchema, { method: "PATCH", body: UpdateUserSchema.parse(input), csrf: true }); }
  suspend(id: string) { return this.request(`/users/${UuidIdParamsSchema.parse({ id }).id}/suspend`, OkResponseSchema, { method: "POST", csrf: true }).then(() => undefined); }
  activate(id: string) { return this.request(`/users/${UuidIdParamsSchema.parse({ id }).id}/activate`, OkResponseSchema, { method: "POST", csrf: true }).then(() => undefined); }
}
