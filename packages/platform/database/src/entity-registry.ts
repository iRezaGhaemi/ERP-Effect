import type { EntitySchema } from "typeorm";
import {
  PermissionEntity,
  RoleEntity,
  RolePermissionEntity,
  UserPermissionOverrideEntity,
  UserRoleEntity,
} from "@effect/access-control/entities";
import { AuditLogEntity } from "@effect/audit/entities";
import { UserEntity } from "@effect/users/entities";

export const entityRegistry: Array<Function | EntitySchema> = [
  UserEntity,
  AuditLogEntity,
  RoleEntity,
  PermissionEntity,
  UserRoleEntity,
  RolePermissionEntity,
  UserPermissionOverrideEntity,
];
