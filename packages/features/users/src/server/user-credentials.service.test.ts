import { DataSource, type EntityManager } from "typeorm";
import { describe, expect, it } from "vitest";

import { UserEntity, UserStatus } from "../entities/index.js";
import { UserCredentialsService } from "./user-credentials.service.js";

function createUser(username: string | null = null): UserEntity {
  return Object.assign(new UserEntity(), {
    id: "eb44ce5c-0474-4f52-adf8-97fe3c6c6985",
    phone: "+989121234567",
    firstName: "کاربر",
    lastName: "آزمایشی",
    status: UserStatus.SUSPENDED,
    username,
    passwordHash: username ? "old-hash" : null,
    mustChangePassword: username !== null,
    temporaryPasswordExpiresAt: username
      ? new Date("2026-09-01T01:00:00.000Z")
      : null,
    passwordChangedAt: username
      ? new Date("2026-08-31T01:00:00.000Z")
      : null,
    credentialVersion: username ? 4 : 0,
    lastLoginAt: null,
    createdAt: new Date("2026-08-28T00:00:00.000Z"),
    updatedAt: new Date("2026-08-28T00:00:00.000Z"),
  });
}

function createManager(): EntityManager {
  return {
    getRepository: () => ({
      save: async (user: UserEntity) => user,
    }),
  } as unknown as EntityManager;
}

function createService(): UserCredentialsService {
  return new UserCredentialsService({
    manager: new Proxy(
      {},
      {
        get() {
          throw new Error("the injected DataSource manager must not be used");
        },
      },
    ),
    transaction() {
      throw new Error("credential persistence must not open a transaction");
    },
  } as never);
}

describe("UserCredentialsService mutations", () => {
  it("maps credential columns explicitly and excludes the password hash by default", async () => {
    const source = new DataSource({
      type: "postgres",
      url: "postgres://unused:unused@localhost/unused",
      entities: [UserEntity],
    });
    await (
      source as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();

    const credentialColumns = new Map(
      source
        .getMetadata(UserEntity)
        .columns.filter(({ propertyName }) =>
          [
            "username",
            "passwordHash",
            "mustChangePassword",
            "temporaryPasswordExpiresAt",
            "passwordChangedAt",
            "credentialVersion",
          ].includes(propertyName),
        )
        .map((column) => [column.propertyName, column]),
    );

    expect([...credentialColumns.keys()].sort()).toEqual([
      "credentialVersion",
      "mustChangePassword",
      "passwordChangedAt",
      "passwordHash",
      "temporaryPasswordExpiresAt",
      "username",
    ]);
    expect(credentialColumns.get("passwordHash")?.databaseName).toBe(
      "password_hash",
    );
    expect(credentialColumns.get("passwordHash")?.isSelect).toBe(false);
    expect(
      credentialColumns.get("temporaryPasswordExpiresAt")?.databaseName,
    ).toBe("temporary_password_expires_at");
    expect(credentialColumns.get("passwordChangedAt")?.databaseName).toBe(
      "password_changed_at",
    );
    expect(credentialColumns.get("credentialVersion")?.databaseName).toBe(
      "credential_version",
    );
  });

  it("assigns a canonical temporary username without changing status", async () => {
    const service = createService();
    const user = createUser();
    const before = Date.now();

    const saved = await service.setTemporary(
      user,
      "  Legacy.User  ",
      "temporary-hash",
      createManager(),
    );
    const after = Date.now();

    expect(saved).toBe(user);
    expect(saved.username).toBe("legacy.user");
    expect(saved.passwordHash).toBe("temporary-hash");
    expect(saved.status).toBe(UserStatus.SUSPENDED);
    expect(saved.credentialVersion).toBe(1);
    expect(saved.mustChangePassword).toBe(true);
    expect(saved.passwordChangedAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(saved.passwordChangedAt!.getTime()).toBeLessThanOrEqual(after);
    expect(saved.temporaryPasswordExpiresAt!.getTime()).toBe(
      saved.passwordChangedAt!.getTime() + 24 * 60 * 60 * 1_000,
    );
  });

  it("retains an existing canonical username and increments its version", async () => {
    const service = createService();
    const user = createUser("legacy.user");

    const saved = await service.setTemporary(
      user,
      " LEGACY.USER ",
      "replacement-hash",
      createManager(),
    );

    expect(saved.username).toBe("legacy.user");
    expect(saved.passwordHash).toBe("replacement-hash");
    expect(saved.credentialVersion).toBe(5);
  });

  it("rejects reassignment of an existing username", async () => {
    const service = createService();
    const user = createUser("legacy.user");

    await expect(
      service.setTemporary(
        user,
        "different.user",
        "replacement-hash",
        createManager(),
      ),
    ).rejects.toMatchObject({ code: "USERNAME_IMMUTABLE" });
    expect(user.username).toBe("legacy.user");
    expect(user.passwordHash).toBe("old-hash");
    expect(user.credentialVersion).toBe(4);
  });

  it("sets a permanent password while preserving identity and suspension", async () => {
    const service = createService();
    const user = createUser("legacy.user");
    const before = Date.now();

    const saved = await service.setPermanent(
      user,
      "permanent-hash",
      createManager(),
    );
    const after = Date.now();

    expect(saved.username).toBe("legacy.user");
    expect(saved.passwordHash).toBe("permanent-hash");
    expect(saved.status).toBe(UserStatus.SUSPENDED);
    expect(saved.credentialVersion).toBe(5);
    expect(saved.mustChangePassword).toBe(false);
    expect(saved.temporaryPasswordExpiresAt).toBeNull();
    expect(saved.passwordChangedAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(saved.passwordChangedAt!.getTime()).toBeLessThanOrEqual(after);
  });
});
