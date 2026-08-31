import { ApiError, ErrorEnvelopeSchema, OkResponseSchema, UuidIdParamsSchema } from "@effect-erp/contracts";
import {
  AuthSessionListQuerySchema,
  AuthSessionPageSchema,
  AuthSessionResponseSchema,
  MeResponseSchema,
  RequestOtpResponseSchema,
  RequestOtpSchema,
  VerifyOtpSchema,
  type AuthSessionListQuery,
  type AuthSessionResponse,
  type MeResponse,
  type RequestOtpInput,
  type RequestOtpResponse,
  type VerifyOtpInput,
} from "../contracts/index.js";
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
    const body = await response.json().catch(() => undefined);
    if (!response.ok) throw toApiError(body);
    return schema.parse(body);
  }

  requestOtp(input: RequestOtpInput): Promise<RequestOtpResponse> {
    return this.request("/auth/otp/request", RequestOtpResponseSchema, {
      method: "POST",
      body: RequestOtpSchema.parse(input),
    });
  }

  verifyOtp(input: VerifyOtpInput): Promise<AuthSessionResponse> {
    return this.request("/auth/otp/verify", AuthSessionResponseSchema, {
      method: "POST",
      body: VerifyOtpSchema.parse(input),
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
