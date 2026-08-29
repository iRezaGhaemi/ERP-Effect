import { randomUUID } from "node:crypto";

import { DomainError } from "@effect-erp/contracts";
import { UserStatus, type UserEntity } from "@effect/users/entities";
import { UsersService } from "@effect/users/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccessControlService,
  type AccessControlRepository,
} from "./access-control.service.js";

const userId = randomUUID();
const actorId = randomUUID();

function createResolver(overrides: Partial<AccessControlRepository> = {}) {
  const repository = {
    isUserActive: vi.fn().mockResolvedValue(true),
    getOverride: vi.fn().mockResolvedValue(null),
    hasRoleGrant: vi.fn().mockResolvedValue(false),
    listRolePermissionKeys: vi.fn().mockResolvedValue([]),
    listOverrideEffects: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return {
    repository,
    service: new AccessControlService(
      repository as never,
      {} as never,
      {} as never,
    ),
  };
}

describe("permission precedence", () => {
  it("applies deny override before role grants", async () => {
    const { service } = createResolver({
      getOverride: vi.fn().mockResolvedValue("DENY"),
      hasRoleGrant: vi.fn().mockResolvedValue(true),
    });
    await expect(service.hasPermission(userId, "users:update")).resolves.toBe(
      false,
    );
  });

  it("allows an explicit user grant when no deny exists", async () => {
    const { service } = createResolver({
      getOverride: vi.fn().mockResolvedValue("ALLOW"),
    });
    await expect(service.hasPermission(userId, "users:update")).resolves.toBe(
      true,
    );
  });

  it("denies a suspended user before evaluating grants", async () => {
    const { service, repository } = createResolver({
      isUserActive: vi.fn().mockResolvedValue(false),
      getOverride: vi.fn().mockResolvedValue("ALLOW"),
      hasRoleGrant: vi.fn().mockResolvedValue(true),
    });
    await expect(service.hasPermission(userId, "users:update")).resolves.toBe(
      false,
    );
    expect(repository.getOverride).not.toHaveBeenCalled();
    expect(repository.hasRoleGrant).not.toHaveBeenCalled();
  });

  it("denies an absent permission", async () => {
    const { service } = createResolver();
    await expect(service.hasPermission(userId, "users:update")).resolves.toBe(
      false,
    );
  });
});

describe("last active super-admin protection", () => {
  it("rejects suspending the final active super-admin inside the write transaction", async () => {
    const user = { id: userId, status: UserStatus.ACTIVE } as UserEntity;
    const manager = {
      query: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: "1" }]),
      getRepository: vi
        .fn()
        .mockReturnValue({ findOne: vi.fn().mockResolvedValue(user) }),
    };
    const dataSource = { transaction: vi.fn(async (work) => work(manager)) };
    const service = new UsersService(
      dataSource as never,
      { write: vi.fn() } as never,
    );

    await expect(
      service.setStatus(userId, UserStatus.SUSPENDED, actorId),
    ).rejects.toEqual(
      new DomainError(
        "LAST_ACTIVE_SUPER_ADMIN",
        "آخرین مدیر ارشد فعال را نمی‌توان تعلیق کرد.",
      ),
    );
    expect(dataSource.transaction).toHaveBeenCalledOnce();
  });

  it("rejects removing the final active super-admin role", async () => {
    const manager = {
      query: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ present: true }])
        .mockResolvedValueOnce([{ count: "1" }]),
      getRepository: vi.fn((entity: { name: string }) => {
        if (entity.name === "UserEntity")
          return {
            findOne: vi
              .fn()
              .mockResolvedValue({ id: userId, status: UserStatus.ACTIVE }),
          };
        if (entity.name === "RoleEntity")
          return { findBy: vi.fn().mockResolvedValue([]) };
        return {};
      }),
    };
    const dataSource = { transaction: vi.fn(async (work) => work(manager)) };
    const { repository } = createResolver();
    const service = new AccessControlService(
      repository as never,
      dataSource as never,
      { write: vi.fn() } as never,
    );

    await expect(
      service.replaceUserRoles(userId, [], actorId),
    ).rejects.toMatchObject({
      code: "LAST_ACTIVE_SUPER_ADMIN",
    });
  });
});
