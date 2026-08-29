import type { QueryRunner } from "typeorm";
import { describe, expect, it } from "vitest";

import { CreateOtp202608280006 } from "../../../../platform/database/src/migrations/202608280006-create-otp.js";

describe("OTP migration 006", () => {
  it("creates challenge and hashed bucket boundaries with the next free migration number", async () => {
    const queries: string[] = [];
    const runner = {
      query: async (sql: string) => {
        queries.push(sql);
      },
    } as unknown as QueryRunner;
    const migration = new CreateOtp202608280006();

    await migration.up(runner);

    const sql = queries.join("\n");
    expect(migration.name).toBe("CreateOtp202608280006");
    expect(sql).toContain('CREATE TABLE "otp_challenges"');
    expect(sql).toContain('"code_hash" character(64) NOT NULL');
    expect(sql).toContain('CREATE TABLE "rate_limit_buckets"');
    expect(sql).toContain('"key_hash" character(64) NOT NULL');
    expect(sql).toContain(
      'CONSTRAINT "PK_rate_limit_buckets_scope_key_hash" PRIMARY KEY ("scope", "key_hash")',
    );
    expect(sql).toContain('"ix_otp_challenges_phone_created_at"');
    expect(sql).toContain('"ix_otp_challenges_expires_at"');
    expect(sql).toContain('"ix_rate_limit_buckets_blocked_until"');
  });
});
