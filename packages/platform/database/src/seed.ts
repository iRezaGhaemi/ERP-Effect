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

const permissionKeys = [
  "users:read",
  "users:create",
  "users:update",
  "users:suspend",
  "roles:manage",
  "sessions:revoke",
  "audit:read",
] as const;

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
    const beforePermissions = await permissionRepository.countBy(
      permissionKeys.map((key) => ({ key })),
    );
    let role = await roleRepository.findOneBy({ slug: "super-admin" });
    const existingUser = await userRepository.findOneBy({ phone });
    const beforeGrantCount = role
      ? await manager
          .getRepository(RolePermissionEntity)
          .countBy({ roleId: role.id })
      : 0;
    const hadAssignment =
      role && existingUser
        ? await manager
            .getRepository(UserRoleEntity)
            .exist({ where: { userId: existingUser.id, roleId: role.id } })
        : false;
    const wasComplete =
      beforePermissions === permissionKeys.length &&
      role?.isSystem === true &&
      existingUser?.status === UserStatus.ACTIVE &&
      beforeGrantCount === permissionKeys.length &&
      hadAssignment;

    await permissionRepository.upsert(
      permissionKeys.map((key) => {
        const [resource, action] = key.split(":") as [string, string];
        return { key, resource, action };
      }),
      ["key"],
    );
    if (!role)
      role = roleRepository.create({
        name: "مدیر ارشد",
        slug: "super-admin",
        isSystem: true,
      });
    else {
      role.name = "مدیر ارشد";
      role.isSystem = true;
    }
    role = await roleRepository.save(role);

    const permissions = await permissionRepository.findBy(
      permissionKeys.map((key) => ({ key })),
    );
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
    const user =
      existingUser ??
      userRepository.create({
        phone,
        firstName: "مدیر",
        lastName: "سیستم",
        status: UserStatus.ACTIVE,
      });
    user.status = UserStatus.ACTIVE;
    const savedUser = await userRepository.save(user);
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
          action: "seed.access_control_initialized",
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
