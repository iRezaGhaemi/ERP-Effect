import { describe, expect, it } from "vitest";

import { parseEnv, parseMigrationEnv } from "./index.js";

const baseEnv = {
  NODE_ENV: "development",
  API_PORT: "3001",
  DATABASE_URL: "postgres://effect:effect@localhost:5432/effect_erp",
  WEB_ORIGIN: "http://localhost:3000",
  INTERNAL_API_URL: "http://localhost:3001",
  AUTH_RATE_LIMIT_SECRET: "r".repeat(32),
  JWT_ACCESS_SECRET: "j".repeat(32),
};

describe("parseEnv", () => {
  it("requires the distinct password-auth rate-limit secret without bootstrap or OTP inputs", () => {
    const passwordEnv = {
      NODE_ENV: "development",
      API_PORT: "3001",
      DATABASE_URL: "postgres://effect:effect@localhost:5432/effect_erp",
      WEB_ORIGIN: "http://localhost:3000",
      INTERNAL_API_URL: "http://localhost:3001",
      JWT_ACCESS_SECRET: "j".repeat(32),
      AUTH_RATE_LIMIT_SECRET: "r".repeat(32),
    };

    expect(parseEnv(passwordEnv).AUTH_RATE_LIMIT_SECRET).toBe("r".repeat(32));
    expect(() =>
      parseEnv({ ...passwordEnv, AUTH_RATE_LIMIT_SECRET: "r".repeat(31) }),
    ).toThrow(/AUTH_RATE_LIMIT_SECRET/);
  });

  it.each(["AUTH_RATE_LIMIT_SECRET", "JWT_ACCESS_SECRET"] as const)(
    "rejects a %s shorter than 32 characters",
    (key) => {
      expect(() => parseEnv({ ...baseEnv, [key]: "x".repeat(31) })).toThrow(
        key,
      );
    },
  );

  it("rejects a missing DATABASE_URL", () => {
    const { DATABASE_URL: _databaseUrl, ...withoutDatabaseUrl } = baseEnv;

    expect(() => parseEnv(withoutDatabaseUrl)).toThrow(/DATABASE_URL/);
  });

  it("rejects production configuration that disables secure cookies", () => {
    expect(() =>
      parseEnv({
        ...baseEnv,
        NODE_ENV: "production",
        COOKIE_SECURE: "false",
      }),
    ).toThrow(/COOKIE_SECURE/);
  });
});

describe("parseMigrationEnv", () => {
  it("requires a dedicated migration URL without falling back to the runtime URL", () => {
    expect(() =>
      parseMigrationEnv({
        DATABASE_URL: "postgres://effect:effect@localhost:5432/effect_erp",
      }),
    ).toThrow(/DATABASE_MIGRATION_URL/);
  });

  it("returns the dedicated migration URL when both database URLs are present", () => {
    expect(
      parseMigrationEnv({
        DATABASE_URL: "postgres://effect:effect@localhost:5432/effect_erp",
        DATABASE_MIGRATION_URL:
          "postgres://effect_migrator:effect-migrator-development@localhost:5432/effect_erp",
      }),
    ).toEqual({
      DATABASE_MIGRATION_URL:
        "postgres://effect_migrator:effect-migrator-development@localhost:5432/effect_erp",
    });
  });
});
