import { describe, expect, it, vi } from "vitest";

import { AuthController } from "./auth.controller.js";

const options = {
  rateLimitSecret: "controller-rate-limit-secret-at-least-32-characters",
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
    username: "operator",
    credentialsReady: true,
    mustChangePassword: false,
    lastLoginAt: "2026-09-01T00:00:00.000Z",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  sessionId: "7f29f0a6-ecae-4f46-afec-c6fe306502bd",
  accessToken: "access.jwt.value",
  refreshToken: "refresh-secret",
  csrfToken: "csrf-secret",
};

function responseDouble() {
  const cookies = new Map<string, { value: string; options: Record<string, unknown> }>();
  const cleared = new Map<string, Record<string, unknown>>();
  return {
    cookies,
    cleared,
    response: {
      cookie: vi.fn((name: string, value: string, cookieOptions: Record<string, unknown>) =>
        cookies.set(name, { value, options: cookieOptions })),
      clearCookie: vi.fn((name: string, cookieOptions: Record<string, unknown>) =>
        cleared.set(name, cookieOptions)),
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
    credentialVersion: 1,
    mustChangePassword: false,
  },
};

describe("AuthController password session boundary", () => {
  it("sets HttpOnly cookies for login and never returns tokens", async () => {
    const response = responseDouble();
    const passwordAuth = { login: vi.fn().mockResolvedValue(authResult) };
    const controller = new AuthController(passwordAuth as never, {} as never, options);

    const body = await controller.login(
      { username: "operator", password: "A-strong-passphrase-123!" },
      request,
      response.response,
    );

    expect(passwordAuth.login).toHaveBeenCalledWith(
      { username: "operator", password: "A-strong-passphrase-123!" },
      expect.objectContaining({ requestId: "req_controller" }),
    );
    expect(body).toEqual({ user: authResult.user, sessionId: authResult.sessionId });
    expect(JSON.stringify(body)).not.toContain(authResult.accessToken);
    expect(response.cookies.get("effect_access")).toMatchObject({
      value: authResult.accessToken,
      options: { httpOnly: true, secure: false },
    });
    expect(response.cookies.get("effect_refresh")?.options.httpOnly).toBe(true);
    expect(response.cookies.get("effect_csrf")?.options.httpOnly).toBe(false);
  });

  it("changes a password through the authenticated credential service and rotates cookies", async () => {
    const response = responseDouble();
    const passwordAuth = { changePassword: vi.fn().mockResolvedValue(authResult) };
    const controller = new AuthController(passwordAuth as never, {} as never, options);
    const input = {
      currentPassword: "Old-strong-passphrase-123!",
      newPassword: "New-strong-passphrase-456!",
    };

    const body = await controller.changePassword(input, request, response.response);

    expect(passwordAuth.changePassword).toHaveBeenCalledWith(
      authResult.user.id,
      input,
      expect.objectContaining({
        auth: expect.objectContaining({ credentialVersion: 1 }),
      }),
    );
    expect(body).toEqual({ user: authResult.user, sessionId: authResult.sessionId });
    expect(response.cookies.get("effect_refresh")?.value).toBe("refresh-secret");
  });

  it("rotates refresh cookies and rejects malformed refresh cookies uniformly", async () => {
    const response = responseDouble();
    const sessions = { refresh: vi.fn().mockResolvedValue(authResult) };
    const controller = new AuthController({} as never, sessions as never, options);

    await expect(controller.refresh(request, response.response)).resolves.toEqual({
      user: authResult.user,
      sessionId: authResult.sessionId,
    });
    expect(sessions.refresh).toHaveBeenCalledWith(
      "refresh-secret",
      expect.objectContaining({ requestId: "req_controller" }),
    );
    await expect(
      controller.refresh(
        { ...request, headers: { ...request.headers, cookie: "effect_refresh=%" } },
        response.response,
      ),
    ).rejects.toMatchObject({ code: "SESSION_INVALID" });
  });

  it("preserves logout, bounded listing, and explicit revoke behavior", async () => {
    const response = responseDouble();
    const page = { items: [], meta: { page: 1, pageSize: 20, total: 0, pageCount: 0 } };
    const sessions = {
      logout: vi.fn(),
      listSessions: vi.fn().mockResolvedValue(page),
      revokeSession: vi.fn(),
    };
    const controller = new AuthController({} as never, sessions as never, options);

    await expect(controller.logout(request, response.response)).resolves.toEqual({ ok: true });
    await expect(controller.listSessions({ page: 1, pageSize: 20 }, request)).resolves.toEqual(page);
    await expect(controller.revokeSession({ id: authResult.sessionId }, request)).resolves.toEqual({ ok: true });
    expect(sessions.logout).toHaveBeenCalledWith(authResult.sessionId, authResult.user.id, expect.anything());
    expect(sessions.listSessions).toHaveBeenCalledWith(authResult.user.id, authResult.sessionId, { page: 1, pageSize: 20 });
    expect(sessions.revokeSession).toHaveBeenCalledWith(authResult.sessionId, authResult.user.id, expect.anything());
    expect([...response.cleared.keys()].sort()).toEqual(["effect_access", "effect_csrf", "effect_refresh"]);
  });
});
