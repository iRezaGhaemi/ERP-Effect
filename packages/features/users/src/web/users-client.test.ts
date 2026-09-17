import { afterEach, describe, expect, it, vi } from "vitest";

import { UsersClient } from "./users-client.js";

const createdUser = {
  id: "013a40c7-82e7-4435-a5d6-988b03fdce37",
  phone: "+989121234567",
  firstName: "سارا",
  lastName: "رضایی",
  status: "ACTIVE",
  username: "sara.rezaei",
  credentialsReady: true,
  mustChangePassword: true,
  lastLoginAt: null,
  createdAt: "2026-08-28T10:00:00.000Z",
  updatedAt: "2026-08-28T10:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "effect_csrf=; Max-Age=0; path=/";
});

describe("UsersClient", () => {
  it("validates and posts the complete password-user payload through the CSRF request path", async () => {
    document.cookie = "effect_csrf=csrf-token; path=/";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(createdUser), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const input = { phone: "09121234567", firstName: "سارا", lastName: "رضایی", username: " SARA.REZAEI ", initialPassword: "Initial secret phrase 123!" };

    await expect(new UsersClient().create(input)).resolves.toEqual(createdUser);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/users");
    expect(options).toMatchObject({ method: "POST", credentials: "include" });
    expect((options.headers as Headers).get("x-csrf-token")).toBe("csrf-token");
    expect(JSON.parse(options.body as string)).toEqual({ ...input, username: "sara.rezaei" });
  });

  it("rejects profile-only creation locally before a request can omit required credentials", () => {
    document.cookie = "effect_csrf=csrf-token; path=/";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(createdUser), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    expect(() => new UsersClient().create({ phone: "09121234567", firstName: "سارا", lastName: "رضایی" })).toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
