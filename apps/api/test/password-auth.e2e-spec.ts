import { AUTH_OPTIONS } from "@effect/auth/server";
import { entityRegistry } from "@effect-erp/database";
import { startPostgresContainer } from "@effect-erp/testing";
import { passwordHasher } from "@effect/users/server";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppModule } from "../src/app.module.js";
import {
  AUTH_CONCURRENCY_HOOKS,
  type AuthConcurrencyHooks,
} from "../../../packages/features/auth/dist/server/auth-concurrency-hooks.js";
import { CreateUsers202608280001 } from "../../../packages/platform/database/src/migrations/202608280001-create-users.js";
import { CreateAuditLogs202608280002 } from "../../../packages/platform/database/src/migrations/202608280002-create-audit-logs.js";
import { ReconcileAuditLogsActorNull202608280003 } from "../../../packages/platform/database/src/migrations/202608280003-reconcile-audit-logs-actor-null.js";
import { HardenAuditLogBoundary202608280004 } from "../../../packages/platform/database/src/migrations/202608280004-harden-audit-log-boundary.js";
import { CreateAccessControl202608280005 } from "../../../packages/platform/database/src/migrations/202608280005-create-access-control.js";
import { CreateOtp202608280006 } from "../../../packages/platform/database/src/migrations/202608280006-create-otp.js";
import { CreateOtpDeliveryOutbox202608280007 } from "../../../packages/platform/database/src/migrations/202608280007-create-otp-delivery-outbox.js";
import { HardenOtpDeliveryOutbox202608280008 } from "../../../packages/platform/database/src/migrations/202608280008-harden-otp-delivery-outbox.js";
import { CreateSessions202608280009 } from "../../../packages/platform/database/src/migrations/202608280009-create-sessions.js";
import { AddPasswordCredentials202609010010 } from "../../../packages/platform/database/src/migrations/202609010010-add-password-credentials.js";
import { RetireOtp202609010011 } from "../../../packages/platform/database/src/migrations/202609010011-retire-otp.js";

const webOrigin = "http://localhost:3000";
const adminPassword = "Administrator passphrase 123!";
const targetTemporaryPassword = "Temporary target phrase 123!";
const targetPersonalPassword = "Personal target phrase 456!";
const replacementPassword = "Replacement target phrase 789!";
const setupPassword = "Prepared account phrase 987!";
const suspendedPassword = "Suspended account phrase 123!";
const managerPassword = "Delegated manager phrase 123!";

type FixtureIds = {
  admin: string;
  resetTarget: string;
  resetReuseTarget: string;
  suspendedTarget: string;
  pendingTarget: string;
  systemTarget: string;
  changeExpiryTarget: string;
  loginRaceTarget: string;
  refreshRaceTarget: string;
};

let app: INestApplication;
let source: DataSource;
let stopContainer: () => Promise<void>;
let ids: FixtureIds;
const concurrencyHooks: AuthConcurrencyHooks = {};

function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

