import { describe, expect, it, vi } from "vitest";

import { TokenService } from "./token.service.js";

const options = {
  rateLimitSecret: "token-test-rate-limit-secret-at-least-32-characters",
  jwtAccessSecret: "token-test-jwt-secret-at-least-32-characters",
  accessTtlSeconds: 900,
  refreshTtlDays: 30,
  cookieSecure: false,
};

function decodeJson(value: string): unknown {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

describe("TokenService", () => {
  it("signs a 15-minute HS256 access token with the authenticated principal", () => {
    vi.useFakeTimers();
    try {
      const now = new Date("2026-08-30T12:00:00.000Z");
      vi.setSystemTime(now);
      const tokens = new TokenService(options);

      const token = tokens.signAccessToken({
        userId: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f",
        sessionId: "7f29f0a6-ecae-4f46-afec-c6fe306502bd",
        phone: "+989121234567",
        credentialVersion: 7,
        mustChangePassword: true,
      });
      const [encodedHeader] = token.split(".");

      expect(decodeJson(encodedHeader ?? "")).toEqual({
        alg: "HS256",
        typ: "JWT",
      });
      expect(tokens.verifyAccessToken(token)).toEqual({
        sub: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f",
        sid: "7f29f0a6-ecae-4f46-afec-c6fe306502bd",
        phone: "+989121234567",
        cv: 7,
        mcp: true,
        iat: Math.floor(now.getTime() / 1_000),
        exp: Math.floor(now.getTime() / 1_000) + 900,
      });

      vi.setSystemTime(new Date(now.getTime() + 900_001));
      expect(tokens.verifyAccessToken(token)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a changed signature and produces a 32-byte opaque refresh token", () => {
    const tokens = new TokenService(options);
    const accessToken = tokens.signAccessToken({
      userId: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f",
      sessionId: "7f29f0a6-ecae-4f46-afec-c6fe306502bd",
      phone: "+989121234567",
      credentialVersion: 7,
      mustChangePassword: false,
    });
    const tampered = `${accessToken.slice(0, -1)}${
      accessToken.endsWith("a") ? "b" : "a"
    }`;
    const refreshToken = tokens.generateRefreshToken();

    expect(tokens.verifyAccessToken(tampered)).toBeNull();
    expect(Buffer.from(refreshToken, "base64url")).toHaveLength(32);
    expect(tokens.hashOpaqueToken(refreshToken)).toMatch(/^[a-f\d]{64}$/);
  });
});
