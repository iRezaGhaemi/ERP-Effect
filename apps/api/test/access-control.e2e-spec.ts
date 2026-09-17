import type { AuthenticatedPrincipal } from "@effect-erp/contracts";
import {
  PermissionPageSchema,
  RoleDtoSchema,
  RolePageSchema,
} from "@effect/access-control/contracts";
import {
  AccessControlService,
  PermissionGuard,
} from "@effect/access-control/server";
import { AuditLogPageSchema } from "@effect/audit/contracts";
import { AuthenticationGuard } from "@effect/auth/server";
import { entityRegistry, seedInitialAccess } from "@effect-erp/database";
import {
  UserDetailDtoSchema,
  UserDtoSchema,
  UserPageSchema,
} from "@effect/users/contracts";
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
import { AddPasswordCredentials202609010010 } from "../../../packages/platform/database/src/migrations/202609010010-add-password-credentials.js";

class TestingPermissionGuard extends PermissionGuard implements CanActivate {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const requestObject = context.switchToHttp().getRequest<{
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
        credentialVersion: 0,
        mustChangePassword: false,
      };
    return super.canActivate(context);
  }
}

class TestingAuthenticationGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

const sources: DataSource[] = [];
let app: INestApplication | undefined;
const webOrigin = "http://localhost:3000";
const csrfToken = "a".repeat(43);
const csrfCookie = `effect_csrf=${csrfToken}`;
afterEach(async () => {
  if (app) await app.close();
  app = undefined;
  await Promise.all(sources.splice(0).filter((source) => source.isInitialized).map((source) => source.destroy()));
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
          AddPasswordCredentials202609010010,
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
      await seedInitialAccess(runtime, "09121234567", {
        username: "access.e2e.admin",
        password: "Access e2e bootstrap phrase 123!",
      });
      const [{ id: adminId }] = await runtime.query<Array<{ id: string }>>(
        `SELECT id FROM users WHERE phone = '+989121234567'`,
      );

      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(DataSource)
        .useValue(runtime)
        .overrideProvider(AuthenticationGuard)
        .useClass(TestingAuthenticationGuard)
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

      const roles = await request(app.getHttpServer())
        .get("/api/v1/roles")
        .set("x-test-user-id", adminId)
        .expect(200);
      expect(() => RolePageSchema.parse(roles.body)).not.toThrow();
      const superAdmin = roles.body.items.find(
        (role: { slug: string }) => role.slug === "super-admin",
      );
      const protectedUpdate = await request(app.getHttpServer())
        .patch(`/api/v1/roles/${superAdmin.id}`)
        .set("x-test-user-id", adminId)
        .set("Cookie", csrfCookie)
        .set("Origin", webOrigin)
        .set("x-csrf-token", csrfToken)
        .send({ permissionIds: [] })
        .expect(422);
      expect(protectedUpdate.body.error.code).toBe("SYSTEM_ROLE_PROTECTED");

      const permissions = await request(app.getHttpServer())
        .get("/api/v1/permissions")
        .set("x-test-user-id", adminId)
        .expect(200);
      expect(() => PermissionPageSchema.parse(permissions.body)).not.toThrow();
      const readPermission = permissions.body.items.find(
        (permission: { key: string }) => permission.key === "users:read",
      );
      const createdRole = await request(app.getHttpServer())
        .post("/api/v1/roles")
        .set("x-test-user-id", adminId)
        .set("Cookie", csrfCookie)
        .set("Origin", webOrigin)
        .set("x-csrf-token", csrfToken)
        .send({
          name: "اپراتور",
          slug: "operator",
          permissionIds: [readPermission.id],
        })
        .expect(201);
      expect(RoleDtoSchema.parse(createdRole.body).permissionKeys).toEqual([
        "users:read",
      ]);
      const updatedRole = await request(app.getHttpServer())
        .patch(`/api/v1/roles/${createdRole.body.id}`)
        .set("x-test-user-id", adminId)
        .set("Cookie", csrfCookie)
        .set("Origin", webOrigin)
        .set("x-csrf-token", csrfToken)
        .send({ name: "اپراتور ارشد" })
        .expect(200);
      expect(RoleDtoSchema.parse(updatedRole.body).name).toBe("اپراتور ارشد");

      const users = await request(app.getHttpServer())
        .get("/api/v1/users")
        .set("x-test-user-id", adminId)
        .expect(200);
      expect(() => UserPageSchema.parse(users.body)).not.toThrow();
      const created = await request(app.getHttpServer())
        .post("/api/v1/users")
        .set("x-test-user-id", adminId)
        .set("Cookie", csrfCookie)
        .set("Origin", webOrigin)
        .set("x-csrf-token", csrfToken)
        .send({
          phone: "09123334444",
          firstName: "کاربر",
          lastName: "محدود",
          username: "limited.user",
          initialPassword: "Limited user phrase 123!",
        })
        .expect(201);
      expect(() => UserDtoSchema.parse(created.body)).not.toThrow();
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/users/${created.body.id}`)
        .set("x-test-user-id", adminId)
        .expect(200);
      expect(UserDetailDtoSchema.parse(detail.body)).toMatchObject({
        roleIds: [],
        permissionOverrides: [],
      });
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
        .set("Cookie", csrfCookie)
        .set("Origin", webOrigin)
        .set("x-csrf-token", csrfToken)
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
      const auditLogs = await request(app.getHttpServer())
        .get("/api/v1/audit-logs")
        .set("x-test-user-id", adminId)
        .expect(200);
      expect(() => AuditLogPageSchema.parse(auditLogs.body)).not.toThrow();
    } finally {
      await Promise.all(sources.splice(0).filter((source) => source.isInitialized).map((source) => source.destroy()));
      await container.stop();
    }
  });
});
