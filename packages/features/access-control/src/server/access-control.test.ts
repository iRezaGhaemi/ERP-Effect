import { randomUUID } from "node:crypto";

import { DomainError } from "@effect-erp/contracts";
import { UserStatus, type UserEntity } from "@effect/users/entities";
import { UsersService } from "@effect/users/server";
import { describe, expect, it, vi } from "vitest";

import { RoleEntity } from "../entities/index.js";
import { AccessControlController } from "./access-control.controller.js";
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
    hasSystemSuperAdminRole: vi.fn().mockResolvedValue(false),
    listRolePermissionKeys: vi.fn().mockResolvedValue([]),
    listOverrideEffects: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return {
    repository,
    service: new AccessControlService(
      repository,
      {} as never,
      {} as never,
    ),
  };
}

function createSystemRoleService() {
  const role = Object.assign(new RoleEntity(), {
    id: randomUUID(),
    name: "مدیر ارشد",
    slug: "super-admin",
    isSystem: true,
    createdAt: new Date("2026-08-28T00:00:00.000Z"),
    updatedAt: new Date("2026-08-28T00:00:00.000Z"),
  });
  const manager = {
    getRepository: vi.fn((entity: { name: string }) => {
      if (entity.name === "RoleEntity") {
        return {
          findOne: vi.fn().mockResolvedValue(role),
          save: vi.fn().mockResolvedValue(role),
        };
      }
      if (entity.name === "RolePermissionEntity") {
        return { delete: vi.fn(), insert: vi.fn() };
      }
      return {};
    }),
  };
  const dataSource = { transaction: vi.fn(async (work) => work(manager)) };
  const { repository } = createResolver();
  return {
    role,
    service: new AccessControlService(
      repository,
      dataSource as never,
      { write: vi.fn() } as never,
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

  it("never delegates credential management outside the system super-admin role", async () => {
    const denied = createResolver({
      getOverride: vi.fn().mockResolvedValue("ALLOW"),
      hasRoleGrant: vi.fn().mockResolvedValue(true),
      hasSystemSuperAdminRole: vi.fn().mockResolvedValue(false),
    });
    await expect(
      denied.service.hasPermission(userId, "users:credentials:manage"),
    ).resolves.toBe(false);
    expect(denied.repository.getOverride).not.toHaveBeenCalled();

    const allowed = createResolver({
      hasSystemSuperAdminRole: vi.fn().mockResolvedValue(true),
      hasRoleGrant: vi.fn().mockResolvedValue(true),
    });
    await expect(
      allowed.service.hasPermission(userId, "users:credentials:manage"),
    ).resolves.toBe(true);
  });

  it("omits delegated credential management from effective permissions", async () => {
    const { service } = createResolver({
      listOverrideEffects: vi.fn().mockResolvedValue([
        { key: "users:credentials:manage", effect: "ALLOW" },
        { key: "users:read", effect: "ALLOW" },
      ]),
      hasSystemSuperAdminRole: vi.fn().mockResolvedValue(false),
    });
    await expect(service.listEffectivePermissions(userId)).resolves.toEqual([
      "users:read",
    ]);
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
      repository,
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

describe("system role protection", () => {
  it("rejects replacing the super-admin permission set", async () => {
    const { role, service } = createSystemRoleService();

    await expect(
      service.updateRole(role.id, { permissionIds: [] }, actorId),
    ).rejects.toMatchObject({ code: "SYSTEM_ROLE_PROTECTED" });
  });

  it("maps a super-admin permission replacement to a 422 API error", async () => {
    const { role, service } = createSystemRoleService();
    const controller = new AccessControlController(service);

    await expect(
      controller.updateRole(
        { id: role.id },
        { permissionIds: [] },
        {
          user: {
            userId: actorId,
            sessionId: randomUUID(),
            phone: "+989000000000",
            permissions: ["roles:manage"],
          },
          headers: { "x-request-id": "req_system_role" },
        },
      ),
    ).rejects.toMatchObject({
      status: 422,
      response: {
        error: {
          code: "SYSTEM_ROLE_PROTECTED",
          requestId: "req_system_role",
        },
      },
    });
  });
});

describe("administration replacement responses", () => {
  const request = {
    user: {
      userId: actorId,
      sessionId: randomUUID(),
      phone: "+989000000000",
      permissions: ["roles:manage"],
    },
    headers: { "x-request-id": "req_replacement_response" },
  };

  it("returns OkResponse after replacing a user's roles", async () => {
    const service = {
      replaceUserRoles: vi.fn().mockResolvedValue(undefined),
    };
    const controller = new AccessControlController(service as never);

    await expect(
      controller.replaceRoles(
        { id: userId },
        { roleIds: [randomUUID()] },
        request,
      ),
    ).resolves.toEqual({ ok: true });
  });

  it("returns OkResponse after replacing permission overrides", async () => {
    const service = {
      replaceUserPermissionOverrides: vi.fn().mockResolvedValue(undefined),
    };
    const controller = new AccessControlController(service as never);

    await expect(
      controller.replaceOverrides(
        { id: userId },
        { overrides: [{ permissionId: randomUUID(), effect: "ALLOW" }] },
        request,
      ),
    ).resolves.toEqual({ ok: true });
  });
});
