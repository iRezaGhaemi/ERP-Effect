import type { QueryRunner } from "typeorm";
import { describe, expect, it } from "vitest";

import { CreateOtp202608280006 } from "../../../../platform/database/src/migrations/202608280006-create-otp.js";
import { CreateOtpDeliveryOutbox202608280007 } from "../../../../platform/database/src/migrations/202608280007-create-otp-delivery-outbox.js";

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

describe("OTP delivery outbox migration 007", () => {
  it("adds constrained encrypted delivery state without rewriting migration 006", async () => {
    const queries: string[] = [];
    const runner = {
      query: async (sql: string) => {
        queries.push(sql);
      },
    } as unknown as QueryRunner;
    const migration = new CreateOtpDeliveryOutbox202608280007();

    await migration.up(runner);

    const sql = queries.join("\n");
    expect(migration.name).toBe("CreateOtpDeliveryOutbox202608280007");
    expect(sql).toContain('CREATE TABLE "otp_delivery_jobs"');
    expect(sql).toContain('"code_ciphertext" text NOT NULL');
    expect(sql).toContain('"code_nonce" character varying(24) NOT NULL');
    expect(sql).toContain('"code_tag" character varying(24) NOT NULL');
    expect(sql).toContain('CONSTRAINT "CK_otp_delivery_jobs_status"');
    expect(sql).toContain('CONSTRAINT "FK_otp_delivery_jobs_challenge_id"');
    expect(sql).toContain('"ix_otp_delivery_jobs_ready"');
    expect(sql).toContain('"ix_otp_delivery_jobs_lease_expires_at"');
    expect(sql).not.toContain("123456");
  });
});
