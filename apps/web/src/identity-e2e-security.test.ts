import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const identitySource = readFileSync(resolve(process.cwd(), "e2e/identity.spec.ts"), "utf8");

describe("credential-bearing identity E2E", () => {
  it("disables Playwright tracing in the journey that submits real credentials", () => {
    const traceSettings = [...identitySource.matchAll(/trace:\s*["']([^"']+)["']/g)].map((match) => match[1]);
    expect(traceSettings).toEqual(["off"]);
  });

  it("requires bootstrap credentials and has no committed changed or temporary password", () => {
    expect(identitySource).toContain("process.env.E2E_ADMIN_USERNAME");
    expect(identitySource).toContain("process.env.E2E_ADMIN_PASSWORD");
    expect(identitySource).not.toMatch(/process\.env\.E2E_ADMIN_(?:USERNAME|PASSWORD)\s*(?:\?\?|\|\|)/);
    expect(identitySource).not.toContain("E2E_ADMIN_CHANGED_PASSWORD");
    expect(identitySource).not.toMatch(/(?:changed|temporary)\w*Password\s*=\s*["'`]/i);
    expect(identitySource).not.toMatch(/getByLabel\([^\n]*گذرواژه[^\n]*\)\.fill\(["'`]/);
    expect(identitySource).toContain("randomBytes(");
  });

  it("uses exact accessible labels for every password field so reveal buttons cannot collide", () => {
    const passwordFills = identitySource
      .split("\n")
      .filter((line) => line.includes("getByLabel") && line.includes("گذرواژه") && line.includes(".fill("));
    expect(passwordFills.length).toBeGreaterThan(0);
    expect(passwordFills.every((line) => line.includes("{ exact: true }"))).toBe(true);
  });
});
