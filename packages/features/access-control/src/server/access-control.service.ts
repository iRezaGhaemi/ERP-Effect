import { randomUUID } from "node:crypto";

import { AuditWriter } from "@effect/audit/server";
import { DomainError, type Page } from "@effect-erp/contracts";
import { UserEntity, UserStatus } from "@effect/users/entities";
import { Inject, Injectable } from "@nestjs/common";
import { DataSource, type EntityManager, In } from "typeorm";

import {
  CreateRoleSchema,
  ReplacePermissionOverridesSchema,
  UpdateRoleSchema,
  type AccessPageQuery,
  type CreateRoleInput,
  type PermissionEffect as PermissionEffectValue,
  type PermissionDto,
  type ReplacePermissionOverridesInput,
  type RoleDto,
  type UpdateRoleInput,
} from "../contracts/index.js";
import {
  PermissionEffect,
  PermissionEntity,
  RoleEntity,
  RolePermissionEntity,
  UserPermissionOverrideEntity,
  UserRoleEntity,
} from "../entities/index.js";

export interface AccessControlRepository {
  isUserActive(userId: string, manager?: EntityManager): Promise<boolean>;
  getOverride(
    userId: string,
    key: string,
    manager?: EntityManager,
  ): Promise<PermissionEffectValue | null>;
  hasRoleGrant(
    userId: string,
    key: string,
    manager?: EntityManager,
  ): Promise<boolean>;
  listRolePermissionKeys(
    userId: string,
    manager?: EntityManager,
  ): Promise<string[]>;
  listOverrideEffects(
    userId: string,
    manager?: EntityManager,
  ): Promise<Array<{ key: string; effect: PermissionEffectValue }>>;
}

@Injectable()
export class PostgresAccessControlRepository implements AccessControlRepository {
  constructor(private readonly dataSource: DataSource) {}

  async isUserActive(
    userId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const user = await (manager ?? this.dataSource.manager)
      .getRepository(UserEntity)
      .findOne({
        where: { id: userId },
        select: { id: true, status: true },
      });
    return user?.status === UserStatus.ACTIVE;
  }

  async getOverride(userId: string, key: string, manager?: EntityManager) {
    const rows = await (manager ?? this.dataSource.manager).query<
      Array<{ effect: PermissionEffectValue }>
    >(
      `SELECT upo.effect
       FROM user_permission_overrides upo
       INNER JOIN permissions permission ON permission.id = upo.permission_id
       WHERE upo.user_id = $1 AND permission.key = $2`,
      [userId, key],
    );
    return rows[0]?.effect ?? null;
  }

  async hasRoleGrant(
    userId: string,
    key: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const rows = await (manager ?? this.dataSource.manager).query<
      Array<{ present: boolean }>
    >(
      `SELECT EXISTS (
         SELECT 1 FROM user_roles user_role
         INNER JOIN role_permissions role_permission ON role_permission.role_id = user_role.role_id
         INNER JOIN permissions permission ON permission.id = role_permission.permission_id
         WHERE user_role.user_id = $1 AND permission.key = $2
       ) AS present`,
      [userId, key],
    );
    return rows[0]?.present === true;
  }

  async listRolePermissionKeys(
    userId: string,
    manager?: EntityManager,
  ): Promise<string[]> {
    const rows = await (manager ?? this.dataSource.manager).query<
      Array<{ key: string }>
    >(
      `SELECT DISTINCT permission.key
       FROM user_roles user_role
       INNER JOIN role_permissions role_permission ON role_permission.role_id = user_role.role_id
       INNER JOIN permissions permission ON permission.id = role_permission.permission_id
       WHERE user_role.user_id = $1`,
      [userId],
    );
    return rows.map(({ key }) => key);
  }

