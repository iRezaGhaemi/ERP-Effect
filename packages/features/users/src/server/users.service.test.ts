import { randomUUID } from "node:crypto";

import type { EntityManager } from "typeorm";
import { describe, expect, it, vi } from "vitest";

import { UserEntity, UserStatus } from "../entities/index.js";
import { normalizeIranianMobile } from "./phone.js";
import { UsersFacade, UsersService } from "./users.service.js";

const actorId = "c411ff93-44ff-4d54-aea6-27650a286ccd";

function createManager(): EntityManager {
  const users: UserEntity[] = [];
  const repository = {
    create(
      values: Pick<UserEntity, "phone" | "firstName" | "lastName" | "status">,
    ): UserEntity {
      return Object.assign(new UserEntity(), {
        id: randomUUID(),
        ...values,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    },
    async save(user: UserEntity): Promise<UserEntity> {
      if (users.some((existing) => existing.phone === user.phone)) {
        throw Object.assign(new Error("duplicate phone"), { code: "23505" });
      }

      users.push(user);
      return user;
    },
    async findOneBy(
      criteria: Partial<Pick<UserEntity, "phone" | "status">>,
    ): Promise<UserEntity | null> {
      return (
        users.find(
          (user) =>
            (criteria.phone === undefined || user.phone === criteria.phone) &&
            (criteria.status === undefined || user.status === criteria.status),
        ) ?? null
      );
    },
  };

  return { getRepository: () => repository } as unknown as EntityManager;
}

describe("users service", () => {
  it.each([
    ["۰۹۱۲۱۲۳۴۵۶۷", "+989121234567"],
    ["09121234567", "+989121234567"],
    ["00989121234567", "+989121234567"],
    ["+989121234567", "+989121234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeIranianMobile(input)).toBe(expected);
  });

  it("enforces unique normalized phone numbers", async () => {
    const manager = createManager();
    const service = new UsersService(
      {
        transaction: (work: (manager: EntityManager) => unknown) =>
          work(manager),
      } as never,
      { write: vi.fn() } as never,
      {
        setTemporary: vi.fn(async (user: UserEntity, username: string) =>
          Object.assign(user, { username, mustChangePassword: true, credentialVersion: 1 }),
        ),
      } as never,
    );

    await service.create(
      { phone: "09121234567", firstName: "رضا", lastName: "قایمی", username: "reza", initialPassword: "Strong-password-123!" },
      actorId,
    );

    await expect(
      service.create(
        { phone: "+989121234567", firstName: "رضا", lastName: "دوم", username: "reza2", initialPassword: "Strong-password-456!" },
        actorId,
      ),
    ).rejects.toMatchObject({ code: "PHONE_ALREADY_EXISTS" });
  });

  it("returns null for suspended users through the active-user facade", async () => {
    const manager = createManager();
    const service = new UsersService(
      {
        transaction: (work: (manager: EntityManager) => unknown) =>
          work(manager),
      } as never,
      { write: vi.fn() } as never,
      {
        setTemporary: vi.fn(async (user: UserEntity, username: string) =>
          Object.assign(user, { username, mustChangePassword: true, credentialVersion: 1 }),
        ),
      } as never,
    );
    const facade = new UsersFacade({ manager } as never);
    await service.create(
      { phone: "09121234567", firstName: "رضا", lastName: "قایمی", username: "reza", initialPassword: "Strong-password-123!" },
      actorId,
      manager,
    );
    const stored = await facade.findActiveByPhone("09121234567", manager);
    expect(stored).not.toBeNull();
    stored!.status = UserStatus.SUSPENDED;

    expect(await facade.findActiveByPhone("09121234567", manager)).toBeNull();
    expect(await facade.findActiveByPhone("09129999999", manager)).toBeNull();
  });

  it("returns JSON-wire user summaries from list", async () => {
    const user = Object.assign(new UserEntity(), {
      id: "013a40c7-82e7-4435-a5d6-988b03fdce37",
      phone: "+989121234567",
      firstName: "رضا",
      lastName: "قایمی",
      status: UserStatus.ACTIVE,
      username: "reza",
      mustChangePassword: false,
      lastLoginAt: new Date("2026-08-28T01:00:00.000Z"),
      createdAt: new Date("2026-08-28T00:00:00.000Z"),
      updatedAt: new Date("2026-08-28T02:00:00.000Z"),
    });
    const service = new UsersService(
      {
        manager: {
          getRepository: () => ({
            findAndCount: vi.fn().mockResolvedValue([[user], 1]),
          }),
        },
      } as never,
      { write: vi.fn() } as never,
      {} as never,
    );

    await expect(service.list({ page: 1, pageSize: 20 })).resolves.toEqual({
      items: [
        {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          status: "ACTIVE",
          username: "reza",
          credentialsReady: true,
          mustChangePassword: false,
          lastLoginAt: "2026-08-28T01:00:00.000Z",
          createdAt: "2026-08-28T00:00:00.000Z",
          updatedAt: "2026-08-28T02:00:00.000Z",
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, pageCount: 1 },
    });
  });

  it("returns role assignments and explicit overrides in user detail", async () => {
    const user = Object.assign(new UserEntity(), {
      id: "013a40c7-82e7-4435-a5d6-988b03fdce37",
      phone: "+989121234567",
      firstName: "رضا",
      lastName: "قایمی",
      status: UserStatus.ACTIVE,
      username: "reza",
      mustChangePassword: false,
      lastLoginAt: null,
      createdAt: new Date("2026-08-28T00:00:00.000Z"),
      updatedAt: new Date("2026-08-28T02:00:00.000Z"),
    });
    const roleId = "8be4f7bd-ce15-4679-a721-ca557fac79e9";
    const permissionId = "0f4ee796-6148-42c0-802a-55409f226f50";
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ roleId }])
      .mockResolvedValueOnce([{ permissionId, effect: "DENY" }]);
    const service = new UsersService(
      {
        manager: {
          query,
          getRepository: () => ({
            findOneBy: vi.fn().mockResolvedValue(user),
          }),
        },
      } as never,
      { write: vi.fn() } as never,
      {} as never,
    );

    await expect(service.get(user.id)).resolves.toEqual({
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      status: "ACTIVE",
      username: "reza",
      credentialsReady: true,
      mustChangePassword: false,
      lastLoginAt: null,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T02:00:00.000Z",
      roleIds: [roleId],
      permissionOverrides: [{ permissionId, effect: "DENY" }],
    });
  });
});
