import type { AuthenticatedPrincipal } from "@effect-erp/contracts";
import {
  AccessControlService,
  PermissionGuard,
} from "@effect/access-control/server";
import { entityRegistry, seedInitialAccess } from "@effect-erp/database";
import { startPostgresContainer } from "@effect-erp/testing";
import {
  CanActivate,
  type ExecutionContext,
  type INestApplication,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import request from "supertest";
import { DataSource } from "typeorm";
import { afterEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { CreateUsers202608280001 } from "../../../packages/platform/database/src/migrations/202608280001-create-users.js";
import { CreateAuditLogs202608280002 } from "../../../packages/platform/database/src/migrations/202608280002-create-audit-logs.js";
import { ReconcileAuditLogsActorNull202608280003 } from "../../../packages/platform/database/src/migrations/202608280003-reconcile-audit-logs-actor-null.js";
import { HardenAuditLogBoundary202608280004 } from "../../../packages/platform/database/src/migrations/202608280004-harden-audit-log-boundary.js";
import { CreateAccessControl202608280005 } from "../../../packages/platform/database/src/migrations/202608280005-create-access-control.js";

class TestingPermissionGuard extends PermissionGuard implements CanActivate {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const requestObject = context
      .switchToHttp()
      .getRequest<{
        headers: Record<string, string>;
        user?: AuthenticatedPrincipal;
      }>();
    const userId = requestObject.headers["x-test-user-id"];
    if (userId)
      requestObject.user = {
        userId,
        sessionId: "00000000-0000-4000-8000-000000000001",
        phone: "+989000000000",
        permissions: [],
      };
    return super.canActivate(context);
  }
}

const sources: DataSource[] = [];
let app: INestApplication | undefined;
afterEach(async () => {
  if (app) await app.close();
  app = undefined;
  await Promise.all(sources.splice(0).map((source) => source.destroy()));
});

describe("access-control API", () => {
  it("enforces grants and explicit denies while auditing administration writes", async () => {
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
      await seedInitialAccess(runtime, "09121234567");
      const [{ id: adminId }] = await runtime.query<Array<{ id: string }>>(
        `SELECT id FROM users WHERE phone = '+989121234567'`,
      );

      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(DataSource)
        .useValue(runtime)
        .overrideProvider(PermissionGuard)
        .useFactory({
          factory: (reflector: Reflector, access: AccessControlService) =>
            new TestingPermissionGuard(reflector, access),
          inject: [Reflector, AccessControlService],
        })
        .compile();
      app = module.createNestApplication();
      app.setGlobalPrefix("api/v1");
      await app.init();

      await request(app.getHttpServer())
        .get("/api/v1/users")
        .set("x-test-user-id", adminId)
        .expect(200);
      const created = await request(app.getHttpServer())
        .post("/api/v1/users")
        .set("x-test-user-id", adminId)
        .send({ phone: "09123334444", firstName: "کاربر", lastName: "محدود" })
        .expect(201);
      await request(app.getHttpServer())
        .get("/api/v1/users")
        .set("x-test-user-id", created.body.id)
        .expect(403);

      const [{ id: permissionId }] = await runtime.query<Array<{ id: string }>>(
        `SELECT id FROM permissions WHERE key = 'users:read'`,
      );
      await request(app.getHttpServer())
        .put(`/api/v1/users/${adminId}/permission-overrides`)
        .set("x-test-user-id", adminId)
        .send({ overrides: [{ permissionId, effect: "DENY" }] })
        .expect(200);
      await request(app.getHttpServer())
        .get("/api/v1/users")
        .set("x-test-user-id", adminId)
        .expect(403);
      const [{ count }] = await runtime.query<Array<{ count: string }>>(
        `SELECT COUNT(*)::text AS count FROM audit_logs WHERE action IN ('users.created', 'users.permission_overrides_replaced')`,
      );
      expect(Number(count)).toBeGreaterThanOrEqual(2);
    } finally {
      await Promise.all(sources.splice(0).map((source) => source.destroy()));
      await container.stop();
    }
  });
});
