import { DataSource } from "typeorm";
import { afterEach, describe, expect, it } from "vitest";

import { startPostgresContainer } from "@effect-erp/testing";
import {
  entityRegistry,
  seedInitialAccess,
} from "../../../../platform/database/src/index.js";
import { CreateUsers202608280001 } from "../../../../platform/database/src/migrations/202608280001-create-users.js";
import { CreateAuditLogs202608280002 } from "../../../../platform/database/src/migrations/202608280002-create-audit-logs.js";
import { ReconcileAuditLogsActorNull202608280003 } from "../../../../platform/database/src/migrations/202608280003-reconcile-audit-logs-actor-null.js";
import { HardenAuditLogBoundary202608280004 } from "../../../../platform/database/src/migrations/202608280004-harden-audit-log-boundary.js";
import { CreateAccessControl202608280005 } from "../../../../platform/database/src/migrations/202608280005-create-access-control.js";

const sources: DataSource[] = [];
afterEach(async () => {
  await Promise.all(sources.splice(0).map((source) => source.destroy()));
});

describe("access control persistence", () => {
  it("seeds through the runtime role idempotently after migrator-owned migrations", async () => {
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
        ],
        synchronize: false,
      });
      sources.push(migrator);
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
      sources.push(runtime);
      await runtime.initialize();
      await seedInitialAccess(runtime, "۰۹۱۲۱۲۳۴۵۶۷");
      await seedInitialAccess(runtime, "09121234567");
      await runtime.query(
        `UPDATE permissions SET resource = 'wrong', action = 'wrong' WHERE key = 'users:read'`,
      );
      await runtime.query(
        `UPDATE roles SET name = 'نام خراب' WHERE slug = 'super-admin'`,
      );
      await runtime.query(
        `DELETE FROM role_permissions
         WHERE role_id = (SELECT id FROM roles WHERE slug = 'super-admin')
           AND permission_id = (SELECT id FROM permissions WHERE key = 'users:read')`,
      );
      await runtime.query(
        `INSERT INTO permissions (resource, action, key)
         VALUES ('reports', 'export', 'reports:export')`,
      );
      await runtime.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT role.id, permission.id FROM roles role, permissions permission
         WHERE role.slug = 'super-admin' AND permission.key = 'reports:export'`,
      );
      await seedInitialAccess(runtime, "09121234567");
      await seedInitialAccess(runtime, "09121234567");
      const [[roles], [permissions], [users], [grants]] = await Promise.all([
        runtime.query(`SELECT COUNT(*)::int AS count FROM roles`),
        runtime.query(
          `SELECT COUNT(*)::int AS count FROM permissions WHERE key <> 'reports:export'`,
        ),
        runtime.query(
          `SELECT COUNT(*)::int AS count FROM users WHERE phone = '+989121234567'`,
        ),
        runtime.query(`SELECT COUNT(*)::int AS count FROM role_permissions`),
      ]);
      expect([
        roles.count,
        permissions.count,
        users.count,
        grants.count,
      ]).toEqual([1, 7, 1, 7]);
      const [
        [repairedPermission],
        [repairedRole],
        [repairAudit],
        [extraGrant],
      ] = await Promise.all([
        runtime.query(
          `SELECT resource, action FROM permissions WHERE key = 'users:read'`,
        ),
        runtime.query(`SELECT name FROM roles WHERE slug = 'super-admin'`),
        runtime.query(
          `SELECT COUNT(*)::int AS count FROM audit_logs WHERE action = 'seed.access_control_repaired'`,
        ),
        runtime.query(
          `SELECT COUNT(*)::int AS count FROM role_permissions role_permission
             INNER JOIN permissions permission ON permission.id = role_permission.permission_id
             WHERE permission.key = 'reports:export'`,
        ),
      ]);
      expect(repairedPermission).toEqual({ resource: "users", action: "read" });
      expect(repairedRole.name).toBe("مدیر ارشد");
      expect(repairAudit.count).toBe(1);
      expect(extraGrant.count).toBe(0);
    } finally {
      await Promise.all(sources.splice(0).map((source) => source.destroy()));
      await container.stop();
    }
  });
});
