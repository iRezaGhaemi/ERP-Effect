import { randomUUID } from "node:crypto";

import {
  PermissionEntity,
  RoleEntity,
  RolePermissionEntity,
  UserRoleEntity,
} from "@effect/access-control/entities";
import { AuditLogEntity } from "@effect/audit/entities";
import { UserEntity } from "@effect/users/entities";
import type { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";

import { seedInitialAccess } from "./seed.js";

type SeedState = {
  permissions: PermissionEntity[];
  roles: RoleEntity[];
  users: UserEntity[];
  rolePermissions: RolePermissionEntity[];
  userRoles: UserRoleEntity[];
  audits: AuditLogEntity[];
};

function matches(row: object, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, value]) =>
    key === "where"
      ? matches(row, value as Record<string, unknown>)
      : (row as Record<string, unknown>)[key] === value,
  );
}

function createSeedHarness(): { dataSource: DataSource; state: SeedState } {
  const state: SeedState = {
    permissions: [],
    roles: [],
    users: [],
    rolePermissions: [],
    userRoles: [],
    audits: [],
  };
  const rowsFor = (entity: Function): object[] => {
    if (entity === PermissionEntity) return state.permissions;
    if (entity === RoleEntity) return state.roles;
    if (entity === UserEntity) return state.users;
    if (entity === RolePermissionEntity) return state.rolePermissions;
    if (entity === UserRoleEntity) return state.userRoles;
    if (entity === AuditLogEntity) return state.audits;
    throw new Error(`Unsupported repository: ${entity.name}`);
  };
  const repositoryFor = (entity: Function) => {
    const rows = rowsFor(entity);
    return {
      countBy: async (
        where: Record<string, unknown> | Record<string, unknown>[],
      ) =>
        rows.filter((row) =>
          (Array.isArray(where) ? where : [where]).some((part) =>
            matches(row, part),
          ),
        ).length,
      exist: async ({ where }: { where: Record<string, unknown> }) =>
        rows.some((row) => matches(row, where)),
      findOneBy: async (where: Record<string, unknown>) =>
        rows.find((row) => matches(row, where)) ?? null,
      findBy: async (
        where: Record<string, unknown> | Record<string, unknown>[],
      ) =>
        rows.filter((row) =>
          (Array.isArray(where) ? where : [where]).some((part) =>
            matches(row, part),
          ),
        ),
      create: (values: Record<string, unknown>) =>
        Object.assign(new (entity as new () => object)(), values, {
          id: "id" in values ? values.id : randomUUID(),
        }),
      save: async (row: Record<string, unknown>) => {
        const now = new Date("2026-08-28T00:00:00.000Z");
        if (
          !("id" in row) &&
          entity !== RolePermissionEntity &&
          entity !== UserRoleEntity
        )
          row.id = randomUUID();
        if (entity === RoleEntity || entity === UserEntity) {
          row.createdAt ??= now;
          row.updatedAt = now;
        }
        if (entity === PermissionEntity || entity === AuditLogEntity)
          row.createdAt ??= now;
        if (!rows.includes(row)) rows.push(row);
        return row;
      },
      upsert: async (values: Record<string, unknown>[], conflict: string[]) => {
        for (const value of values) {
          const row = rows.find((candidate) =>
            conflict.every(
              (key) =>
                (candidate as Record<string, unknown>)[key] === value[key],
            ),
          ) as Record<string, unknown> | undefined;
          if (row) Object.assign(row, value);
          else
            rows.push(
              Object.assign(new (entity as new () => object)(), value, {
                id: randomUUID(),
                createdAt: new Date("2026-08-28T00:00:00.000Z"),
              }),
            );
        }
      },
      insert: async (values: Record<string, unknown>[]) => {
        rows.push(...values);
      },
      delete: async (where: Record<string, unknown>) => {
        for (let index = rows.length - 1; index >= 0; index -= 1)
          if (matches(rows[index]!, where)) rows.splice(index, 1);
      },
    };
  };
  const manager = {
    query: async () => [],
    getRepository: repositoryFor,
    createQueryBuilder: () => {
      let entity: Function;
      let values: Record<string, unknown> | Record<string, unknown>[];
      const builder = {
        insert: () => builder,
        into: (next: Function) => {
          entity = next;
          return builder;
        },
        values: (next: Record<string, unknown> | Record<string, unknown>[]) => {
          values = next;
          return builder;
        },
        orIgnore: () => builder,
        execute: async () => {
          const rows = rowsFor(entity!);
          for (const value of Array.isArray(values!) ? values! : [values!]) {
            if (!rows.some((row) => matches(row, value)))
              rows.push({ ...value });
          }
        },
      };
      return builder;
    },
  };
  return {
    state,
    dataSource: {
      transaction: async (
        work: (entityManager: typeof manager) => Promise<void>,
      ) => work(manager),
    } as unknown as DataSource,
  };
}

describe("initial access seed", () => {
  it("is idempotent and repairs exact catalog, system role, and grant drift with an audit event", async () => {
    const { dataSource, state } = createSeedHarness();
    await seedInitialAccess(dataSource, "۰۹۱۲۱۲۳۴۵۶۷");
    await seedInitialAccess(dataSource, "09121234567");
    expect(state.audits).toHaveLength(1);
    expect(state.users).toHaveLength(1);
    expect(state.users[0]?.phone).toBe("+989121234567");

    const role = state.roles[0]!;
    const removedGrant = state.rolePermissions.shift()!;
    const unexpectedPermission = Object.assign(new PermissionEntity(), {
      id: randomUUID(),
      key: "reports:export",
      resource: "reports",
      action: "export",
      createdAt: new Date(),
    });
    state.permissions.push(unexpectedPermission);
    state.rolePermissions.push({
      roleId: role.id,
      permissionId: unexpectedPermission.id,
    } as RolePermissionEntity);
    role.name = "نام خراب";
    const corruptedPermission = state.permissions.find(
      ({ id }) => id === removedGrant.permissionId,
    )!;
    corruptedPermission.resource = "wrong";
    corruptedPermission.action = "wrong";

    await seedInitialAccess(dataSource, "09121234567");

    expect(role.name).toBe("مدیر ارشد");
    expect(corruptedPermission).toMatchObject({
      resource: corruptedPermission.key.split(":")[0],
      action: corruptedPermission.key.split(":")[1],
    });
    expect(state.rolePermissions).toHaveLength(7);
    expect(
      state.rolePermissions.some(
        ({ permissionId }) => permissionId === unexpectedPermission.id,
      ),
    ).toBe(false);
    expect(state.audits).toHaveLength(2);
    expect(state.audits.map(({ action }) => action)).toEqual([
      "seed.access_control_initialized",
      "seed.access_control_repaired",
    ]);
    expect(
      JSON.stringify(state.audits.map(({ metadata }) => metadata)),
    ).not.toContain("+989121234567");

    await seedInitialAccess(dataSource, "09121234567");
    expect(state.rolePermissions).toHaveLength(7);
    expect(state.audits).toHaveLength(2);
  });
});
