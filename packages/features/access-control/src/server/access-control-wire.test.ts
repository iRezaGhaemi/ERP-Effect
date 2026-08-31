import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { PermissionEntity, RoleEntity } from "../entities/index.js";
import {
  AccessControlService,
  type AccessControlRepository,
} from "./access-control.service.js";

const actorId = "c411ff93-44ff-4d54-aea6-27650a286ccd";
const permissionId = "0f4ee796-6148-42c0-802a-55409f226f50";

function createRepository(): AccessControlRepository {
  return {
    isUserActive: vi.fn(),
    getOverride: vi.fn(),
    hasRoleGrant: vi.fn(),
    listRolePermissionKeys: vi.fn(),
    listOverrideEffects: vi.fn(),
  };
}

function createRoleDataSource() {
  const role = Object.assign(new RoleEntity(), {
    id: randomUUID(),
    name: "اپراتور",
    slug: "operator",
    isSystem: false,
    createdAt: new Date("2026-08-28T00:00:00.000Z"),
    updatedAt: new Date("2026-08-28T02:00:00.000Z"),
  });
  const roleRepository = {
    create: vi.fn((values) => Object.assign(role, values)),
    save: vi.fn().mockResolvedValue(role),
    findOne: vi.fn().mockResolvedValue(role),
    findAndCount: vi.fn().mockResolvedValue([[role], 1]),
  };
  const manager = {
    query: vi.fn().mockResolvedValue([{ key: "users:read" }]),
    getRepository: vi.fn((entity: { name: string }) => {
      if (entity.name === "RoleEntity") return roleRepository;
      if (entity.name === "PermissionEntity") {
        return { countBy: vi.fn().mockResolvedValue(1) };
      }
      if (entity.name === "RolePermissionEntity") {
        return { delete: vi.fn(), insert: vi.fn() };
      }
      return {};
    }),
  };
  return {
    role,
    dataSource: {
      manager,
      transaction: vi.fn(async (work) => work(manager)),
    },
  };
}

describe("access-control JSON responses", () => {
  it("maps role create and update results to the declared wire DTO", async () => {
    const { role, dataSource } = createRoleDataSource();
    const service = new AccessControlService(
      createRepository(),
      dataSource as never,
      { write: vi.fn() } as never,
    );
    const expected = {
      id: role.id,
      name: "اپراتور",
      slug: "operator",
      isSystem: false,
      permissionKeys: ["users:read"],
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T02:00:00.000Z",
    };

    await expect(
      service.createRole(
        { name: "اپراتور", slug: "operator", permissionIds: [permissionId] },
        actorId,
      ),
    ).resolves.toEqual(expected);
    await expect(
      service.updateRole(
        role.id,
        { name: "اپراتور", permissionIds: [permissionId] },
        actorId,
      ),
    ).resolves.toEqual(expected);
  });

  it("maps role and permission lists to ISO-date wire DTOs", async () => {
    const { role, dataSource } = createRoleDataSource();
    const permission = Object.assign(new PermissionEntity(), {
      id: permissionId,
      resource: "users",
      action: "read",
      key: "users:read",
      createdAt: new Date("2026-08-28T00:00:00.000Z"),
    });
    dataSource.manager.getRepository.mockImplementation(
      (entity: { name: string }) => {
        if (entity.name === "RoleEntity") {
          return { findAndCount: vi.fn().mockResolvedValue([[role], 1]) };
        }
        if (entity.name === "PermissionEntity") {
          return { findAndCount: vi.fn().mockResolvedValue([[permission], 1]) };
        }
        return {};
      },
    );
    const service = new AccessControlService(
      createRepository(),
      dataSource as never,
      { write: vi.fn() } as never,
    );

    const roles = await service.listRoles({ page: 1, pageSize: 20 });
    const permissions = await service.listPermissions({
      page: 1,
      pageSize: 20,
    });
    expect(roles.items[0]).toMatchObject({
      id: role.id,
      permissionKeys: ["users:read"],
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T02:00:00.000Z",
    });
    expect(permissions.items[0]).toEqual({
      id: permissionId,
      resource: "users",
      action: "read",
      key: "users:read",
      createdAt: "2026-08-28T00:00:00.000Z",
    });
  });
});
