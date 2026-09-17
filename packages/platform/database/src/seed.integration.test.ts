import { randomUUID } from "node:crypto";

import { RoleEntity, UserRoleEntity } from "@effect/access-control/entities";
import { AuditLogEntity } from "@effect/audit/entities";
import { startPostgresContainer } from "@effect-erp/testing";
import { UserEntity, UserStatus } from "@effect/users/entities";
import { passwordHasher } from "@effect/users/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDataSource } from "./data-source.js";
import { seedInitialAccess } from "./seed.js";

const phone = "09121234567";
const credentials = {
  username: "bootstrap.admin",
  password: "Task5 bootstrap phrase 123!",
};

let container: Awaited<ReturnType<typeof startPostgresContainer>>;
let dataSource: ReturnType<typeof createDataSource>;

async function seededUser(): Promise<UserEntity> {
  return dataSource
    .getRepository(UserEntity)
    .createQueryBuilder("user")
    .addSelect("user.passwordHash")
    .where("user.phone = :phone", { phone: "+989121234567" })
    .getOneOrFail();
}

async function makeExistingSystemAdmin(
  status = UserStatus.ACTIVE,
): Promise<UserEntity> {
  await seedInitialAccess(dataSource, phone, credentials);
  const user = await seededUser();
  await dataSource.query(
    `UPDATE users
       SET "firstName" = 'پروفایل', "lastName" = 'حفظ‌شده', status = $2,
           username = NULL, password_hash = NULL,
           must_change_password = true,
           temporary_password_expires_at = NULL,
           password_changed_at = NULL,
           credential_version = 0
     WHERE id = $1`,
    [user.id, status],
  );
  return seededUser();
}

