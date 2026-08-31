import { describe, expect, it, vi } from "vitest";

import {
  AuthSessionListQuerySchema,
  AuthSessionPageSchema,
} from "../contracts/index.js";
import { AuthController } from "./auth.controller.js";

const authOptions = {
  pepper: "controller-otp-pepper-at-least-32-characters",
  ttlSeconds: 120,
  resendSeconds: 60,
  jwtAccessSecret: "controller-jwt-secret-at-least-32-characters",
  accessTtlSeconds: 900,
  refreshTtlDays: 30,
  cookieSecure: false,
};

const authResult = {
  user: {
    id: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f",
    phone: "+989121234567",
    firstName: "کاربر",
    lastName: "فعال",
    status: "ACTIVE" as const,
    lastLoginAt: "2026-08-28T00:00:00.000Z",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
  },
  sessionId: "7f29f0a6-ecae-4f46-afec-c6fe306502bd",
  accessToken: "access.jwt.value",
  refreshToken: "refresh-secret",
  csrfToken: "csrf-secret",
};

type CookieCall = {
  value: string;
  options: Record<string, unknown>;
};

function responseDouble() {
  const cookies = new Map<string, CookieCall>();
  const cleared = new Map<string, Record<string, unknown>>();
  return {
    cookies,
    cleared,
    response: {
      cookie: vi.fn(
        (name: string, value: string, options: Record<string, unknown>) => {
          cookies.set(name, { value, options });
        },
      ),
      clearCookie: vi.fn((name: string, options: Record<string, unknown>) => {
        cleared.set(name, options);
      }),
    },
  };
}

const request = {
  headers: {
    "x-request-id": "req_controller",
    "user-agent": "vitest",
    cookie: "effect_refresh=refresh-secret; effect_csrf=csrf-secret",
  },
  ip: "127.0.0.1",
  user: {
    userId: authResult.user.id,
    sessionId: authResult.sessionId,
    phone: authResult.user.phone,
    permissions: ["sessions:revoke"],
  },
};

describe("AuthController session cookies", () => {
  it("sets HttpOnly auth cookies and keeps tokens out of the verify response", async () => {
    const response = responseDouble();
    const controller = new AuthController(
      { verify: vi.fn().mockResolvedValue(authResult) } as never,
      {} as never,
      authOptions,
    );

    const body = await controller.verifyOtp(
      { challengeId: "761ff677-7c5e-414b-9565-e9d74082b0b7", code: "123456" },
      request,
      response.response,
    );

    expect(body).toEqual({
      user: authResult.user,
      sessionId: authResult.sessionId,
    });
    expect(JSON.stringify(body)).not.toContain(authResult.accessToken);
    expect(JSON.stringify(body)).not.toContain(authResult.refreshToken);
    expect(response.cookies.get("effect_access")).toEqual({
      value: authResult.accessToken,
      options: {
        httpOnly: true,
        maxAge: 900_000,
        path: "/",
        sameSite: "lax",
        secure: false,
      },
    });
    expect(response.cookies.get("effect_refresh")).toEqual({
      value: authResult.refreshToken,
      options: {
        httpOnly: true,
        maxAge: 2_592_000_000,
        path: "/",
        sameSite: "lax",
        secure: false,
      },
    });
    expect(response.cookies.get("effect_csrf")).toEqual({
      value: authResult.csrfToken,
      options: {
        httpOnly: false,
        maxAge: 2_592_000_000,
        path: "/",
        sameSite: "lax",
        secure: false,
      },
    });
  });

  it("rotates cookies from the refresh cookie without returning tokens", async () => {
    const response = responseDouble();
    const sessionService = { refresh: vi.fn().mockResolvedValue(authResult) };
    const controller = new AuthController(
      { request: vi.fn() } as never,
      sessionService as never,
      authOptions,
    );

    const body = await controller.refresh(request, response.response);

    expect(sessionService.refresh).toHaveBeenCalledWith(
      "refresh-secret",
      expect.objectContaining({ requestId: "req_controller" }),
    );
    expect(body).toEqual({
      user: authResult.user,
      sessionId: authResult.sessionId,
    });
    expect(JSON.stringify(body)).not.toContain(authResult.refreshToken);
    expect(response.cookies.get("effect_refresh")?.value).toBe(
      authResult.refreshToken,
    );
  });

  it("rejects a malformed refresh cookie with the normal session error", async () => {
    const response = responseDouble();
    const sessionService = { refresh: vi.fn() };
    const controller = new AuthController(
      { request: vi.fn() } as never,
      sessionService as never,
      authOptions,
    );

    await expect(
      controller.refresh(
        {
          ...request,
          headers: { ...request.headers, cookie: "effect_refresh=%" },
        },
        response.response as never,
      ),
    ).rejects.toMatchObject({
      response: { error: { code: "SESSION_INVALID" } },
      status: 401,
    });
    expect(sessionService.refresh).not.toHaveBeenCalled();
  });

  it("clears all auth cookies on logout", async () => {
    const response = responseDouble();
    const sessionService = { logout: vi.fn().mockResolvedValue(undefined) };
    const controller = new AuthController(
      { request: vi.fn() } as never,
      sessionService as never,
      authOptions,
    );

    await controller.logout(request, response.response);

    expect(sessionService.logout).toHaveBeenCalledWith(
      authResult.sessionId,
      authResult.user.id,
      expect.objectContaining({ requestId: "req_controller" }),
    );
    expect([...response.cleared.keys()].sort()).toEqual([
      "effect_access",
      "effect_csrf",
      "effect_refresh",
    ]);
    expect(response.cleared.get("effect_access")).toEqual({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    });
    expect(response.cleared.get("effect_refresh")).toEqual({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    });
    expect(response.cleared.get("effect_csrf")).toEqual({
      httpOnly: false,
      path: "/",
      sameSite: "lax",
      secure: false,
    });
  });

  it("uses the bounded session-page contract for the active user's sessions", async () => {
    const page = {
      items: [
        {
          id: authResult.sessionId,
          device: "Vitest Browser",
          ipAddress: "127.0.0.0",
          createdAt: "2026-08-28T00:00:00.000Z",
          lastUsedAt: "2026-08-28T00:00:00.000Z",
          current: true,
        },
      ],
      meta: { page: 2, pageSize: 1, total: 3, pageCount: 3 },
    };
    const sessionService = { listSessions: vi.fn().mockResolvedValue(page) };
    const controller = new AuthController(
      { request: vi.fn() } as never,
      sessionService as never,
      authOptions,
    );

    const body = await controller.listSessions(
      { page: "2", pageSize: "1" },
      request,
    );

    expect(sessionService.listSessions).toHaveBeenCalledWith(
      authResult.user.id,
      authResult.sessionId,
      { page: 2, pageSize: 1 },
    );
    expect(() => AuthSessionPageSchema.parse(body)).not.toThrow();
    expect(AuthSessionListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
    });
    expect(() =>
      AuthSessionListQuerySchema.parse({ page: "0", pageSize: "1" }),
    ).toThrow();
    expect(() =>
      AuthSessionListQuerySchema.parse({ page: "10001", pageSize: "1" }),
    ).toThrow();
    expect(() =>
      AuthSessionListQuerySchema.parse({ page: "1", pageSize: "101" }),
    ).toThrow();
  });
});
