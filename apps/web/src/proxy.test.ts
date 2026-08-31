import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy.js";

function request(path: string, cookie?: string) {
  const url = `https://effect.example${path}`;
  return cookie ? new NextRequest(url, { headers: { cookie } }) : new NextRequest(url);
}

describe("proxy", () => {
  it("redirects a protected route without an access cookie to login", () => {
    const response = proxy(request("/settings/sessions"));
    expect(response.headers.get("location")).toBe("https://effect.example/login?next=%2Fsettings%2Fsessions");
  });

  it("allows a protected route through when the cookie-presence gate is satisfied", () => {
    const response = proxy(request("/dashboard", "effect_access=stale-or-valid"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects an authenticated login visit to the dashboard", () => {
    const response = proxy(request("/login", "effect_access=present"));
    expect(response.headers.get("location")).toBe("https://effect.example/dashboard");
  });

  it("allows the recovery login URL through even when a stale access cookie exists", () => {
    const response = proxy(request("/login?recovery=1", "effect_access=expired"));
    expect(response.headers.get("location")).toBeNull();
  });
});
