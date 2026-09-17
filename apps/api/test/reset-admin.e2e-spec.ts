import { randomUUID } from "node:crypto";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { UserRoleEntity } from "@effect/access-control/entities";
import { AuditLogEntity } from "@effect/audit/entities";
import {
  RefreshTokenEntity,
  SessionEntity,
} from "@effect/auth/entities";
import { createDataSource, seedInitialAccess } from "@effect-erp/database";
import { startPostgresContainer } from "@effect-erp/testing";
import { UserEntity, UserStatus } from "@effect/users/entities";
import { passwordHasher, UserCredentialsService } from "@effect/users/server";
import { IsNull } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AdminRecoveryService,
  parseResetAdminArgs,
  readPasswordFile,
  runResetAdmin,
} from "../src/reset-admin.js";

const bootstrapCredentials = {
  username: "bootstrap.admin",
  password: "Task5 bootstrap phrase 123!",
};
const recoveryPassword = "Task5 recovery phrase 456!";

let container: Awaited<ReturnType<typeof startPostgresContainer>>;
let owner: ReturnType<typeof createDataSource>;
let runtime: ReturnType<typeof createDataSource>;

async function bootstrapAdmin(status = UserStatus.ACTIVE): Promise<UserEntity> {
  await seedInitialAccess(owner, "09121234567", bootstrapCredentials);
  const user = await credentialUserByPhone("+989121234567");
  if (status !== UserStatus.ACTIVE) {
    user.status = status;
    await owner.getRepository(UserEntity).save(user);
  }
  return user;
}

async function credentialUserByPhone(phone: string): Promise<UserEntity> {
  return owner
    .getRepository(UserEntity)
    .createQueryBuilder("user")
    .addSelect("user.passwordHash")
    .where("user.phone = :phone", { phone })
    .getOneOrFail();
}

async function credentialUser(id: string): Promise<UserEntity> {
  return owner
    .getRepository(UserEntity)
    .createQueryBuilder("user")
    .addSelect("user.passwordHash")
    .where("user.id = :id", { id })
    .getOneOrFail();
}

