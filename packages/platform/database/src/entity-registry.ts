import type { EntitySchema } from "typeorm";
import {
  RateLimitBucketEntity,
  RefreshTokenEntity,
  SessionEntity,
} from "@effect/auth/entities";
import {
  PermissionEntity,
  RoleEntity,
  RolePermissionEntity,
  UserPermissionOverrideEntity,
  UserRoleEntity,
} from "@effect/access-control/entities";
import { AuditLogEntity } from "@effect/audit/entities";
import { UserEntity } from "@effect/users/entities";

export const entityRegistry: Array<(new () => object) | EntitySchema> = [
  RateLimitBucketEntity,
  SessionEntity,
  RefreshTokenEntity,
  UserEntity,
  AuditLogEntity,
  RoleEntity,
  PermissionEntity,
  UserRoleEntity,
  RolePermissionEntity,
  UserPermissionOverrideEntity,
];
