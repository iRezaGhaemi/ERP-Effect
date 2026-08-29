import { AuditWriter } from "@effect/audit/server";
import { UsersFacade } from "@effect/users/server";
import { startPostgresContainer } from "@effect-erp/testing";
import { DataSource } from "typeorm";
import { afterEach, describe, expect, it } from "vitest";

import { CreateUsers202608280001 } from "../../../../platform/database/src/migrations/202608280001-create-users.js";
import { CreateAuditLogs202608280002 } from "../../../../platform/database/src/migrations/202608280002-create-audit-logs.js";
import { ReconcileAuditLogsActorNull202608280003 } from "../../../../platform/database/src/migrations/202608280003-reconcile-audit-logs-actor-null.js";
import { HardenAuditLogBoundary202608280004 } from "../../../../platform/database/src/migrations/202608280004-harden-audit-log-boundary.js";
import { CreateAccessControl202608280005 } from "../../../../platform/database/src/migrations/202608280005-create-access-control.js";
import { CreateOtp202608280006 } from "../../../../platform/database/src/migrations/202608280006-create-otp.js";
import { entityRegistry } from "../../../../platform/database/src/entity-registry.js";
import { OtpService } from "./otp.service.js";
import { RateLimitService } from "./rate-limit.service.js";
import { FakeSmsProvider } from "./sms/fake-sms.provider.js";

const dataSources: DataSource[] = [];

afterEach(async () => {
  await Promise.all(dataSources.splice(0).map((source) => source.destroy()));
});

async function prepareDatabase(): Promise<{
  runtime: DataSource;
  stop: () => Promise<void>;
}> {
  const container = await startPostgresContainer();
  const migrator = new DataSource({
    type: "postgres",
    host: container.getHost(),
    port: container.getMappedPort(5432),
    username: "effect",
    password: "effect",
    database: "effect_erp",
    entities: entityRegistry,
    migrations: [
      CreateUsers202608280001,
      CreateAuditLogs202608280002,
      ReconcileAuditLogsActorNull202608280003,
      HardenAuditLogBoundary202608280004,
      CreateAccessControl202608280005,
      CreateOtp202608280006,
    ],
    synchronize: false,
  });
  dataSources.push(migrator);
  await migrator.initialize();
  await migrator.query(
    `CREATE ROLE effect_runtime LOGIN PASSWORD 'runtime' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`,
  );
  await migrator.query(
    `GRANT CONNECT ON DATABASE effect_erp TO effect_runtime`,
  );
  await migrator.query(`GRANT USAGE ON SCHEMA public TO effect_runtime`);
  await migrator.query(
    `ALTER DEFAULT PRIVILEGES FOR ROLE effect IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO effect_runtime`,
  );
  await migrator.runMigrations();

  const runtime = new DataSource({
    type: "postgres",
    host: container.getHost(),
    port: container.getMappedPort(5432),
    username: "effect_runtime",
    password: "runtime",
    database: "effect_erp",
    entities: entityRegistry,
    synchronize: false,
  });
  dataSources.push(runtime);
  await runtime.initialize();
  return {
    runtime,
    stop: async () => {
      await Promise.all(
        dataSources.splice(0).map((source) => source.destroy()),
      );
      await container.stop();
    },
  };
}

describe("OTP request persistence", () => {
  it("uses hashed atomic buckets and never stores a raw delivered code", async () => {
    const database = await prepareDatabase();
    try {
      await database.runtime.query(
        `INSERT INTO users (phone, "firstName", "lastName", status) VALUES ($1, $2, $3, 'ACTIVE')`,
        ["+989121234567", "کاربر", "فعال"],
      );
      const sms = new FakeSmsProvider();
      const pepper = "integration-otp-pepper-at-least-32-characters";
      const limiter = new RateLimitService(database.runtime, pepper);
      const service = new OtpService(
        database.runtime,
        new UsersFacade(database.runtime),
        limiter,
        sms,
        new AuditWriter(database.runtime),
        { pepper, ttlSeconds: 120, resendSeconds: 60 },
      );

      const response = await service.request(
        { phone: "09121234567" },
        {
          requestId: "req_integration",
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
        },
      );
      const code = sms.sent[0]?.message.match(/\d{6}/)?.[0];
      const [challenge] = await database.runtime.query<
        Array<{ codeHash: string; attempts: number }>
      >(
        `SELECT code_hash AS "codeHash", attempts FROM otp_challenges WHERE id = $1`,
        [response.challengeId],
      );
      const buckets = await database.runtime.query<Array<{ keyHash: string }>>(
        `SELECT key_hash AS "keyHash" FROM rate_limit_buckets`,
      );

      expect(challenge).toMatchObject({
        attempts: 0,
        codeHash: expect.stringMatching(/^[a-f\d]{64}$/),
      });
      expect(challenge?.codeHash).not.toBe(code);
      expect(JSON.stringify(challenge)).not.toContain(code);
      expect(buckets).toHaveLength(2);
      expect(JSON.stringify(buckets)).not.toContain("+989121234567");
      expect(JSON.stringify(buckets)).not.toContain("127.0.0.1");
    } finally {
      await database.stop();
    }
  });

  it("allows exactly five concurrent requests in one phone window", async () => {
    const database = await prepareDatabase();
    try {
      const limiter = new RateLimitService(
        database.runtime,
        "integration-otp-pepper-at-least-32-characters",
      );
      const results = await Promise.allSettled(
        Array.from({ length: 6 }, () =>
          limiter.consume("otp:phone", "+989121234567", {
            limit: 5,
            windowSeconds: 600,
          }),
        ),
      );

      expect(
        results.filter(({ status }) => status === "fulfilled"),
      ).toHaveLength(5);
      expect(
        results.filter(({ status }) => status === "rejected"),
      ).toHaveLength(1);
    } finally {
      await database.stop();
    }
  });

  it("commits invalidation and a safe audit event when delivery fails", async () => {
    const database = await prepareDatabase();
    try {
      const [{ id: userId }] = await database.runtime.query<
        Array<{ id: string }>
      >(
        `INSERT INTO users (phone, "firstName", "lastName", status) VALUES ($1, $2, $3, 'ACTIVE') RETURNING id`,
        ["+989121234567", "کاربر", "فعال"],
      );
      const pepper = "integration-otp-pepper-at-least-32-characters";
      const service = new OtpService(
        database.runtime,
        new UsersFacade(database.runtime),
        new RateLimitService(database.runtime, pepper),
        {
          send: async () => {
            throw new Error("provider detail must not be persisted");
          },
        },
        new AuditWriter(database.runtime),
        { pepper, ttlSeconds: 120, resendSeconds: 60 },
      );

      const response = await service.request(
        { phone: "09121234567" },
        {
          requestId: "req_delivery_failure",
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
        },
      );
      expect(response).toEqual({
        accepted: true,
        challengeId: expect.any(String),
        retryAfterSeconds: 60,
      });

      const [challenge] = await database.runtime.query<
        Array<{ invalidatedAt: Date; userId: string }>
      >(
        `SELECT invalidated_at AS "invalidatedAt", user_id AS "userId" FROM otp_challenges`,
      );
      const [audit] = await database.runtime.query<
        Array<{ action: string; metadata: Record<string, unknown> }>
      >(
        `SELECT action, metadata FROM audit_logs WHERE action = 'auth.otp_delivery_failed'`,
      );
      expect(challenge).toMatchObject({
        invalidatedAt: expect.any(Date),
        userId,
      });
      expect(audit).toEqual({
        action: "auth.otp_delivery_failed",
        metadata: {},
      });
    } finally {
      await database.stop();
    }
  });
});