function cookieHeader(setCookies: string[] | string | undefined): string {
  const cookies = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

function cookieValue(cookies: string, name: string): string {
  for (const part of cookies.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return decodeURIComponent(valueParts.join("="));
  }
  return "";
}

async function login(username: string, password: string) {
  return request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .set("Origin", webOrigin)
    .send({ username, password });
}

async function loginCookies(username: string, password: string) {
  const response = await login(username, password);
  expect(response.status).toBe(200);
  return cookieHeader(response.headers["set-cookie"]);
}

function withCsrf(cookies: string) {
  return {
    Cookie: cookies,
    Origin: webOrigin,
    "x-csrf-token": cookieValue(cookies, "effect_csrf"),
  };
}

async function changeWithCookies(cookies: string, currentPassword: string, newPassword: string) {
  return request(app.getHttpServer())
    .post("/api/v1/auth/password/change")
    .set(withCsrf(cookies))
    .send({ currentPassword, newPassword });
}

async function insertUser(input: {
  username?: string;
  passwordHash?: string;
  mustChangePassword?: boolean;
  temporaryPasswordExpiresAt?: string | null;
  passwordChangedAt?: string;
  status?: "ACTIVE" | "SUSPENDED";
  phone: string;
}): Promise<string> {
  const rows = await source.query<Array<{ id: string }>>(
    `INSERT INTO users
      (phone, "firstName", "lastName", status, username, password_hash,
       must_change_password, temporary_password_expires_at,
       password_changed_at, credential_version)
     VALUES ($1, 'Test', 'User', $2, $3, $4, $5, $6,
       CASE WHEN $4::varchar IS NULL THEN NULL ELSE COALESCE($7::timestamptz, now()) END,
       CASE WHEN $4::varchar IS NULL THEN 0 ELSE 1 END)
     RETURNING id`,
    [
      input.phone,
      input.status ?? "ACTIVE",
      input.username ?? null,
      input.passwordHash ?? null,
      input.mustChangePassword ?? true,
      input.temporaryPasswordExpiresAt ?? null,
      input.passwordChangedAt ?? null,
    ],
  );
  return rows[0]!.id;
}

async function prepareFixtures(): Promise<FixtureIds> {
  const [adminHash, targetHash, suspendedHash, managerHash] = await Promise.all([
    passwordHasher.hash(adminPassword),
    passwordHasher.hash(targetTemporaryPassword),
    passwordHasher.hash(suspendedPassword),
    passwordHasher.hash(managerPassword),
  ]);
  const admin = await insertUser({
    phone: "+989121110001", username: "admin.test", passwordHash: adminHash, mustChangePassword: false,
  });
  await insertUser({
    phone: "+989121110002", username: "change.target", passwordHash: targetHash,
    temporaryPasswordExpiresAt: "2099-01-01T00:00:00.000Z",
  });
  const loginRaceTarget = await insertUser({
    phone: "+989121110020", username: "login.race", passwordHash: targetHash,
    temporaryPasswordExpiresAt: "2099-01-01T00:00:00.000Z",
  });
  const changeExpiryTarget = await insertUser({
    phone: "+989121110023", username: "change.expiry", passwordHash: targetHash,
    temporaryPasswordExpiresAt: "2099-01-01T00:00:00.000Z",
  });
  const refreshRaceTarget = await insertUser({
    phone: "+989121110021", username: "refresh.race", passwordHash: managerHash,
    mustChangePassword: false,
  });
  const resetTarget = await insertUser({
    phone: "+989121110003", username: "reset.target", passwordHash: targetHash,
    temporaryPasswordExpiresAt: "2099-01-01T00:00:00.000Z",
  });
  const resetReuseTarget = await insertUser({
    phone: "+989121110022", username: "reset.reuse", passwordHash: targetHash,
    temporaryPasswordExpiresAt: "2099-01-01T00:00:00.000Z",
  });
  const suspendedTarget = await insertUser({
    phone: "+989121110004", username: "suspended.target", passwordHash: suspendedHash,
    temporaryPasswordExpiresAt: "2099-01-01T00:00:00.000Z", status: "SUSPENDED",
  });
  const pendingTarget = await insertUser({ phone: "+989121110005" });
  await insertUser({
    phone: "+989121110006", username: "expired.target", passwordHash: targetHash,
    temporaryPasswordExpiresAt: "2000-01-02T00:00:00.000Z",
    passwordChangedAt: "2000-01-01T00:00:00.000Z",
  });
  const systemTarget = await insertUser({
    phone: "+989121110007", username: "system.target", passwordHash: adminHash,
    mustChangePassword: false,
  });
  const delegatedManager = await insertUser({
    phone: "+989121110008", username: "manager.test", passwordHash: managerHash,
    mustChangePassword: false,
  });
  await insertUser({
    phone: "+989121110009", username: "ordinary.test", passwordHash: managerHash,
    mustChangePassword: false,
  });

  const permissions = await source.query<Array<{ id: string; key: string }>>(
    `INSERT INTO permissions (resource, action, key)
     VALUES ('users', 'read', 'users:read'), ('users', 'create', 'users:create'),
            ('users', 'credentials:manage', 'users:credentials:manage')
     RETURNING id, key`,
  );
  const roles = await source.query<Array<{ id: string }>>(
    `INSERT INTO roles (name, slug, is_system)
     VALUES ('System administrator', 'super-admin', true) RETURNING id`,
  );
  const roleId = roles[0]!.id;
  for (const permission of permissions) {
    await source.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`, [
      roleId,
      permission.id,
    ]);
  }
  await source.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $3), ($2, $3)`, [
    admin,
    systemTarget,
    roleId,
  ]);
  const credentialsPermission = permissions.find(({ key }) => key === "users:credentials:manage")!;
  await source.query(
    `INSERT INTO user_permission_overrides (user_id, permission_id, effect) VALUES ($1, $2, 'ALLOW')`,
    [delegatedManager, credentialsPermission.id],
  );
  return {
    admin, resetTarget, resetReuseTarget, suspendedTarget, pendingTarget, systemTarget,
    changeExpiryTarget, loginRaceTarget, refreshRaceTarget,
  };
}

beforeAll(async () => {
  const container = await startPostgresContainer();
  stopContainer = () => container.stop();
  source = new DataSource({
    type: "postgres",
    host: container.getHost(),
    port: container.getMappedPort(5432),
    username: "effect",
    password: "effect",
    database: "effect_erp",
    entities: entityRegistry,
    migrations: [
      CreateUsers202608280001, CreateAuditLogs202608280002,
      ReconcileAuditLogsActorNull202608280003, HardenAuditLogBoundary202608280004,
      CreateAccessControl202608280005, CreateOtp202608280006,
      CreateOtpDeliveryOutbox202608280007, HardenOtpDeliveryOutbox202608280008,
      CreateSessions202608280009, AddPasswordCredentials202609010010,
      RetireOtp202609010011,
    ],
    synchronize: false,
  });
  await source.initialize();
  await source.runMigrations();
  ids = await prepareFixtures();
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DataSource)
    .useValue(source)
    .overrideProvider(AUTH_OPTIONS)
    .useValue({
      rateLimitSecret: "e2e-password-rate-limit-secret-at-least-32-characters",
      jwtAccessSecret: "e2e-password-jwt-secret-at-least-32-characters",
      accessTtlSeconds: 900,
      refreshTtlDays: 30,
      cookieSecure: false,
    })
    .overrideProvider(AUTH_CONCURRENCY_HOOKS)
    .useValue(concurrencyHooks)
    .compile();
  app = module.createNestApplication();
  app.setGlobalPrefix("api/v1");
  await app.init();
});

