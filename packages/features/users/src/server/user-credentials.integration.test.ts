import { DataSource, type MigrationInterface } from "typeorm";
import { afterEach, describe, expect, it } from "vitest";

import { startPostgresContainer } from "@effect-erp/testing";

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
import { passwordHasher } from "./password-hasher.js";
import { UserEntity } from "../entities/index.js";
import { UserCredentialsService } from "./user-credentials.service.js";

const legacyMigrations: Array<new () => MigrationInterface> = [
  CreateUsers202608280001,
  CreateAuditLogs202608280002,
  ReconcileAuditLogsActorNull202608280003,
  HardenAuditLogBoundary202608280004,
  CreateAccessControl202608280005,
  CreateOtp202608280006,
  CreateOtpDeliveryOutbox202608280007,
  HardenOtpDeliveryOutbox202608280008,
  CreateSessions202608280009,
];

const dataSources: DataSource[] = [];

afterEach(async () => {
  await Promise.all(
    dataSources
      .splice(0)
      .filter((source) => source.isInitialized)
      .map((source) => source.destroy()),
  );
});

describe("password credential persistence", () => {
  it("upgrades legacy data and enforces credential invariants in PostgreSQL", async () => {
    const container = await startPostgresContainer();
    try {
      const connection = {
        type: "postgres" as const,
        host: container.getHost(),
        port: container.getMappedPort(5432),
        username: "effect",
        password: "effect",
        database: "effect_erp",
        entities: [UserEntity],
        synchronize: false,
      };
      const legacy = new DataSource({
        ...connection,
        migrations: legacyMigrations,
      });
      dataSources.push(legacy);
      await legacy.initialize();
      await legacy.runMigrations();

      const [legacyUser] = await legacy.query<Array<{ id: string }>>(
        `INSERT INTO users (phone, "firstName", "lastName", status)
         VALUES ($1, $2, $3, 'SUSPENDED') RETURNING id`,
        ["+989121234567", "کاربر", "قدیمی"],
      );
      const [role] = await legacy.query<Array<{ id: string }>>(
        `INSERT INTO roles (name, slug, is_system)
         VALUES ('مدیر آزمایشی', 'legacy-role', false) RETURNING id`,
      );
      await legacy.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [legacyUser!.id, role!.id],
      );
      const [audit] = await legacy.query<Array<{ id: string }>>(
        `INSERT INTO audit_logs
           (actor_id, action, entity_type, entity_id, metadata, request_id)
         VALUES ($1, 'users.legacy', 'users', $1, '{}', 'req_legacy')
         RETURNING id`,
        [legacyUser!.id],
      );
      const sessionId = "4f3ed0ea-10a7-4603-97c8-03f0e33af773";
      await legacy.query(
        `INSERT INTO sessions
           (id, user_id, user_agent, ip_address, csrf_hash, last_used_at, expires_at)
         VALUES ($1, $2, 'legacy-agent', '127.0.0.1', $3, now(), now() + interval '1 day')`,
        [sessionId, legacyUser!.id, "a".repeat(64)],
      );

      const upgraded = new DataSource({
        ...connection,
        migrations: [
          ...legacyMigrations,
          AddPasswordCredentials202609010010,
        ],
      });
      dataSources.push(upgraded);
      await upgraded.initialize();
      await upgraded.runMigrations();

      const [preserved] = await upgraded.query<
        Array<{
          id: string;
          status: string;
          username: string | null;
          passwordHash: string | null;
          mustChangePassword: boolean;
          temporaryPasswordExpiresAt: Date | null;
          passwordChangedAt: Date | null;
          credentialVersion: number;
        }>
      >(
        `SELECT id, status, username, password_hash AS "passwordHash",
                must_change_password AS "mustChangePassword",
                temporary_password_expires_at AS "temporaryPasswordExpiresAt",
                password_changed_at AS "passwordChangedAt",
                credential_version AS "credentialVersion"
           FROM users WHERE id = $1`,
        [legacyUser!.id],
      );
      expect(preserved).toEqual({
        id: legacyUser!.id,
        status: "SUSPENDED",
        username: null,
        passwordHash: null,
        mustChangePassword: true,
        temporaryPasswordExpiresAt: null,
        passwordChangedAt: null,
        credentialVersion: 0,
      });
      await expect(
        upgraded.query(
          `SELECT role_id FROM user_roles WHERE user_id = $1`,
          [legacyUser!.id],
        ),
      ).resolves.toEqual([{ role_id: role!.id }]);
      await expect(
        upgraded.query(`SELECT id FROM audit_logs WHERE id = $1`, [audit!.id]),
      ).resolves.toEqual([{ id: audit!.id }]);
      await expect(
        upgraded.query(
          `SELECT revoked_at FROM sessions WHERE id = $1`,
          [sessionId],
        ),
      ).resolves.toEqual([{ revoked_at: null }]);
      await expect(
        upgraded.query(
          `SELECT to_regclass('public.otp_challenges') AS challenges,
                  to_regclass('public.otp_delivery_jobs') AS delivery_jobs`,
        ),
      ).resolves.toEqual([
        {
          challenges: "otp_challenges",
          delivery_jobs: "otp_delivery_jobs",
        },
      ]);

      const hash = await passwordHasher.hash("A long migration passphrase!");
      const service = new UserCredentialsService(upgraded);
      const temporary = await upgraded.transaction(async (manager) => {
        const locked = await service.lockById(legacyUser!.id, manager);
        expect(locked).not.toBeNull();
        expect(
          Object.prototype.hasOwnProperty.call(locked, "passwordHash"),
        ).toBe(true);
        return service.setTemporary(locked!, " Legacy.User ", hash, manager);
      });
      expect(temporary.username).toBe("legacy.user");
      expect(temporary.credentialVersion).toBe(1);
      expect(temporary.mustChangePassword).toBe(true);
      expect(temporary.temporaryPasswordExpiresAt!.getTime()).toBe(
        temporary.passwordChangedAt!.getTime() + 24 * 60 * 60 * 1_000,
      );

      const normal = await upgraded
        .getRepository(UserEntity)
        .findOneByOrFail({ id: legacyUser!.id });
      expect(
        Object.prototype.hasOwnProperty.call(normal, "passwordHash"),
      ).toBe(false);
      const explicit = await service.findByUsername(" LEGACY.USER ");
      expect(explicit).not.toBeNull();
      expect(
        await passwordHasher.verify(
          "A long migration passphrase!",
          explicit!.passwordHash!,
        ),
      ).toBe(true);

      const [second] = await upgraded.query<Array<{ id: string }>>(
        `INSERT INTO users (phone, "firstName", "lastName")
         VALUES ($1, 'کاربر', 'دوم') RETURNING id`,
        ["+989121234568"],
      );
      await expect(
        upgraded.transaction(async (manager) => {
          const target = await service.lockById(second!.id, manager);
          return service.setTemporary(target!, " LEGACY.USER ", hash, manager);
        }),
      ).rejects.toMatchObject({ code: "23505" });

      await expect(
        upgraded.query(
          `INSERT INTO users
             (phone, "firstName", "lastName", username)
           VALUES ('+989121234569', 'ناقص', 'اول', 'partial.user')`,
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        upgraded.query(
          `INSERT INTO users
             (phone, "firstName", "lastName", password_hash)
           VALUES ('+989121234570', 'ناقص', 'دوم', 'hash-only')`,
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        upgraded.query(
          `INSERT INTO users
             (phone, "firstName", "lastName", username, password_hash,
              password_changed_at, temporary_password_expires_at)
           VALUES ('+989121234571', 'غیر', 'استاندارد', 'Upper.User', 'hash',
                   now(), now() + interval '24 hours')`,
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        upgraded.query(
          `UPDATE users SET credential_version = -1 WHERE id = $1`,
          [legacyUser!.id],
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        upgraded.query(
          `UPDATE users SET must_change_password = false
           WHERE id = $1`,
          [legacyUser!.id],
        ),
      ).rejects.toMatchObject({ code: "23514" });

      const permanent = await upgraded.transaction(async (manager) => {
        const locked = await service.lockById(legacyUser!.id, manager);
        return service.setPermanent(locked!, "permanent-hash", manager);
      });
      expect(permanent.username).toBe("legacy.user");
      expect(permanent.passwordHash).toBe("permanent-hash");
      expect(permanent.credentialVersion).toBe(2);
      expect(permanent.mustChangePassword).toBe(false);
      expect(permanent.temporaryPasswordExpiresAt).toBeNull();
    } finally {
      await Promise.all(
        dataSources
          .splice(0)
          .filter((source) => source.isInitialized)
          .map((source) => source.destroy()),
      );
      await container.stop();
    }
  });
});