  async listOverrideEffects(userId: string, manager?: EntityManager) {
    return (manager ?? this.dataSource.manager).query<
      Array<{ key: string; effect: PermissionEffectValue }>
    >(
      `SELECT permission.key, upo.effect
       FROM user_permission_overrides upo
       INNER JOIN permissions permission ON permission.id = upo.permission_id
       WHERE upo.user_id = $1`,
      [userId],
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function auditRequestId(): string {
  return `domain_${randomUUID()}`;
}

function toRoleDto(role: RoleEntity, permissionKeys: string[]): RoleDto {
  return {
    id: role.id,
    name: role.name,
    slug: role.slug,
    isSystem: role.isSystem,
    permissionKeys,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

function toPermissionDto(permission: PermissionEntity): PermissionDto {
  return {
    id: permission.id,
    resource: permission.resource,
    action: permission.action,
    key: permission.key,
    createdAt: permission.createdAt.toISOString(),
  };
}

async function rolePermissionKeys(
  roleId: string,
  manager: EntityManager,
): Promise<string[]> {
  const rows = await manager.query<Array<{ key: string }>>(
    `SELECT permission.key FROM role_permissions role_permission
     INNER JOIN permissions permission ON permission.id = role_permission.permission_id
     WHERE role_permission.role_id = $1 ORDER BY permission.key`,
    [roleId],
  );
  return rows.map(({ key }) => key);
}

@Injectable()
export class AccessControlService {
  constructor(
    @Inject(PostgresAccessControlRepository)
    private readonly repository: AccessControlRepository,
    private readonly dataSource: DataSource,
    private readonly auditWriter: AuditWriter,
  ) {}

  async hasPermission(userId: string, key: string): Promise<boolean> {
    if (!(await this.repository.isUserActive(userId))) return false;
    const override = await this.repository.getOverride(userId, key);
    if (override === PermissionEffect.DENY) return false;
    if (override === PermissionEffect.ALLOW) return true;
    return this.repository.hasRoleGrant(userId, key);
  }

  async listEffectivePermissions(userId: string): Promise<string[]> {
    if (!(await this.repository.isUserActive(userId))) return [];
    const effective = new Set(
      await this.repository.listRolePermissionKeys(userId),
    );
    for (const override of await this.repository.listOverrideEffects(userId)) {
      if (override.effect === "DENY")
        effective.delete(override.key);
      else effective.add(override.key);
    }
    return [...effective].sort();
  }

  async listRoles(query: AccessPageQuery): Promise<Page<RoleDto>> {
    const repository = this.dataSource.manager.getRepository(RoleEntity);
    const [roles, total] = await repository.findAndCount({
      order: { createdAt: "ASC", id: "ASC" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    const items = await Promise.all(
      roles.map(async (role) => {
        const keys = await rolePermissionKeys(role.id, this.dataSource.manager);
        return toRoleDto(role, keys);
      }),
    );
    return {
      items,
      meta: { ...query, total, pageCount: Math.ceil(total / query.pageSize) },
    };
  }

  async listPermissions(query: AccessPageQuery): Promise<Page<PermissionDto>> {
    const [items, total] = await this.dataSource.manager
      .getRepository(PermissionEntity)
      .findAndCount({
        order: { key: "ASC", id: "ASC" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
    return {
      items: items.map(toPermissionDto),
      meta: { ...query, total, pageCount: Math.ceil(total / query.pageSize) },
    };
  }

  async createRole(input: CreateRoleInput, actorId: string): Promise<RoleDto> {
    const values = CreateRoleSchema.parse(input);
    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.assertPermissionsExist(values.permissionIds, manager);
        const role = await manager.getRepository(RoleEntity).save(
          manager.getRepository(RoleEntity).create({
            name: values.name,
            slug: values.slug,
            isSystem: false,
          }),
        );
        if (values.permissionIds.length) {
          await manager.getRepository(RolePermissionEntity).insert(
            values.permissionIds.map((permissionId) => ({
              roleId: role.id,
              permissionId,
            })),
          );
        }
        await this.auditWriter.write(
          {
            actorId,
            action: "roles.created",
            entityType: "roles",
            entityId: role.id,
            metadata: { permissionIds: values.permissionIds },
            ipAddress: null,
            requestId: auditRequestId(),
          },
          manager,
        );
        return toRoleDto(role, await rolePermissionKeys(role.id, manager));
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new DomainError(
          "ROLE_ALREADY_EXISTS",
          "شناسه نقش قبلاً ثبت شده است.",
        );
      throw error;
    }
  }

  async updateRole(
    id: string,
    input: UpdateRoleInput,
    actorId: string,
  ): Promise<RoleDto> {
    const values = UpdateRoleSchema.parse(input);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(RoleEntity);
        const role = await repo.findOne({
          where: { id },
          lock: { mode: "pessimistic_write" },
        });
        if (!role) throw new DomainError("ROLE_NOT_FOUND", "نقش پیدا نشد.");
        if (role.isSystem && values.slug && values.slug !== role.slug) {
          throw new DomainError(
            "SYSTEM_ROLE_PROTECTED",
            "نقش سیستمی قابل تغییر شناسه نیست.",
          );
        }
        if (role.isSystem && values.permissionIds !== undefined) {
          throw new DomainError(
            "SYSTEM_ROLE_PROTECTED",
            "مجوزهای نقش سیستمی قابل تغییر نیست.",
          );
        }
        if (values.permissionIds) {
          await this.assertPermissionsExist(values.permissionIds, manager);
          await manager
            .getRepository(RolePermissionEntity)
            .delete({ roleId: id });
          if (values.permissionIds.length) {
            await manager.getRepository(RolePermissionEntity).insert(
              values.permissionIds.map((permissionId) => ({
                roleId: id,
                permissionId,
              })),
            );
          }
        }
        if (values.name !== undefined) role.name = values.name;
        if (values.slug !== undefined) role.slug = values.slug;
        const saved = await repo.save(role);
        await this.auditWriter.write(
          {
            actorId,
            action: "roles.updated",
            entityType: "roles",
            entityId: id,
            metadata: { permissionIds: values.permissionIds ?? [] },
            ipAddress: null,
            requestId: auditRequestId(),
          },
          manager,
        );
        return toRoleDto(saved, await rolePermissionKeys(saved.id, manager));
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new DomainError(
          "ROLE_ALREADY_EXISTS",
          "شناسه نقش قبلاً ثبت شده است.",
        );
      throw error;
    }
  }

  async deleteRole(id: string, actorId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(RoleEntity);
      const role = await repo.findOne({
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!role) throw new DomainError("ROLE_NOT_FOUND", "نقش پیدا نشد.");
      if (role.isSystem)
        throw new DomainError(
          "SYSTEM_ROLE_PROTECTED",
          "نقش سیستمی قابل حذف نیست.",
        );
      await repo.remove(role);
      await this.auditWriter.write(
        {
          actorId,
          action: "roles.deleted",
          entityType: "roles",
          entityId: id,
          metadata: {},
          ipAddress: null,
          requestId: auditRequestId(),
        },
        manager,
      );
    });
  }

  async replaceUserRoles(
    userId: string,
    roleIds: string[],
    actorId: string,
  ): Promise<void> {
    const uniqueRoleIds = [...new Set(roleIds)];
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtextextended('active-super-admin', 0))`,
      );
      const user = await manager.getRepository(UserEntity).findOne({
        where: { id: userId },
        lock: { mode: "pessimistic_write" },
      });
      if (!user) throw new DomainError("USER_NOT_FOUND", "کاربر پیدا نشد.");
      const roles = uniqueRoleIds.length
        ? await manager
            .getRepository(RoleEntity)
            .findBy({ id: In(uniqueRoleIds) })
        : [];
      if (roles.length !== uniqueRoleIds.length)
        throw new DomainError("ROLE_NOT_FOUND", "نقش پیدا نشد.");
      const currentSuper = await manager.query<Array<{ present: boolean }>>(
        `SELECT EXISTS (SELECT 1 FROM user_roles ur INNER JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1 AND r.slug = 'super-admin') AS present`,
        [userId],
      );
      const keepsSuper = roles.some((role) => role.slug === "super-admin");
      if (
        user.status === UserStatus.ACTIVE &&
        currentSuper[0]?.present &&
        !keepsSuper
      ) {
        const count = await manager.query<Array<{ count: string }>>(
          `SELECT COUNT(DISTINCT u.id)::text AS count FROM users u INNER JOIN user_roles ur ON ur.user_id = u.id INNER JOIN roles r ON r.id = ur.role_id WHERE u.status = 'ACTIVE' AND r.slug = 'super-admin'`,
        );
        if (Number(count[0]?.count ?? 0) <= 1) {
          throw new DomainError(
            "LAST_ACTIVE_SUPER_ADMIN",
            "آخرین مدیر ارشد فعال را نمی‌توان تغییر داد.",
          );
        }
      }
      await manager.getRepository(UserRoleEntity).delete({ userId });
      if (uniqueRoleIds.length) {
        await manager
          .getRepository(UserRoleEntity)
          .insert(uniqueRoleIds.map((roleId) => ({ userId, roleId })));
      }
      await this.auditWriter.write(
        {
          actorId,
          action: "users.roles_replaced",
          entityType: "users",
          entityId: userId,
          metadata: { roleIds: uniqueRoleIds },
          ipAddress: null,
          requestId: auditRequestId(),
        },
        manager,
      );
    });
  }

  async replaceUserPermissionOverrides(
    userId: string,
    input: ReplacePermissionOverridesInput,
    actorId: string,
  ): Promise<void> {
    const { overrides } = ReplacePermissionOverridesSchema.parse(input);
    const ids = overrides.map(({ permissionId }) => permissionId);
    if (new Set(ids).size !== ids.length)
      throw new DomainError(
        "DUPLICATE_PERMISSION_OVERRIDE",
        "مجوز تکراری است.",
      );
    await this.dataSource.transaction(async (manager) => {
      if (
        !(await manager
          .getRepository(UserEntity)
          .exist({ where: { id: userId } }))
      ) {
        throw new DomainError("USER_NOT_FOUND", "کاربر پیدا نشد.");
      }
      await this.assertPermissionsExist(ids, manager);
      await manager
        .getRepository(UserPermissionOverrideEntity)
        .delete({ userId });
      if (overrides.length) {
        await manager.getRepository(UserPermissionOverrideEntity).insert(
          overrides.map(({ permissionId, effect }) => ({
            userId,
            permissionId,
            effect: effect as PermissionEffect,
          })),
        );
      }
      await this.auditWriter.write(
        {
          actorId,
          action: "users.permission_overrides_replaced",
          entityType: "users",
          entityId: userId,
          metadata: { overrideCount: overrides.length },
          ipAddress: null,
          requestId: auditRequestId(),
        },
        manager,
      );
    });
  }

  private async assertPermissionsExist(
    ids: string[],
    manager: EntityManager,
  ): Promise<void> {
    if (!ids.length) return;
    const count = await manager
      .getRepository(PermissionEntity)
      .countBy({ id: In([...new Set(ids)]) });
    if (count !== new Set(ids).size)
      throw new DomainError("PERMISSION_NOT_FOUND", "مجوز پیدا نشد.");
  }
}