beforeEach(async () => {
  concurrencyHooks.afterLoginVerify = undefined;
  concurrencyHooks.afterChangeHash = undefined;
  concurrencyHooks.afterAdminTargetVerify = undefined;
  concurrencyHooks.afterRefreshLookup = undefined;
  await source.query(`DELETE FROM rate_limit_buckets`);
});

afterAll(async () => {
  if (app) await app.close();
  if (source?.isInitialized) await source.destroy();
  if (stopContainer) await stopContainer();
});

describe("password authentication API", () => {
  it("returns one indistinguishable 401 for every unusable credential state", async () => {
    const attempts = [
      ["admin.test", "Wrong administrator phrase 123!"],
      ["missing.test", "Unknown account phrase 123!"],
      ["suspended.target", suspendedPassword],
      ["pending.target", targetTemporaryPassword],
      ["expired.target", targetTemporaryPassword],
    ] as const;
    let expectedError: unknown;
    for (const [username, password] of attempts) {
      const response = await login(username, password);
      expect(response.status).toBe(401);
      const { requestId: _requestId, ...error } = response.body.error;
      expectedError ??= error;
      expect(error).toEqual(expectedError);
      expect(error).toMatchObject({ code: "INVALID_CREDENTIALS", fields: {} });
      expect(JSON.stringify(response.body)).not.toContain(username);
      expect(JSON.stringify(response.body)).not.toContain(password);
    }
  });

  it("validates malformed input and returns a rate-limit Retry-After", async () => {
    const malformed = await login("invalid username", "short");
    expect(malformed.status).toBe(422);
    expect(malformed.body.error.code).toBe("VALIDATION_FAILED");
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect((await login("limited.test", "Unknown account phrase 123!")).status).toBe(401);
    }
    const limited = await login("limited.test", "Unknown account phrase 123!");
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(limited.headers["retry-after"]).toMatch(/^\d+$/);
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
    const attemptCounts = await source.query<
      Array<{ scope: string; requestCount: number }>
    >(
      `SELECT scope, request_count AS "requestCount"
       FROM rate_limit_buckets ORDER BY scope`,
    );
    expect(attemptCounts).toEqual([
      { scope: "auth:ip", requestCount: 6 },
      { scope: "auth:username", requestCount: 6 },
    ]);

    await source.query(`DELETE FROM rate_limit_buckets`);
    expect((await login("ip-limited-one", "Unknown account phrase 123!")).status).toBe(401);
    const scopes = await source.query<Array<{ scope: string }>>(
      `SELECT scope FROM rate_limit_buckets ORDER BY scope`,
    );
    expect(scopes.map(({ scope }) => scope)).toEqual(["auth:ip", "auth:username"]);
    await source.query(
      `UPDATE rate_limit_buckets SET request_count = 30 WHERE scope = 'auth:ip'`,
    );
    const ipLimited = await login("ip-limited-two", "Unknown account phrase 123!");
    expect(ipLimited.status).toBe(429);
    expect(ipLimited.headers["retry-after"]).toMatch(/^\d+$/);
  });

  it("issues only a restricted temporary session until password change", async () => {
    const loggedIn = await login(" Change.Target ", targetTemporaryPassword);
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body).toMatchObject({
      user: { username: "change.target", credentialsReady: true, mustChangePassword: true },
    });
    expect(JSON.stringify(loggedIn.body)).not.toMatch(/passwordHash|accessToken|refreshToken/);
    const rawCookies = loggedIn.headers["set-cookie"];
    expect(rawCookies?.join("\n")).toMatch(/effect_access=.*HttpOnly/);
    expect(rawCookies?.join("\n")).toMatch(/effect_refresh=.*HttpOnly/);
    expect(rawCookies?.join("\n")).toContain("SameSite=Lax");
    const cookies = cookieHeader(rawCookies);
    await request(app.getHttpServer()).get("/api/v1/me").set("Cookie", cookies).expect(200);
    await request(app.getHttpServer()).get("/api/v1/users").set("Cookie", cookies).expect(403);
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Origin", webOrigin)
      .set("Cookie", cookies)
      .expect(403);
    const changed = await changeWithCookies(cookies, targetTemporaryPassword, targetPersonalPassword);
    expect(changed.status).toBe(200);
    expect(changed.body.user.mustChangePassword).toBe(false);
    await request(app.getHttpServer()).get("/api/v1/me").set("Cookie", cookies).expect(401);
    expect((await login("change.target", targetTemporaryPassword)).status).toBe(401);
    expect((await login("change.target", targetPersonalPassword)).status).toBe(200);
  });

  it("rejects self-change password reuse", async () => {
    const cookies = await loginCookies("admin.test", adminPassword);
    const response = await changeWithCookies(cookies, adminPassword, adminPassword);
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("PASSWORD_REUSE");
  });

  it("rejects self-change when a temporary password expires after hashing", async () => {
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    await source.query(
      `UPDATE users SET temporary_password_expires_at = $2 WHERE id = $1`,
      [ids.changeExpiryTarget, expiresAt],
    );
    const cookies = await loginCookies("change.expiry", targetTemporaryPassword);
    const before = await source.query<Array<{ credentialVersion: number; passwordHash: string }>>(
      `SELECT credential_version AS "credentialVersion", password_hash AS "passwordHash"
       FROM users WHERE id = $1`,
      [ids.changeExpiryTarget],
    );
    const hashed = barrier();
    const release = barrier();
    concurrencyHooks.afterChangeHash = async () => {
      hashed.release();
      await release.promise;
    };
    const staleChange = changeWithCookies(
      cookies,
      targetTemporaryPassword,
      targetPersonalPassword,
    ).then((response) => response);
    await hashed.promise;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(expiresAt.getTime() + 1_000);
    concurrencyHooks.afterChangeHash = undefined;
    release.release();
    const response = await staleChange.finally(() => vi.useRealTimers());
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    const after = await source.query<Array<{ credentialVersion: number; passwordHash: string }>>(
      `SELECT credential_version AS "credentialVersion", password_hash AS "passwordHash"
       FROM users WHERE id = $1`,
      [ids.changeExpiryTarget],
    );
    expect(after).toEqual(before);
    expect((await login("change.expiry", targetTemporaryPassword)).status).toBe(200);
    expect((await login("change.expiry", targetPersonalPassword)).status).toBe(401);
  });

  it("rejects administrator reset to the target's current password", async () => {
    const adminCookies = await loginCookies("admin.test", adminPassword);
    const before = await source.query<Array<{ credentialVersion: number; passwordHash: string }>>(
      `SELECT credential_version AS "credentialVersion", password_hash AS "passwordHash"
       FROM users WHERE id = $1`,
      [ids.resetReuseTarget],
    );
    const response = await request(app.getHttpServer())
      .post(`/api/v1/users/${ids.resetReuseTarget}/password/reset`)
      .set(withCsrf(adminCookies))
      .send({ newPassword: targetTemporaryPassword, actorPassword: adminPassword });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("PASSWORD_REUSE");
    const after = await source.query<Array<{ credentialVersion: number; passwordHash: string }>>(
      `SELECT credential_version AS "credentialVersion", password_hash AS "passwordHash"
       FROM users WHERE id = $1`,
      [ids.resetReuseTarget],
    );
    expect(after).toEqual(before);
    expect((await login("reset.reuse", targetTemporaryPassword)).status).toBe(200);
  });

  it("does not overwrite a target credential changed after reset verification", async () => {
    const adminCookies = await loginCookies("admin.test", adminPassword);
    const concurrentHash = await passwordHasher.hash(targetPersonalPassword);
    const verified = barrier();
    const release = barrier();
    concurrencyHooks.afterAdminTargetVerify = async () => {
      verified.release();
      await release.promise;
    };
    const staleReset = request(app.getHttpServer())
      .post(`/api/v1/users/${ids.resetReuseTarget}/password/reset`)
      .set(withCsrf(adminCookies))
      .send({ newPassword: replacementPassword, actorPassword: adminPassword })
      .then((response) => response);
    await verified.promise;
    await source.query(
      `UPDATE users
       SET password_hash = $2, credential_version = credential_version + 1,
           must_change_password = false, temporary_password_expires_at = NULL,
           password_changed_at = now()
       WHERE id = $1`,
      [ids.resetReuseTarget, concurrentHash],
    );
    concurrencyHooks.afterAdminTargetVerify = undefined;
    release.release();
    const response = await staleReset;
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    const rows = await source.query<Array<{ passwordHash: string }>>(
      `SELECT password_hash AS "passwordHash" FROM users WHERE id = $1`,
      [ids.resetReuseTarget],
    );
    expect(rows[0]?.passwordHash).toBe(concurrentHash);
    expect((await login("reset.reuse", targetPersonalPassword)).status).toBe(200);
    expect((await login("reset.reuse", replacementPassword)).status).toBe(401);
  });

  it("requires credential permissions when creating a public user account", async () => {
    const adminCookies = await loginCookies("admin.test", adminPassword);
    const created = await request(app.getHttpServer())
      .post("/api/v1/users")
      .set(withCsrf(adminCookies))
      .send({
        phone: "09121110010", firstName: "Created", lastName: "User",
        username: "created.user", initialPassword: "Created temporary phrase 123!",
      });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      username: "created.user", credentialsReady: true, mustChangePassword: true,
    });
    expect(JSON.stringify(created.body)).not.toMatch(
      /passwordHash|initialPassword|accessToken|refreshToken/,
    );
    const ordinaryCookies = await loginCookies("ordinary.test", managerPassword);
    await request(app.getHttpServer())
      .post("/api/v1/users")
      .set(withCsrf(ordinaryCookies))
      .send({
        phone: "09121110011", firstName: "Forbidden", lastName: "User",
        username: "forbidden.user", initialPassword: "Forbidden temporary phrase 123!",
      })
      .expect(403);
  });

  it("enforces actor password, self-reset, permission and system-admin rules", async () => {
    const adminCookies = await loginCookies("admin.test", adminPassword);
    const wrongActor = await request(app.getHttpServer())
      .post(`/api/v1/users/${ids.resetTarget}/password/reset`)
      .set(withCsrf(adminCookies))
      .send({ newPassword: replacementPassword, actorPassword: "Wrong actor phrase!" });
    expect(wrongActor.status).toBe(401);
    expect((await login("reset.target", targetTemporaryPassword)).status).toBe(200);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${ids.admin}/password/reset`)
      .set(withCsrf(adminCookies))
      .send({ newPassword: replacementPassword, actorPassword: adminPassword })
      .expect(403);
    const ordinaryCookies = await loginCookies("ordinary.test", managerPassword);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${ids.resetTarget}/password/reset`)
      .set(withCsrf(ordinaryCookies))
      .send({ newPassword: replacementPassword, actorPassword: managerPassword })
      .expect(403);
    const managerCookies = await loginCookies("manager.test", managerPassword);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${ids.resetTarget}/password/reset`)
      .set(withCsrf(managerCookies))
      .send({ newPassword: replacementPassword, actorPassword: managerPassword })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${ids.systemTarget}/password/reset`)
      .set(withCsrf(managerCookies))
      .send({ newPassword: replacementPassword, actorPassword: managerPassword })
      .expect(403);
  });

  it("sets up pending credentials and preserves suspension during reset", async () => {
    const adminCookies = await loginCookies("admin.test", adminPassword);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${ids.pendingTarget}/credentials`)
      .set(withCsrf(adminCookies))
      .send({ username: "pending.target", initialPassword: setupPassword, actorPassword: adminPassword })
      .expect(204);
    const prepared = await login("pending.target", setupPassword);
    expect(prepared.status).toBe(200);
    expect(prepared.body.user.mustChangePassword).toBe(true);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${ids.suspendedTarget}/password/reset`)
      .set(withCsrf(adminCookies))
      .send({ newPassword: replacementPassword, actorPassword: adminPassword })
      .expect(204);
    const rows = await source.query<Array<{ status: string }>>(`SELECT status FROM users WHERE id = $1`, [
      ids.suspendedTarget,
    ]);
    expect(rows[0]?.status).toBe("SUSPENDED");
    expect((await login("suspended.target", replacementPassword)).status).toBe(401);
  });

  it("invalidates target access and refresh after administrator reset", async () => {
    const targetLogin = await login("reset.target", targetTemporaryPassword);
    expect(targetLogin.status).toBe(200);
    const targetCookies = cookieHeader(targetLogin.headers["set-cookie"]);
    const adminCookies = await loginCookies("admin.test", adminPassword);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${ids.resetTarget}/password/reset`)
      .set(withCsrf(adminCookies))
      .send({ newPassword: replacementPassword, actorPassword: adminPassword })
      .expect(204);
    await request(app.getHttpServer()).get("/api/v1/me").set("Cookie", targetCookies).expect(401);
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Origin", webOrigin)
      .set("Cookie", targetCookies)
      .expect(401);
    expect((await login("reset.target", targetTemporaryPassword)).status).toBe(401);
    const replacement = await login("reset.target", replacementPassword);
    expect(replacement.status).toBe(200);
    expect(replacement.body.user.mustChangePassword).toBe(true);
  });

  it("rolls back a reset when its audit append fails", async () => {
    const adminCookies = await loginCookies("admin.test", adminPassword);
    const before = await source.query<Array<{ credentialVersion: number; passwordHash: string }>>(
      `SELECT credential_version AS "credentialVersion", password_hash AS "passwordHash" FROM users WHERE id = $1`,
      [ids.resetTarget],
    );
    await source.query(
      `ALTER TABLE audit_logs ADD CONSTRAINT "CK_test_reject_password_reset"
       CHECK (action <> 'auth.password_reset') NOT VALID`,
    );
    try {
      await request(app.getHttpServer())
        .post(`/api/v1/users/${ids.resetTarget}/password/reset`)
        .set(withCsrf(adminCookies))
        .send({ newPassword: setupPassword, actorPassword: adminPassword })
        .expect(500);
    } finally {
      await source.query(`ALTER TABLE audit_logs DROP CONSTRAINT "CK_test_reject_password_reset"`);
    }
    const after = await source.query<Array<{ credentialVersion: number; passwordHash: string }>>(
      `SELECT credential_version AS "credentialVersion", password_hash AS "passwordHash" FROM users WHERE id = $1`,
      [ids.resetTarget],
    );
    expect(after).toEqual(before);
  });

  it("does not create a session after reset wins a login verification race", async () => {
    const adminCookies = await loginCookies("admin.test", adminPassword);
    const verified = barrier();
    const release = barrier();
    concurrencyHooks.afterLoginVerify = async () => {
      verified.release();
      await release.promise;
    };
    const staleLogin = login("login.race", targetTemporaryPassword).then(
      (response) => response,
    );
    await verified.promise;
    await request(app.getHttpServer())
      .post(`/api/v1/users/${ids.loginRaceTarget}/password/reset`)
      .set(withCsrf(adminCookies))
      .send({ newPassword: replacementPassword, actorPassword: adminPassword })
      .expect(204);
    concurrencyHooks.afterLoginVerify = undefined;
    release.release();
    expect((await staleLogin).status).toBe(401);
    expect((await login("login.race", replacementPassword)).status).toBe(200);
  });

  it("does not rotate a refresh token after reset wins the refresh race", async () => {
    const targetCookies = await loginCookies("refresh.race", managerPassword);
    const adminCookies = await loginCookies("admin.test", adminPassword);
    const lookedUp = barrier();
    const release = barrier();
    concurrencyHooks.afterRefreshLookup = async () => {
      lookedUp.release();
      await release.promise;
    };
    const staleRefresh = request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Origin", webOrigin)
      .set("Cookie", targetCookies);
    const staleRefreshResult = staleRefresh.then((response) => response);
    await lookedUp.promise;
    await request(app.getHttpServer())
      .post(`/api/v1/users/${ids.refreshRaceTarget}/password/reset`)
      .set(withCsrf(adminCookies))
      .send({ newPassword: replacementPassword, actorPassword: adminPassword })
      .expect(204);
    concurrencyHooks.afterRefreshLookup = undefined;
    release.release();
    expect((await staleRefreshResult).status).toBe(401);
    expect((await login("refresh.race", replacementPassword)).status).toBe(200);
  });
});