describe("initial access seed against migrated PostgreSQL", () => {
  beforeAll(async () => {
    container = await startPostgresContainer();
    dataSource = createDataSource({
      url: `postgres://effect:effect@${container.getHost()}:${container.getMappedPort(5432)}/effect_erp`,
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
  }, 120_000);

  beforeEach(async () => {
    await dataSource.query(
      "TRUNCATE TABLE audit_logs, refresh_tokens, sessions, user_permission_overrides, user_roles, role_permissions, permissions, roles, rate_limit_buckets, users RESTART IDENTITY CASCADE",
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (container) await container.stop();
  });

  it("creates the access catalog, system administrator, and verifiable temporary credentials", async () => {
    await expect(
      seedInitialAccess(dataSource, phone, credentials),
    ).resolves.toBeUndefined();

    const user = await seededUser();
    expect(user).toMatchObject({
      phone: "+989121234567",
      username: "bootstrap.admin",
      status: UserStatus.ACTIVE,
      mustChangePassword: true,
      credentialVersion: 1,
    });
    expect(user.temporaryPasswordExpiresAt!.getTime()).toBe(
      user.passwordChangedAt!.getTime() + 24 * 60 * 60 * 1_000,
    );
    await expect(
      passwordHasher.verify(credentials.password, user.passwordHash!),
    ).resolves.toBe(true);
    await expect(
      dataSource.getRepository(RoleEntity).findOneByOrFail({
        slug: "super-admin",
        isSystem: true,
      }),
    ).resolves.toBeDefined();
    await expect(dataSource.getRepository(AuditLogEntity).count()).resolves.toBe(
      1,
    );
  });

  it("adds credentials to the matched existing system administrator without changing identity, profile, role, or status", async () => {
    const before = await makeExistingSystemAdmin();
    const roleIds = (
      await dataSource.getRepository(UserRoleEntity).findBy({ userId: before.id })
    ).map(({ roleId }) => roleId);

    await seedInitialAccess(dataSource, phone, credentials);

    const after = await seededUser();
    expect(after).toMatchObject({
      id: before.id,
      firstName: "پروفایل",
      lastName: "حفظ‌شده",
      status: UserStatus.ACTIVE,
      username: "bootstrap.admin",
      credentialVersion: 1,
    });
    expect(
      (
        await dataSource
          .getRepository(UserRoleEntity)
          .findBy({ userId: before.id })
      ).map(({ roleId }) => roleId),
    ).toEqual(roleIds);
  });

  it("preserves changed credentials and account state byte-for-byte on repeated seed", async () => {
    await seedInitialAccess(dataSource, phone, credentials);
    const user = await seededUser();
    const replacementHash = await passwordHasher.hash(
      "Operator selected permanent phrase 456!",
    );
    await dataSource.query(
      `UPDATE users
          SET password_hash = $2, must_change_password = false,
              temporary_password_expires_at = NULL,
              password_changed_at = '2026-09-02T03:04:05.000Z',
              credential_version = 9
        WHERE id = $1`,
      [user.id, replacementHash],
    );
    const before = await seededUser();

    await seedInitialAccess(dataSource, phone, {
      username: "bootstrap.admin",
      password: "A different ignored bootstrap phrase 789!",
    });

    const after = await seededUser();
    expect({
      hash: after.passwordHash,
      version: after.credentialVersion,
      changedAt: after.passwordChangedAt,
      expiresAt: after.temporaryPasswordExpiresAt,
      status: after.status,
      mustChange: after.mustChangePassword,
    }).toEqual({
      hash: before.passwordHash,
      version: before.credentialVersion,
      changedAt: before.passwordChangedAt,
      expiresAt: before.temporaryPasswordExpiresAt,
      status: before.status,
      mustChange: before.mustChangePassword,
    });
  });

  it("does not reactivate a suspended system administrator or overwrite existing credentials", async () => {
    await seedInitialAccess(dataSource, phone, credentials);
    const user = await seededUser();
    await dataSource.query(`UPDATE users SET status = 'SUSPENDED' WHERE id = $1`, [
      user.id,
    ]);
    const before = await seededUser();

    await seedInitialAccess(dataSource, phone, {
      username: "bootstrap.admin",
      password: "A different ignored bootstrap phrase 789!",
    });

    const after = await seededUser();
    expect(after.status).toBe(UserStatus.SUSPENDED);
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.credentialVersion).toBe(before.credentialVersion);
  });

  it("fails closed when an unrelated user has the bootstrap phone", async () => {
    const unrelated = dataSource.getRepository(UserEntity).create({
      phone: "+989121234567",
      firstName: "کاربر",
      lastName: "نامرتبط",
      status: UserStatus.ACTIVE,
      username: null,
      passwordHash: null,
      mustChangePassword: true,
      temporaryPasswordExpiresAt: null,
      passwordChangedAt: null,
      credentialVersion: 0,
      lastLoginAt: null,
    });
    await dataSource.getRepository(UserEntity).save(unrelated);

    await expect(
      seedInitialAccess(dataSource, phone, credentials),
    ).rejects.toThrow(/initial system administrator/i);

    const after = await seededUser();
    expect(after).toMatchObject({
      id: unrelated.id,
      username: null,
      credentialVersion: 0,
    });
    await expect(
      dataSource.getRepository(UserRoleEntity).countBy({ userId: unrelated.id }),
    ).resolves.toBe(0);
    await expect(dataSource.getRepository(RoleEntity).count()).resolves.toBe(0);
  });

  it("fails atomically on a normalized username collision", async () => {
    await dataSource.query(
      `INSERT INTO users
         (phone, "firstName", "lastName", username, password_hash,
          must_change_password, temporary_password_expires_at,
          password_changed_at, credential_version)
       VALUES ($1, 'کاربر', 'دیگر', 'bootstrap.admin', 'existing-hash',
               true, now() + interval '24 hours', now(), 1)`,
      ["+989121234568"],
    );

    await expect(
      seedInitialAccess(dataSource, phone, {
        username: " Bootstrap.Admin ",
        password: credentials.password,
      }),
    ).rejects.toThrow(/username/i);

    await expect(
      dataSource.getRepository(UserEntity).countBy({ phone: "+989121234567" }),
    ).resolves.toBe(0);
    await expect(dataSource.getRepository(RoleEntity).count()).resolves.toBe(0);
  });

  it("requires credentials before mutating an initial account that lacks them", async () => {
    await expect(seedInitialAccess(dataSource, phone)).rejects.toThrow(
      /credentials are required/i,
    );

    await expect(dataSource.getRepository(UserEntity).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(RoleEntity).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(AuditLogEntity).count()).resolves.toBe(
      0,
    );
  });

  it("never returns or exposes the bootstrap password or hash in failures", async () => {
    const secret = "Never expose this bootstrap phrase 321!";
    const collisionId = randomUUID();
    await dataSource.query(
      `INSERT INTO users
         (id, phone, "firstName", "lastName", username, password_hash,
          must_change_password, temporary_password_expires_at,
          password_changed_at, credential_version)
       VALUES ($1, '+989121234568', 'کاربر', 'دیگر', 'bootstrap.admin',
               'existing-hash', true, now() + interval '24 hours', now(), 1)`,
      [collisionId],
    );

    let thrown: unknown;
    try {
      await seedInitialAccess(dataSource, phone, {
        username: "bootstrap.admin",
        password: secret,
      });
    } catch (error) {
      thrown = error;
    }
    const rendered = JSON.stringify(thrown);
    expect(rendered).not.toContain(secret);
    expect(rendered).not.toContain("existing-hash");
  });
});
