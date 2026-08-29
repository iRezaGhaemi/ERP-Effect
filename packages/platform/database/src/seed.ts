import { randomUUID } from "node:crypto";

import {
  PermissionEntity,
  RoleEntity,
  RolePermissionEntity,
  UserRoleEntity,
} from "@effect/access-control/entities";
import { AuditWriter } from "@effect/audit/server";
import { UserEntity, UserStatus } from "@effect/users/entities";
import { normalizeIranianMobile } from "@effect/users/server";
import type { DataSource } from "typeorm";

const permissionCatalog = [
  { key: "users:read", resource: "users", action: "read" },
  { key: "users:create", resource: "users", action: "create" },
  { key: "users:update", resource: "users", action: "update" },
  { key: "users:suspend", resource: "users", action: "suspend" },
  { key: "roles:manage", resource: "roles", action: "manage" },
  { key: "sessions:revoke", resource: "sessions", action: "revoke" },
  { key: "audit:read", resource: "audit", action: "read" },
] as const;

const permissionKeys = permissionCatalog.map(({ key }) => key);
const permissionKeySet = new Set<string>(permissionKeys);

function sameIds(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) return false;
  const expectedIds = new Set(expected);
  return actual.every((id) => expectedIds.has(id));
}

export async function seedInitialAccess(
  dataSource: DataSource,
  initialAdminPhone: string,
): Promise<void> {
  const phone = normalizeIranianMobile(initialAdminPhone);
  const audit = new AuditWriter(dataSource);
  await dataSource.transaction(async (manager) => {
    await manager.query(
      `SELECT pg_advisory_xact_lock(hashtextextended('initial-access-seed', 0))`,
    );
    const permissionRepository = manager.getRepository(PermissionEntity);
    const roleRepository = manager.getRepository(RoleEntity);
    const userRepository = manager.getRepository(UserEntity);
    const existingPermissions = await permissionRepository.findBy(
      permissionKeys.map((key) => ({ key })),
    );
    let role = await roleRepository.findOneBy({ slug: "super-admin" });
    const existingUser = await userRepository.findOneBy({ phone });
    const existingGrants = role
      ? await manager
          .getRepository(RolePermissionEntity)
          .findBy({ roleId: role.id })
      : [];
    const hadAssignment =
      role && existingUser
        ? await manager
            .getRepository(UserRoleEntity)
            .exist({ where: { userId: existingUser.id, roleId: role.id } })
        : false;
    const catalogWasExact = permissionCatalog.every((expected) => {
      const actual = existingPermissions.find(
        ({ key }) => key === expected.key,
      );
      return (
        actual?.resource === expected.resource &&
        actual.action === expected.action
      );
    });
    const roleWasExact = role?.name === "مدیر ارشد" && role.isSystem === true;
    const userWasActive = existingUser?.status === UserStatus.ACTIVE;
    const existingPermissionIds = existingPermissions
      .filter(({ key }) => permissionKeySet.has(key))
      .map(({ id }) => id);
    const grantsWereExact = sameIds(
      existingGrants.map(({ permissionId }) => permissionId),
      existingPermissionIds,
    );
    const wasComplete =
      catalogWasExact &&
      roleWasExact &&
      userWasActive &&
      grantsWereExact &&
      hadAssignment;
    const hadExistingSeedState =
      existingPermissions.length > 0 || role !== null || existingUser !== null;

    if (!catalogWasExact)
      await permissionRepository.upsert(
        permissionCatalog.map((permission) => ({ ...permission })),
        ["key"],
      );
    if (!role)
      role = roleRepository.create({
        name: "مدیر ارشد",
        slug: "super-admin",
        isSystem: true,
      });
    else if (!roleWasExact) {
      role.name = "مدیر ارشد";
      role.isSystem = true;
    }
    if (!roleWasExact) role = await roleRepository.save(role);

    const permissions = await permissionRepository.findBy(
      permissionKeys.map((key) => ({ key })),
    );
    if (
      !sameIds(
        existingGrants.map(({ permissionId }) => permissionId),
        permissions.map(({ id }) => id),
      )
    ) {
      await manager
        .getRepository(RolePermissionEntity)
        .delete({ roleId: role.id });
      await manager
        .createQueryBuilder()
        .insert()
        .into(RolePermissionEntity)
        .values(
          permissions.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          })),
        )
        .orIgnore()
        .execute();
    }
    const user =
      existingUser ??
      userRepository.create({
        phone,
        firstName: "مدیر",
        lastName: "سیستم",
        status: UserStatus.ACTIVE,
      });
    if (user.status !== UserStatus.ACTIVE) user.status = UserStatus.ACTIVE;
    const savedUser =
      !existingUser || !userWasActive ? await userRepository.save(user) : user;
    if (!hadAssignment)
      await manager
        .createQueryBuilder()
        .insert()
        .into(UserRoleEntity)
        .values({ userId: savedUser.id, roleId: role.id })
        .orIgnore()
        .execute();

    if (!wasComplete) {
      await audit.write(
        {
          actorId: null,
          action: hadExistingSeedState
            ? "seed.access_control_repaired"
            : "seed.access_control_initialized",
          entityType: "roles",
          entityId: role.id,
          metadata: { permissionCount: permissions.length },
          ipAddress: null,
          requestId: `seed_${randomUUID()}`,
        },
        manager,
      );
    }
  });
}
