import { ApiError } from "@effect-erp/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthClient } from "./auth-client.js";

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "effect_csrf=; Max-Age=0; path=/";
});

describe("AuthClient", () => {
  it("validates request data before making an OTP request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(() => new AuthClient().requestOtp({ phone: "invalid" })).toThrow(/شماره موبایل معتبر نیست/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses same-origin cookie credentials and parses the OTP response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ accepted: true, challengeId, retryAfterSeconds: 60 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new AuthClient().requestOtp({ phone: "09121234567" })).resolves.toEqual({ accepted: true, challengeId, retryAfterSeconds: 60 });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/auth/otp/request");
    expect(options.credentials).toBe("include");
    expect(options.method).toBe("POST");
    expect(options.headers).toBeInstanceOf(Headers);
    expect((options.headers as Headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(String(options.body))).toEqual({ phone: "09121234567" });
  });

  it("rejects an invalid success payload through its shared response schema", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ accepted: true, challengeId: "not-a-uuid", retryAfterSeconds: 60 })));

    await expect(new AuthClient().requestOtp({ phone: "09121234567" })).rejects.toMatchObject({ name: "ZodError" });
  });

  it("fails locally without a CSRF cookie before an authenticated mutation", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(new AuthClient().logout()).rejects.toMatchObject<ApiError>({ code: "CSRF_TOKEN_MISSING" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("adds the CSRF header and cookies when revoking a session", async () => {
    document.cookie = "effect_csrf=csrf-token; path=/";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new AuthClient().revokeSession(challengeId)).resolves.toBeUndefined();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/v1/auth/sessions/${challengeId}`);
    expect(options.method).toBe("DELETE");
    expect(options.credentials).toBe("include");
    expect((options.headers as Headers).get("x-csrf-token")).toBe("csrf-token");
  });

  it("converts a stable API error envelope into ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: { code: "AUTHENTICATION_REQUIRED", message: "نشست شما منقضی شده است.", fields: { phone: ["نامعتبر"] }, requestId: "request-42" } }, 401)));

    await expect(new AuthClient().me()).rejects.toMatchObject<ApiError>({
      code: "AUTHENTICATION_REQUIRED",
      message: "نشست شما منقضی شده است.",
      fields: { phone: ["نامعتبر"] },
      requestId: "request-42",
    });
  });
});

const challengeId = "e8292771-e347-4f55-ad5f-ed813cfa42b5";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
