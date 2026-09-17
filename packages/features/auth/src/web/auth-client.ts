import { ApiError, ErrorEnvelopeSchema, OkResponseSchema, UuidIdParamsSchema } from "@effect-erp/contracts";
import {
  AuthSessionListQuerySchema,
  AuthSessionPageSchema,
  AuthSessionResponseSchema,
  LoginSchema,
  MeResponseSchema,
  type AuthSessionListQuery,
  type AuthSessionResponse,
  type LoginInput,
  type MeResponse,
} from "../contracts/index.js";
import {
  ChangePasswordSchema,
  ResetPasswordSchema,
  SetupCredentialsSchema,
  type ChangePasswordInput,
  type ResetPasswordInput,
  type SetupCredentialsInput,
} from "@effect/users/contracts";
import { z } from "zod";

function csrfToken(): string | undefined {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("effect_csrf="))
    ?.slice("effect_csrf=".length);
}

function toApiError(body: unknown): ApiError {
  const parsed = ErrorEnvelopeSchema.safeParse(body);
  return parsed.success
    ? ApiError.fromEnvelope(parsed.data)
    : new ApiError({
      code: "REQUEST_FAILED",
      message: "ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.",
      fields: {},
      requestId: "unknown",
    });
}

export class AuthClient {
  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    options: { method?: "GET" | "POST" | "DELETE"; body?: unknown; csrf?: boolean } = {},
  ): Promise<T> {
    const headers = new Headers();
    if (options.body !== undefined) headers.set("content-type", "application/json");
    if (options.csrf) {
      const token = csrfToken();
      if (!token) {
        throw new ApiError({
          code: "CSRF_TOKEN_MISSING",
          message: "نشست شما منقضی شده است. دوباره وارد شوید.",
          fields: {},
          requestId: "unknown",
        });
      }
      headers.set("x-csrf-token", token);
    }

    const request: RequestInit = {
      method: options.method ?? "GET",
      credentials: "include",
      headers,
    };
    if (options.body !== undefined) request.body = JSON.stringify(options.body);
    const response = await fetch(`/api/v1${path}`, request);
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) throw toApiError(body);
    return schema.parse(body);
  }

  login(input: LoginInput): Promise<AuthSessionResponse> {
    return this.request("/auth/login", AuthSessionResponseSchema, {
      method: "POST",
      body: LoginSchema.parse(input),
    });
  }

  changePassword(input: ChangePasswordInput): Promise<AuthSessionResponse> {
    return this.request("/auth/password/change", AuthSessionResponseSchema, {
      method: "POST",
      body: ChangePasswordSchema.parse(input),
      csrf: true,
    });
  }

  setupCredentials(id: string, input: SetupCredentialsInput): Promise<void> {
    const userId = UuidIdParamsSchema.parse({ id }).id;
    return this.request(`/users/${userId}/credentials`, z.undefined(), {
      method: "POST",
      body: SetupCredentialsSchema.parse(input),
      csrf: true,
    });
  }

  resetPassword(id: string, input: ResetPasswordInput): Promise<void> {
    const userId = UuidIdParamsSchema.parse({ id }).id;
    return this.request(`/users/${userId}/password/reset`, z.undefined(), {
      method: "POST",
      body: ResetPasswordSchema.parse(input),
      csrf: true,
    });
  }

  refresh(): Promise<AuthSessionResponse> {
    return this.request("/auth/refresh", AuthSessionResponseSchema, { method: "POST" });
  }

  me(): Promise<MeResponse> {
    return this.request("/me", MeResponseSchema);
  }

  logout(): Promise<void> {
    return this.request("/auth/logout", OkResponseSchema, { method: "POST", csrf: true }).then(() => undefined);
  }

  logoutAll(): Promise<void> {
    return this.request("/auth/logout-all", OkResponseSchema, { method: "POST", csrf: true }).then(() => undefined);
  }

  listSessions(query: Partial<AuthSessionListQuery> = {}) {
    const parsed = AuthSessionListQuerySchema.parse(query);
    const params = new URLSearchParams({ page: String(parsed.page), pageSize: String(parsed.pageSize) });
    return this.request(`/auth/sessions?${params}`, AuthSessionPageSchema);
  }

  revokeSession(id: string): Promise<void> {
    const { id: sessionId } = UuidIdParamsSchema.parse({ id });
    return this.request(`/auth/sessions/${sessionId}`, OkResponseSchema, { method: "DELETE", csrf: true }).then(() => undefined);
  }
}
