import type { AuthenticatedPrincipal } from "@effect-erp/contracts";
import { TokenService } from "@effect/auth/server";
import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { CsrfGuard } from "../src/common/csrf.guard.js";

const principal: AuthenticatedPrincipal = {
  userId: "00000000-0000-4000-8000-000000000001",
  sessionId: "00000000-0000-4000-8000-000000000002",
  phone: "+989121234567",
  permissions: ["users:create"],
};

const tokenService = new TokenService({
  pepper: "csrf-guard-test-otp-pepper-at-least-32-characters",
  ttlSeconds: 120,
  resendSeconds: 60,
  jwtAccessSecret: "csrf-guard-test-jwt-secret-at-least-32-characters",
  accessTtlSeconds: 900,
  refreshTtlDays: 30,
  cookieSecure: false,
});

function contextFor(token: string): ExecutionContext {
  const request = {
    method: "POST",
    path: "/api/v1/users",
    user: principal,
    headers: {
      cookie: `effect_csrf=${token}`,
      "x-csrf-token": token,
    },
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe("CsrfGuard token bounds", () => {
  it("accepts a token produced by the session token issuer", () => {
    const token = tokenService.generateCsrfToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(new CsrfGuard().canActivate(contextFor(token))).toBe(true);
  });

  it.each([
    ["an equal malformed token", ".".repeat(43)],
    ["an equal oversized token", "a".repeat(100_000)],
  ])("rejects %s before accepting it as a CSRF match", (_label, token) => {
    expect(() => new CsrfGuard().canActivate(contextFor(token))).toThrow(
      expect.objectContaining({ code: "CSRF_INVALID" }),
    );
  });
});
