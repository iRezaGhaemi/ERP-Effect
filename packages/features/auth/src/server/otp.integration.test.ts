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
import { CreateOtpDeliveryOutbox202608280007 } from "../../../../platform/database/src/migrations/202608280007-create-otp-delivery-outbox.js";
import { HardenOtpDeliveryOutbox202608280008 } from "../../../../platform/database/src/migrations/202608280008-harden-otp-delivery-outbox.js";
import { entityRegistry } from "../../../../platform/database/src/entity-registry.js";
import { OtpCodeSealer } from "./otp-code-sealer.js";
import { OtpDeliveryWorker } from "./otp-delivery.worker.js";
import { ShortOtpResponseEnvelope } from "./otp-response-envelope.js";
import { OtpService } from "./otp.service.js";
import { RateLimitService } from "./rate-limit.service.js";
import { FakeSmsProvider } from "./sms/fake-sms.provider.js";

const dataSources: DataSource[] = [];

afterEach(async () => {
  await Promise.all(
    dataSources
      .splice(0)
      .filter((source) => source.isInitialized)
      .map((source) => source.destroy()),
  );
});

async function prepareDatabase(): Promise<{
  runtime: DataSource;
  stop: () => Promise<void>;
}> {
  const container = await startPostgresContainer();
  try {
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
        CreateOtpDeliveryOutbox202608280007,
        HardenOtpDeliveryOutbox202608280008,
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
          dataSources
            .splice(0)
            .filter((source) => source.isInitialized)
            .map((source) => source.destroy()),
        );
        await container.stop();
      },
    };
  } catch (error) {
    try {
      await Promise.all(
        dataSources
          .splice(0)
          .filter((source) => source.isInitialized)
          .map((source) => source.destroy()),
      );
    } finally {
      await container.stop();
    }
    throw error;
  }
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
        {
          pepper,
          ttlSeconds: 120,
          resendSeconds: 60,
          jwtAccessSecret: "integration-jwt-secret-at-least-32-characters",
          accessTtlSeconds: 900,
          refreshTtlDays: 30,
          cookieSecure: false,
        },
        new OtpCodeSealer(pepper),
        new ShortOtpResponseEnvelope(0),
        new AuditWriter(database.runtime),
      );

      const response = await service.request(
        { phone: "09121234567" },
        {
          requestId: "req_integration",
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
        },
      );
      const [{ count }] = await database.runtime.query<
        Array<{ count: string }>
      >(`SELECT COUNT(*)::text AS count FROM otp_challenges`);
      expect(count).toBe("1");
      expect(sms.sent).toHaveLength(0);

      const [pendingJob] = await database.runtime.query<
        Array<{
          status: string;
          codeCiphertext: string;
          codeNonce: string;
          codeTag: string;
        }>
      >(
        `SELECT status, code_ciphertext AS "codeCiphertext", code_nonce AS "codeNonce", code_tag AS "codeTag" FROM otp_delivery_jobs WHERE challenge_id = $1`,
        [response.challengeId],
      );
      expect(pendingJob).toMatchObject({
        status: "PENDING",
        codeCiphertext: expect.any(String),
        codeNonce: expect.any(String),
        codeTag: expect.any(String),
      });

      const worker = new OtpDeliveryWorker(
        database.runtime,
        sms,
        new AuditWriter(database.runtime),
        new OtpCodeSealer(pepper),
        {
          enabled: false,
          pollMilliseconds: 1,
          leaseSeconds: 30,
          providerTimeoutSeconds: 5,
          activationMarginSeconds: 5,
          maxAttempts: 3,
          terminalRetentionSeconds: 86_400,
          cleanupBatchSize: 500,
          cleanupIntervalMilliseconds: 60_000,
        },
      );
      await worker.runOnce();

      const code = sms.sent[0]?.message.match(/\d{6}/)?.[0];
      const [challenge] = await database.runtime.query<
        Array<{
          codeHash: string;
          attempts: number;
          invalidatedAt: Date | null;
        }>
      >(
        `SELECT code_hash AS "codeHash", attempts, invalidated_at AS "invalidatedAt" FROM otp_challenges WHERE id = $1`,
        [response.challengeId],
      );
      const buckets = await database.runtime.query<Array<{ keyHash: string }>>(
        `SELECT key_hash AS "keyHash" FROM rate_limit_buckets`,
      );

      expect(challenge).toMatchObject({
        attempts: 0,
        codeHash: expect.stringMatching(/^[a-f\d]{64}$/),
        invalidatedAt: null,
      });
      expect(challenge?.codeHash).not.toBe(code);
      expect(JSON.stringify(challenge)).not.toContain(code);
      expect(JSON.stringify(pendingJob)).not.toContain(code);
      const [completedJob] = await database.runtime.query<
        Array<{ status: string }>
      >(`SELECT status FROM otp_delivery_jobs WHERE challenge_id = $1`, [
        response.challengeId,
      ]);
      expect(completedJob).toEqual({ status: "SUCCEEDED" });
      expect(buckets).toHaveLength(3);
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

  it("retries a durable job and lets only one worker reclaim its stale lease", async () => {
    const database = await prepareDatabase();
    try {
      await database.runtime.query(
        `INSERT INTO users (phone, "firstName", "lastName", status) VALUES ($1, $2, $3, 'ACTIVE')`,
        ["+989121234567", "کاربر", "فعال"],
      );
      const pepper = "integration-otp-pepper-at-least-32-characters";
      const service = new OtpService(
        database.runtime,
        new UsersFacade(database.runtime),
        new RateLimitService(database.runtime, pepper),
        {
          pepper,
          ttlSeconds: 120,
          resendSeconds: 60,
          jwtAccessSecret: "integration-jwt-secret-at-least-32-characters",
          accessTtlSeconds: 900,
          refreshTtlDays: 30,
          cookieSecure: false,
        },
        new OtpCodeSealer(pepper),
        new ShortOtpResponseEnvelope(0),
        new AuditWriter(database.runtime),
      );
      const response = await service.request(
        { phone: "09121234567" },
        {
          requestId: "req_reclaim",
          ipAddress: "127.0.0.3",
          userAgent: "vitest",
        },
      );
      const workerOptions = {
        enabled: false,
        pollMilliseconds: 1,
        leaseSeconds: 30,
        providerTimeoutSeconds: 5,
        activationMarginSeconds: 5,
        maxAttempts: 3,
        terminalRetentionSeconds: 86_400,
        cleanupBatchSize: 500,
        cleanupIntervalMilliseconds: 60_000,
      };
      const firstWorker = new OtpDeliveryWorker(
        database.runtime,
        { send: async () => Promise.reject(new Error("transient")) },
        new AuditWriter(database.runtime),
        new OtpCodeSealer(pepper),
        workerOptions,
      );
      await firstWorker.runOnce();
      await database.runtime.query(
        `UPDATE otp_delivery_jobs SET status = 'PROCESSING', lease_expires_at = now() - interval '1 second' WHERE challenge_id = $1`,
        [response.challengeId],
      );

      const sms = new FakeSmsProvider();
      const workers = Array.from(
        { length: 2 },
        () =>
          new OtpDeliveryWorker(
            database.runtime,
            sms,
            new AuditWriter(database.runtime),
            new OtpCodeSealer(pepper),
            workerOptions,
          ),
      );
      const results = await Promise.all(
        workers.map((worker) => worker.runOnce()),
      );
      const [state] = await database.runtime.query<
        Array<{ status: string; attempts: number; invalidatedAt: Date | null }>
      >(
        `SELECT job.status, job.attempts, challenge.invalidated_at AS "invalidatedAt" FROM otp_delivery_jobs job JOIN otp_challenges challenge ON challenge.id = job.challenge_id WHERE job.challenge_id = $1`,
        [response.challengeId],
      );

      expect(results.filter(Boolean)).toHaveLength(1);
      expect(sms.sent).toHaveLength(1);
      expect(state).toEqual({
        status: "SUCCEEDED",
        attempts: 2,
        invalidatedAt: null,
      });
    } finally {
      await database.stop();
    }
  });

  it("atomically admits one of two concurrent resends while accounting every bucket", async () => {
    const database = await prepareDatabase();
    try {
      const pepper = "integration-otp-pepper-at-least-32-characters";
      const service = new OtpService(
        database.runtime,
        new UsersFacade(database.runtime),
        new RateLimitService(database.runtime, pepper),
        {
          pepper,
          ttlSeconds: 120,
          resendSeconds: 60,
          jwtAccessSecret: "integration-jwt-secret-at-least-32-characters",
          accessTtlSeconds: 900,
          refreshTtlDays: 30,
          cookieSecure: false,
        },
        new OtpCodeSealer(pepper),
        new ShortOtpResponseEnvelope(0),
        new AuditWriter(database.runtime),
      );
      const requestContext = {
        requestId: "req_resend",
        ipAddress: "127.0.0.2",
        userAgent: "vitest",
      };

      const results = await Promise.allSettled([
        service.request({ phone: "09121234569" }, requestContext),
        service.request({ phone: "09121234569" }, requestContext),
      ]);
      const buckets = await database.runtime.query<
        Array<{ scope: string; requestCount: number }>
      >(
        `SELECT scope, request_count AS "requestCount" FROM rate_limit_buckets ORDER BY scope`,
      );

      expect(
        results.filter(({ status }) => status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results.filter(({ status }) => status === "rejected"),
      ).toHaveLength(1);
      expect(buckets).toEqual([
        { scope: "otp:ip", requestCount: 2 },
        { scope: "otp:phone", requestCount: 2 },
        { scope: "otp:resend", requestCount: 2 },
      ]);
    } finally {
      await database.stop();
    }
  });

  it("invokes terminal cleanup from the enabled worker lifecycle", async () => {
    const database = await prepareDatabase();
    try {
      await database.runtime.query(
        `INSERT INTO users (phone, "firstName", "lastName", status) VALUES ($1, $2, $3, 'ACTIVE')`,
        ["+989121234567", "کاربر", "فعال"],
      );
      const pepper = "integration-otp-pepper-at-least-32-characters";
      const service = new OtpService(
        database.runtime,
        new UsersFacade(database.runtime),
        new RateLimitService(database.runtime, pepper),
        {
          pepper,
          ttlSeconds: 120,
          resendSeconds: 60,
          jwtAccessSecret: "integration-jwt-secret-at-least-32-characters",
          accessTtlSeconds: 900,
          refreshTtlDays: 30,
          cookieSecure: false,
        },
        new OtpCodeSealer(pepper),
        new ShortOtpResponseEnvelope(0),
        new AuditWriter(database.runtime),
      );
      const response = await service.request(
        { phone: "09121234567" },
        {
          requestId: "req_cleanup_lifecycle",
          ipAddress: "127.0.0.4",
          userAgent: "vitest",
        },
      );
      const workerOptions = {
        enabled: false,
        pollMilliseconds: 10,
        leaseSeconds: 30,
        providerTimeoutSeconds: 5,
        activationMarginSeconds: 5,
        maxAttempts: 3,
        terminalRetentionSeconds: 1,
        cleanupBatchSize: 500,
        cleanupIntervalMilliseconds: 60_000,
      };
      const deliveryWorker = new OtpDeliveryWorker(
        database.runtime,
        new FakeSmsProvider(),
        new AuditWriter(database.runtime),
        new OtpCodeSealer(pepper),
        workerOptions,
      );
      await deliveryWorker.runOnce();
      await database.runtime.query(
        `UPDATE otp_challenges SET expires_at = now() - interval '2 hours' WHERE id = $1`,
        [response.challengeId],
      );
      await database.runtime.query(
        `UPDATE otp_delivery_jobs SET completed_at = now() - interval '2 hours', updated_at = now() - interval '2 hours' WHERE challenge_id = $1`,
        [response.challengeId],
      );

      const cleanupWorker = new OtpDeliveryWorker(
        database.runtime,
        new FakeSmsProvider(),
        new AuditWriter(database.runtime),
        new OtpCodeSealer(pepper),
        { ...workerOptions, enabled: true },
      );
      cleanupWorker.onApplicationBootstrap();
      try {
        await expect
          .poll(async () => {
            const [{ count }] = await database.runtime.query<
              Array<{ count: string }>
            >(`SELECT COUNT(*)::text AS count FROM otp_challenges`);
            return count;
          })
          .toBe("0");
      } finally {
        await cleanupWorker.onApplicationShutdown();
      }

      const [{ jobCount }] = await database.runtime.query<
        Array<{ jobCount: string }>
      >(`SELECT COUNT(*)::text AS "jobCount" FROM otp_delivery_jobs`);
      expect(jobCount).toBe("0");
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
          pepper,
          ttlSeconds: 120,
          resendSeconds: 60,
          jwtAccessSecret: "integration-jwt-secret-at-least-32-characters",
          accessTtlSeconds: 900,
          refreshTtlDays: 30,
          cookieSecure: false,
        },
        new OtpCodeSealer(pepper),
        new ShortOtpResponseEnvelope(0),
        new AuditWriter(database.runtime),
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

      const worker = new OtpDeliveryWorker(
        database.runtime,
        {
          send: async () => {
            throw new Error("provider detail must not be persisted");
          },
        },
        new AuditWriter(database.runtime),
        new OtpCodeSealer(pepper),
        {
          enabled: false,
          pollMilliseconds: 1,
          leaseSeconds: 30,
          providerTimeoutSeconds: 5,
          activationMarginSeconds: 5,
          maxAttempts: 1,
          terminalRetentionSeconds: 86_400,
          cleanupBatchSize: 500,
          cleanupIntervalMilliseconds: 60_000,
        },
      );
      await worker.runOnce();

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
      const [job] = await database.runtime.query<Array<{ status: string }>>(
        `SELECT status FROM otp_delivery_jobs WHERE challenge_id = $1`,
        [response.challengeId],
      );
      expect(job).toEqual({ status: "FAILED" });
    } finally {
      await database.stop();
    }
  });
});
