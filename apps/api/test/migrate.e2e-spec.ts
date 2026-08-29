import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("migration entrypoint", () => {
  it("refuses to fall back to the runtime database URL", () => {
    const { DATABASE_MIGRATION_URL: _migrationUrl, ...environment } =
      process.env;
    const result = spawnSync(process.execPath, ["dist/migrate.js"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...environment,
        DATABASE_URL: "postgres://runtime:runtime@127.0.0.1:1/runtime",
      },
      timeout: 10_000,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("DATABASE_MIGRATION_URL");
    expect(result.stderr).not.toContain("ECONNREFUSED");
  });
});
