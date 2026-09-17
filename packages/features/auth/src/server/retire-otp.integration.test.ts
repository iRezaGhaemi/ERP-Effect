import { randomUUID } from "node:crypto";

import { startPostgresContainer } from "@effect-erp/testing";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";

import { entityRegistry } from "../../../../platform/database/src/entity-registry.js";
import { CreateUsers202608280001 } from "../../../../platform/database/src/migrations/202608280001-create-users.js";
import { CreateAuditLogs202608280002 } from "../../../../platform/database/src/migrations/202608280002-create-audit-logs.js";
import { ReconcileAuditLogsActorNull202608280003 } from "../../../../platform/database/src/migrations/202608280003-reconcile-audit-logs-actor-null.js";
import { HardenAuditLogBoundary202608280004 } from "../../../../platform/database/src/migrations/202608280004-harden-audit-log-boundary.js";
import { CreateAccessControl202608280005 } from "../../../../platform/database/src/migrations/202608280005-create-access-control.js";
import { CreateOtp202608280006 } from "../../../../platform/database/src/migrations/202608280006-create-otp.js";
import { CreateOtpDeliveryOutbox202608280007 } from "../../../../platform/database/src/migrations/202608280007-create-otp-delivery-outbox.js";
import { HardenOtpDeliveryOutbox202608280008 } from "../../../../platform/database/src/migrations/202608280008-harden-otp-delivery-outbox.js";
import { CreateSessions202608280009 } from "../../../../platform/database/src/migrations/202608280009-create-sessions.js";
import { AddPasswordCredentials202609010010 } from "../../../../platform/database/src/migrations/202609010010-add-password-credentials.js";
import { RetireOtp202609010011 } from "../../../../platform/database/src/migrations/202609010011-retire-otp.js";

describe("password authentication cutover migration", () => {
  it("invalidates old sessions and removes runtime OTP storage without dropping shared rate limits", async () => {
    const container = await startPostgresContainer();
    const connection = {
      type: "postgres",
      host: container.getHost(),
      port: container.getMappedPort(5432),
      username: "effect",
      password: "effect",
      database: "effect_erp",
      entities: entityRegistry,
      synchronize: false,
    } as const;
    const source = new DataSource({
      ...connection,
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
        AddPasswordCredentials202609010010,
      ],
    });
    let upgraded: DataSource | undefined;
    try {
      await source.initialize();
      await source.runMigrations();
      const users = await source.query<Array<{ id: string }>>(
        `INSERT INTO users (phone, "firstName", "lastName", status)
         VALUES ('+989121234567', 'Legacy', 'User', 'ACTIVE') RETURNING id`,
      );
      const sessionId = randomUUID();
      const historicalSessionId = randomUUID();
      await source.query(
        `INSERT INTO sessions
          (id, user_id, user_agent, ip_address, csrf_hash, last_used_at, expires_at)
         VALUES ($1, $2, 'legacy', '127.0.0.1', $3, now(), now() + interval '1 day')`,
        [sessionId, users[0]!.id, "a".repeat(64)],
      );
      await source.query(
        `INSERT INTO sessions
          (id, user_id, user_agent, ip_address, csrf_hash, last_used_at,
           expires_at, revoked_at, revoked_reason)
         VALUES ($1, $2, 'historical', '127.0.0.1', $3, now(),
           now() + interval '1 day', now() - interval '1 hour', 'LOGOUT')`,
        [historicalSessionId, users[0]!.id, "f".repeat(64)],
      );
      await source.query(
        `INSERT INTO refresh_tokens (id, session_id, token_hash, expires_at)
         VALUES ($1, $2, $3, now() + interval '1 day')`,
        [randomUUID(), sessionId, "b".repeat(64)],
      );
      await source.query(
        `INSERT INTO refresh_tokens
          (id, session_id, token_hash, expires_at, revoked_at)
         VALUES ($1, $2, $3, now() + interval '1 day', now() - interval '1 hour')`,
        [randomUUID(), historicalSessionId, "9".repeat(64)],
      );
      await source.query(
        `INSERT INTO rate_limit_buckets
          (scope, key_hash, window_started_at, request_count, updated_at)
         VALUES ('otp:phone', $1, now(), 1, now()),
                ('otp:resend', $2, now(), 1, now()),
                ('auth:username', $3, now(), 1, now())`,
        ["c".repeat(64), "d".repeat(64), "e".repeat(64)],
      );

      upgraded = new DataSource({
        ...connection,
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
          AddPasswordCredentials202609010010,
          RetireOtp202609010011,
        ],
      });
      await upgraded.initialize();
      await upgraded.runMigrations();

      const columns = await upgraded.query<Array<{ columnName: string }>>(
        `SELECT column_name AS "columnName" FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'sessions'`,
      );
      expect(columns.map(({ columnName }) => columnName)).toContain(
        "credential_version",
      );
      const sessions = await upgraded.query<
        Array<{ credentialVersion: number; revokedReason: string }>
      >(
        `SELECT credential_version AS "credentialVersion", revoked_reason AS "revokedReason"
         FROM sessions WHERE id = $1`,
        [sessionId],
      );
      expect(sessions[0]).toMatchObject({
        credentialVersion: 0,
        revokedReason: "AUTH_METHOD_CHANGED",
      });
      const historical = await upgraded.query<
        Array<{ revokedReason: string }>
      >(
        `SELECT revoked_reason AS "revokedReason" FROM sessions WHERE id = $1`,
        [historicalSessionId],
      );
      expect(historical[0]).toEqual({ revokedReason: "LOGOUT" });
      const refresh = await upgraded.query<Array<{ revoked: boolean }>>(
        `SELECT revoked_at IS NOT NULL AS revoked FROM refresh_tokens WHERE session_id = $1`,
        [sessionId],
      );
      expect(refresh[0]?.revoked).toBe(true);
      const tables = await upgraded.query<Array<{ tableName: string }>>(
        `SELECT table_name AS "tableName" FROM information_schema.tables
         WHERE table_schema = 'public'`,
      );
      expect(tables.map(({ tableName }) => tableName)).not.toContain(
        "otp_challenges",
      );
      expect(tables.map(({ tableName }) => tableName)).not.toContain(
        "otp_delivery_jobs",
      );
      expect(tables.map(({ tableName }) => tableName)).toContain(
        "rate_limit_buckets",
      );
      const scopes = await upgraded.query<Array<{ scope: string }>>(
        `SELECT scope FROM rate_limit_buckets ORDER BY scope`,
      );
      expect(scopes.map(({ scope }) => scope)).toEqual(["auth:username"]);
    } finally {
      if (upgraded?.isInitialized) await upgraded.destroy();
      if (source.isInitialized) await source.destroy();
      await container.stop();
    }
  });
});
