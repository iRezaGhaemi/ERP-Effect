import { createHmac } from "node:crypto";

import { AuditWriter } from "@effect/audit/server";
import { startPostgresContainer } from "@effect-erp/testing";
import { UserEntity } from "@effect/users/entities";
import { UsersFacade } from "@effect/users/server";
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
import { CreateSessions202608280009 } from "../../../../platform/database/src/migrations/202608280009-create-sessions.js";
import { entityRegistry } from "../../../../platform/database/src/entity-registry.js";
import { SessionFixture } from "../test/session.fixture.js";
import { OtpCodeSealer } from "./otp-code-sealer.js";
import { ShortOtpResponseEnvelope } from "./otp-response-envelope.js";
import { OtpService } from "./otp.service.js";
import { RateLimitService } from "./rate-limit.service.js";
import { SessionService } from "./session.service.js";
import { TokenService } from "./token.service.js";

const dataSources: DataSource[] = [];
const pepper = "integration-session-otp-pepper-at-least-32-characters";
const options = {
  pepper,
  ttlSeconds: 120,
  resendSeconds: 60,
  jwtAccessSecret: "integration-session-jwt-secret-at-least-32-characters",
  accessTtlSeconds: 900,
  refreshTtlDays: 30,
  cookieSecure: false,
};

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
      CreateOtpDeliveryOutbox202608280007,
      HardenOtpDeliveryOutbox202608280008,
      CreateSessions202608280009,
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

function otpHash(challengeId: string, code: string): string {
  return createHmac("sha256", pepper)
    .update(`${challengeId}:${code}`)
    .digest("hex");
}

function sessionService(dataSource: DataSource): SessionService {
  return new SessionService(
    dataSource,
    new AuditWriter(dataSource),
    new TokenService(options),
    options,
  );
}

