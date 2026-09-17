import { ApiError } from "@effect-erp/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthClient } from "./auth-client.js";

const userId = "013a40c7-82e7-4435-a5d6-988b03fdce37";
const sessionId = "35cce04f-5ac1-497c-9798-951e935cdcf0";
const session = {
  user: {
    id: userId,
    phone: "+989121234567",
    firstName: "سارا",
    lastName: "رضایی",
    status: "ACTIVE",
    username: "sara.rezaei",
    credentialsReady: true,
    mustChangePassword: false,
    lastLoginAt: "2026-09-01T10:00:00.000Z",
    createdAt: "2026-08-28T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  },
  sessionId,
};

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "effect_csrf=; Max-Age=0; path=/";
});

describe("AuthClient", () => {
  it("posts validated username/password credentials and parses the complete session response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(session));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new AuthClient().login({ username: " SARA.REZAEI ", password: "Login secret" })).resolves.toEqual(session);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/auth/login");
    expect(options).toMatchObject({ method: "POST", credentials: "include" });
    expect(JSON.parse(options.body as string)).toEqual({ username: "sara.rezaei", password: "Login secret" });
    expect((options.headers as Headers).has("x-csrf-token")).toBe(false);
  });

  it("rejects invalid login input before a request can carry it", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(() => new AuthClient().login({ username: "نا", password: "secret" })).toThrow(/نام کاربری/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid login success payload through the shared response schema", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ...session, sessionId: "not-a-uuid" })));

    await expect(new AuthClient().login({ username: "sara.rezaei", password: "secret" })).rejects.toMatchObject({ name: "ZodError" });
  });

  it("uses the CSRF-bearing request path for self-service password changes", async () => {
    document.cookie = "effect_csrf=csrf-token; path=/";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ...session, sessionId: "e8292771-e347-4f55-ad5f-ed813cfa42b5" }));
    vi.stubGlobal("fetch", fetchMock);

    await new AuthClient().changePassword({ currentPassword: "Old secret phrase", newPassword: "New secret phrase 123!" });

    expectMutation(fetchMock, "/api/v1/auth/password/change", {
      currentPassword: "Old secret phrase",
      newPassword: "New secret phrase 123!",
    });
  });

  it("uses the exact CSRF-bearing administrator credential setup endpoint", async () => {
    document.cookie = "effect_csrf=csrf-token; path=/";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new AuthClient().setupCredentials(userId, {
      username: " NEW.USER ",
      initialPassword: "Initial secret phrase 123!",
      actorPassword: "Administrator secret",
    })).resolves.toBeUndefined();

    expectMutation(fetchMock, `/api/v1/users/${userId}/credentials`, {
      username: "new.user",
      initialPassword: "Initial secret phrase 123!",
      actorPassword: "Administrator secret",
    });
  });

  it("uses the exact CSRF-bearing administrator reset endpoint", async () => {
    document.cookie = "effect_csrf=csrf-token; path=/";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new AuthClient().resetPassword(userId, {
      newPassword: "Replacement secret 123!",
      actorPassword: "Administrator secret",
    })).resolves.toBeUndefined();

    expectMutation(fetchMock, `/api/v1/users/${userId}/password/reset`, {
      newPassword: "Replacement secret 123!",
      actorPassword: "Administrator secret",
    });
  });

  it("fails locally without a CSRF cookie before an authenticated mutation", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(new AuthClient().changePassword({ currentPassword: "Old secret", newPassword: "New secret phrase 123!" })).rejects.toMatchObject<ApiError>({ code: "CSRF_TOKEN_MISSING" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("adds the CSRF header and cookies when revoking a session", async () => {
    document.cookie = "effect_csrf=csrf-token; path=/";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new AuthClient().revokeSession(sessionId)).resolves.toBeUndefined();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/v1/auth/sessions/${sessionId}`);
    expect(options.method).toBe("DELETE");
    expect(options.credentials).toBe("include");
    expect((options.headers as Headers).get("x-csrf-token")).toBe("csrf-token");
  });

  it("converts a stable API error envelope into ApiError without including submitted secrets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: { code: "INVALID_CREDENTIALS", message: "اطلاعات ورود نامعتبر است.", fields: {}, requestId: "request-42" } }, 401)));

    const password = "Never expose this password";
    const failure = await new AuthClient().login({ username: "sara.rezaei", password }).catch((error: unknown) => error);
    expect(failure).toMatchObject<ApiError>({ code: "INVALID_CREDENTIALS", requestId: "request-42" });
    expect(String(failure)).not.toContain(password);
    expect(JSON.stringify(failure)).not.toContain(password);
  });
});

function expectMutation(fetchMock: ReturnType<typeof vi.fn>, url: string, body: object) {
  const [calledUrl, options] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(calledUrl).toBe(url);
  expect(options).toMatchObject({ method: "POST", credentials: "include" });
  expect((options.headers as Headers).get("x-csrf-token")).toBe("csrf-token");
  expect(JSON.parse(options.body as string)).toEqual(body);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