describe("reset-admin operator boundary", () => {
  beforeAll(async () => {
    container = await startPostgresContainer();
    const base = `postgres://effect:effect@${container.getHost()}:${container.getMappedPort(5432)}/effect_erp`;
    owner = createDataSource({ url: base });
    await owner.initialize();
    await owner.runMigrations();
    await owner.query(`
      REVOKE CREATE ON SCHEMA public FROM PUBLIC;
      CREATE ROLE effect_task5_runtime
        LOGIN PASSWORD 'effect-task5-runtime'
        NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
      GRANT CONNECT ON DATABASE effect_erp TO effect_task5_runtime;
      GRANT USAGE ON SCHEMA public TO effect_task5_runtime;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO effect_task5_runtime;
    `);
    runtime = createDataSource({
      url: `postgres://effect_task5_runtime:effect-task5-runtime@${container.getHost()}:${container.getMappedPort(5432)}/effect_erp`,
    });
    await runtime.initialize();
  }, 120_000);

  beforeEach(async () => {
    await owner.query(
      "TRUNCATE TABLE audit_logs, refresh_tokens, sessions, user_permission_overrides, user_roles, role_permissions, permissions, roles, rate_limit_buckets, users RESTART IDENTITY CASCADE",
    );
  });

  afterAll(async () => {
    if (runtime?.isInitialized) await runtime.destroy();
    if (owner?.isInitialized) await owner.destroy();
    if (container) await container.stop();
  });

  it("requires one valid user id and rejects password or unknown argv inputs", () => {
    const id = randomUUID();
    expect(parseResetAdminArgs(["--user-id", id])).toEqual({
      userId: id,
      passwordSource: { kind: "terminal" },
    });
    expect(parseResetAdminArgs(["--user-id", id, "--password-stdin"])).toEqual(
      {
        userId: id,
        passwordSource: { kind: "stdin" },
      },
    );
    expect(
      parseResetAdminArgs([
        "--user-id",
        id,
        "--password-file",
        "/run/secrets/admin-password",
      ]),
    ).toEqual({
      userId: id,
      passwordSource: {
        kind: "file",
        path: "/run/secrets/admin-password",
      },
    });
    for (const argv of [
      [],
      ["--user-id", "not-a-uuid"],
      ["--user-id", id, recoveryPassword],
      ["--user-id", id, "--password", recoveryPassword],
      ["--user-id", id, `--password=${recoveryPassword}`],
      ["--user-id", id, "--unknown"],
      ["--user-id", id, "--password-stdin", "--password-file", "secret"],
    ]) {
      expect(() => parseResetAdminArgs(argv)).toThrow();
    }
  });

  it("requires an explicit stdin or secret-file mode outside a terminal and never echoes the password", async () => {
    const id = randomUUID();
    const reset = vi.fn().mockResolvedValue(undefined);
    const write = vi.fn();
    await expect(
      runResetAdmin(["--user-id", id], {
        isTerminal: false,
        readTerminalPassword: vi.fn(),
        readStdinPassword: vi.fn(),
        readPasswordFile,
        reset,
        write,
      }),
    ).rejects.toThrow(/explicit password source/i);

    await runResetAdmin(["--user-id", id, "--password-stdin"], {
      isTerminal: false,
      readTerminalPassword: vi.fn(),
      readStdinPassword: vi.fn().mockResolvedValue(`${recoveryPassword}\n`),
      readPasswordFile,
      reset,
      write,
    });

    expect(reset).toHaveBeenCalledWith(id, recoveryPassword);
    const rendered = JSON.stringify(write.mock.calls);
    expect(rendered).not.toContain(recoveryPassword);
    expect(rendered).not.toContain("$scrypt$");
  });

  it("accepts only an owned regular secret file without group or other permissions", async () => {
    const directory = await mkdtemp(join(tmpdir(), "effect-task5-secret-"));
    const path = join(directory, "password");
    await writeFile(path, `${recoveryPassword}\n`, { mode: 0o600 });
    await expect(readPasswordFile(path)).resolves.toBe(recoveryPassword);

    await chmod(path, 0o640);
    await expect(readPasswordFile(path)).rejects.toThrow(/permissions/i);
    await expect(readPasswordFile(directory)).rejects.toThrow(/regular file/i);
  });

  it("rejects unknown and non-system-administrator UUIDs without mutation", async () => {
    const service = new AdminRecoveryService(runtime);
    await expect(service.reset(randomUUID(), recoveryPassword)).rejects.toThrow(
      /administrator/i,
    );
    const unrelated = owner.getRepository(UserEntity).create({
      phone: "+989121234568",
      firstName: "کاربر",
      lastName: "عادی",
      status: UserStatus.ACTIVE,
      username: "ordinary.user",
      passwordHash: await passwordHasher.hash("Ordinary user phrase 123!"),
      mustChangePassword: false,
      temporaryPasswordExpiresAt: null,
      passwordChangedAt: new Date("2026-09-01T00:00:00.000Z"),
      credentialVersion: 4,
      lastLoginAt: null,
    });
    await owner.getRepository(UserEntity).save(unrelated);
    const before = await credentialUser(unrelated.id);

    await expect(service.reset(unrelated.id, recoveryPassword)).rejects.toThrow(
      /administrator/i,
    );

    expect(await credentialUser(unrelated.id)).toMatchObject({
      passwordHash: before.passwordHash,
      credentialVersion: 4,
      mustChangePassword: false,
    });
    await expect(owner.getRepository(AuditLogEntity).count()).resolves.toBe(0);
  });

  it("rejects an unsafe database role before changing credentials", async () => {
    const admin = await bootstrapAdmin();
    const before = await credentialUser(admin.id);

    await expect(
      new AdminRecoveryService(owner).reset(admin.id, recoveryPassword),
    ).rejects.toThrow("Unsafe audit database role.");

    expect(await credentialUser(admin.id)).toMatchObject({
      passwordHash: before.passwordHash,
      credentialVersion: before.credentialVersion,
    });
  });

  it("resets a suspended system administrator for 24 hours without changing identity, status, or roles and revokes every session family", async () => {
    const admin = await bootstrapAdmin(UserStatus.SUSPENDED);
    const roleIds = (
      await owner.getRepository(UserRoleEntity).findBy({ userId: admin.id })
    ).map(({ roleId }) => roleId);
    const sessionIds = [randomUUID(), randomUUID()];
    for (const [index, sessionId] of sessionIds.entries()) {
      await owner.getRepository(SessionEntity).save(
        owner.getRepository(SessionEntity).create({
          id: sessionId,
          userId: admin.id,
          credentialVersion: admin.credentialVersion,
          userAgent: `task5-${index}`,
          ipAddress: "127.0.0.1",
          csrfHash: String(index).repeat(64),
          lastUsedAt: new Date(),
          expiresAt: new Date(Date.now() + 86_400_000),
          revokedAt: index === 0 ? null : new Date(),
          revokedReason: index === 0 ? null : "LOGOUT",
        }),
      );
      await owner.getRepository(RefreshTokenEntity).save(
        owner.getRepository(RefreshTokenEntity).create({
          id: randomUUID(),
          sessionId,
          tokenHash: String(index + 1).repeat(64),
          expiresAt: new Date(Date.now() + 86_400_000),
          consumedAt: null,
          revokedAt: null,
          replacedByTokenId: null,
        }),
      );
    }

    await runtime.transaction(async (manager) => {
      const visible = await new UserCredentialsService(runtime).lockById(
        admin.id,
        manager,
      );
      const [role] = await manager.query<Array<{ present: boolean }>>(
        `SELECT EXISTS (
           SELECT 1 FROM user_roles assignment
           INNER JOIN roles role ON role.id = assignment.role_id
           WHERE assignment.user_id = $1
             AND role.slug = 'super-admin' AND role.is_system = true
         ) AS present`,
        [admin.id],
      );
      expect({
        found: visible !== null,
        username: visible?.username,
        hasPasswordHash: Boolean(visible?.passwordHash),
        hasSystemRole: role?.present,
      }).toEqual({
        found: true,
        username: bootstrapCredentials.username,
        hasPasswordHash: true,
        hasSystemRole: true,
      });
    });

    await new AdminRecoveryService(runtime).reset(admin.id, recoveryPassword);

    const recovered = await credentialUser(admin.id);
    expect(recovered).toMatchObject({
      id: admin.id,
      status: UserStatus.SUSPENDED,
      username: bootstrapCredentials.username,
      mustChangePassword: true,
      credentialVersion: admin.credentialVersion + 1,
    });
    expect(recovered.temporaryPasswordExpiresAt!.getTime()).toBe(
      recovered.passwordChangedAt!.getTime() + 24 * 60 * 60 * 1_000,
    );
    await expect(
      passwordHasher.verify(recoveryPassword, recovered.passwordHash!),
    ).resolves.toBe(true);
    expect(
      (
        await owner
          .getRepository(UserRoleEntity)
          .findBy({ userId: admin.id })
      ).map(({ roleId }) => roleId),
    ).toEqual(roleIds);
    expect(
      await owner.getRepository(SessionEntity).findBy({ userId: admin.id }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ revokedReason: "PASSWORD_RESET" }),
      ]),
    );
    expect(
      await owner
        .getRepository(RefreshTokenEntity)
        .countBy({ revokedAt: IsNull() }),
    ).toBe(0);
    expect(
      await owner.getRepository(AuditLogEntity).findOneByOrFail({
        action: "auth.password_recovered",
        entityId: admin.id,
      }),
    ).toMatchObject({ actorId: null, metadata: {} });
  });

  it("rolls back credential and session changes when the audit append fails", async () => {
    const admin = await bootstrapAdmin();
    const session = owner.getRepository(SessionEntity).create({
      id: randomUUID(),
      userId: admin.id,
      credentialVersion: admin.credentialVersion,
      userAgent: "task5-rollback",
      ipAddress: "127.0.0.1",
      csrfHash: "a".repeat(64),
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
      revokedAt: null,
      revokedReason: null,
    });
    await owner.getRepository(SessionEntity).save(session);
    const before = await credentialUser(admin.id);
    const failingAudit = {
      write: vi.fn().mockRejectedValue(new Error("forced audit failure")),
    };

    await expect(
      new AdminRecoveryService(runtime, failingAudit).reset(
        admin.id,
        recoveryPassword,
      ),
    ).rejects.toThrow("forced audit failure");

    const after = await credentialUser(admin.id);
    expect(after).toMatchObject({
      passwordHash: before.passwordHash,
      credentialVersion: before.credentialVersion,
      temporaryPasswordExpiresAt: before.temporaryPasswordExpiresAt,
    });
    expect(
      await owner.getRepository(SessionEntity).findOneByOrFail({ id: session.id }),
    ).toMatchObject({ revokedAt: null, revokedReason: null });
  });
});