describe("OTP verification and session rotation integration", () => {
  it("consumes a delivered OTP challenge exactly once in PostgreSQL", async () => {
    const database = await prepareDatabase();
    try {
      const [user] = await database.runtime.query<Array<UserEntity>>(
        `INSERT INTO users (phone, "firstName", "lastName", status)
         VALUES ($1, $2, $3, 'ACTIVE')
         RETURNING id, phone, "firstName", "lastName", status, "lastLoginAt", "createdAt", "updatedAt"`,
        ["+989121234567", "کاربر", "فعال"],
      );
      const challengeId = "761ff677-7c5e-414b-9565-e9d74082b0b7";
      await database.runtime.query(
        `INSERT INTO otp_challenges
          (id, user_id, is_decoy, phone, code_hash, attempts, expires_at, consumed_at, invalidated_at, request_ip)
         VALUES ($1, $2, false, $3, $4, 0, now() + interval '2 minutes', NULL, NULL, $5)`,
        [
          challengeId,
          user.id,
          "+989121234567",
          otpHash(challengeId, "123456"),
          "127.0.0.1",
        ],
      );
      await database.runtime.query(
        `INSERT INTO otp_delivery_jobs
          (id, challenge_id, code_ciphertext, code_nonce, code_tag, request_id, status, attempts, available_at, claim_version, completed_at)
         VALUES ($1, $2, NULL, NULL, NULL, 'req_delivered', 'SUCCEEDED', 1, now(), 1, now())`,
        ["0b05d1d5-dcdb-4dbf-b477-4c187a7c6b3a", challengeId],
      );
      const service = new OtpService(
        database.runtime,
        new UsersFacade(database.runtime),
        new RateLimitService(database.runtime, pepper),
        options,
        new OtpCodeSealer(pepper),
        new ShortOtpResponseEnvelope(0),
        sessionService(database.runtime),
      );

      const first = await service.verify(
        { challengeId, code: "123456" },
        {
          requestId: "req_verify",
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
        },
      );

      expect(first.user.id).toBe(user.id);
      await expect(
        service.verify(
          { challengeId, code: "123456" },
          {
            requestId: "req_verify_replay",
            ipAddress: "127.0.0.1",
            userAgent: "vitest",
          },
        ),
      ).rejects.toMatchObject({ code: "OTP_INVALID" });
      const [state] = await database.runtime.query<
        Array<{
          consumedAt: Date | null;
          lastLoginAt: Date | null;
          refreshTokenCount: string;
          loginAuditCount: string;
        }>
      >(
        `SELECT
          (SELECT consumed_at FROM otp_challenges WHERE id = $1) AS "consumedAt",
          (SELECT "lastLoginAt" FROM users WHERE id = $2) AS "lastLoginAt",
          (SELECT COUNT(*)::text FROM refresh_tokens WHERE session_id = $3 AND revoked_at IS NULL) AS "refreshTokenCount",
          (SELECT COUNT(*)::text FROM audit_logs WHERE action = 'auth.login_succeeded') AS "loginAuditCount"`,
        [challengeId, user.id, first.sessionId],
      );
      expect(state).toMatchObject({
        consumedAt: expect.any(Date),
        lastLoginAt: expect.any(Date),
        refreshTokenCount: "1",
        loginAuditCount: "1",
      });
      expect(JSON.stringify(state)).not.toContain("123456");
    } finally {
      await database.stop();
    }
  });

  it("commits a rejected OTP attempt before returning OTP_INVALID", async () => {
    const database = await prepareDatabase();
    try {
      const [user] = await database.runtime.query<Array<UserEntity>>(
        `INSERT INTO users (phone, "firstName", "lastName", status)
         VALUES ($1, $2, $3, 'ACTIVE')
         RETURNING id`,
        ["+989121234569", "کاربر", "نامعتبر"],
      );
      const challengeId = "a9e1a31f-66dd-4d62-b5f7-51227dbd1b30";
      await database.runtime.query(
        `INSERT INTO otp_challenges
          (id, user_id, is_decoy, phone, code_hash, attempts, expires_at, consumed_at, invalidated_at, request_ip)
         VALUES ($1, $2, false, $3, $4, 0, now() + interval '2 minutes', NULL, NULL, $5)`,
        [
          challengeId,
          user.id,
          "+989121234569",
          otpHash(challengeId, "123456"),
          "127.0.0.1",
        ],
      );
      await database.runtime.query(
        `INSERT INTO otp_delivery_jobs
          (id, challenge_id, code_ciphertext, code_nonce, code_tag, request_id, status, attempts, available_at, claim_version, completed_at)
         VALUES ($1, $2, NULL, NULL, NULL, 'req_delivered_invalid', 'SUCCEEDED', 1, now(), 1, now())`,
        ["95e11595-d311-41a8-88c2-a3496f9ca1bc", challengeId],
      );
      const service = new OtpService(
        database.runtime,
        new UsersFacade(database.runtime),
        new RateLimitService(database.runtime, pepper),
        options,
        new OtpCodeSealer(pepper),
        new ShortOtpResponseEnvelope(0),
        sessionService(database.runtime),
      );

      await expect(
        service.verify(
          { challengeId, code: "000000" },
          {
            requestId: "req_verify_invalid",
            ipAddress: "127.0.0.1",
            userAgent: "vitest",
          },
        ),
      ).rejects.toMatchObject({ code: "OTP_INVALID" });

      const [state] = await database.runtime.query<
        Array<{ attempts: number; invalidatedAt: Date | null }>
      >(
        `SELECT attempts, invalidated_at AS "invalidatedAt"
         FROM otp_challenges WHERE id = $1`,
        [challengeId],
      );
      expect(state).toEqual({ attempts: 1, invalidatedAt: null });
    } finally {
      await database.stop();
    }
  });

  it("allows one concurrent refresh and revokes the family on replay", async () => {
    const database = await prepareDatabase();
    try {
      const [{ id: userId }] = await database.runtime.query<
        Array<{ id: string }>
      >(
        `INSERT INTO users (phone, "firstName", "lastName", status)
         VALUES ($1, $2, $3, 'ACTIVE') RETURNING id`,
        ["+989121234568", "کاربر", "چرخش"],
      );
      const tokens = new TokenService(options);
      const service = sessionService(database.runtime);
      const fixture = new SessionFixture(database.runtime, tokens, options);
      const original = await fixture.createActiveSession({ userId });

      const results = await Promise.allSettled([
        service.refresh(original.rawRefreshToken, {
          requestId: "req_refresh_one",
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
        }),
        service.refresh(original.rawRefreshToken, {
          requestId: "req_refresh_two",
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
        }),
      ]);

      expect(
        results.filter(({ status }) => status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results.filter(
          (result) =>
            result.status === "rejected" &&
            result.reason?.code === "SESSION_REVOKED",
        ),
      ).toHaveLength(1);
      const [state] = await database.runtime.query<
        Array<{
          revokedAt: Date | null;
          activeTokenCount: string;
          reuseAuditCount: string;
        }>
      >(
        `SELECT
          (SELECT revoked_at FROM sessions WHERE id = $1) AS "revokedAt",
          (SELECT COUNT(*)::text FROM refresh_tokens WHERE session_id = $1 AND revoked_at IS NULL) AS "activeTokenCount",
          (SELECT COUNT(*)::text FROM audit_logs WHERE action = 'auth.refresh_reuse_detected') AS "reuseAuditCount"`,
        [original.sessionId],
      );
      expect(state).toEqual({
        revokedAt: expect.any(Date),
        activeTokenCount: "0",
        reuseAuditCount: "1",
      });
      expect(JSON.stringify(state)).not.toContain(original.rawRefreshToken);
    } finally {
      await database.stop();
    }
  });
});
