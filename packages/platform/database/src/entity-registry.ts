import type { EntitySchema } from "typeorm";
import {
  OtpChallengeEntity,
  OtpDeliveryJobEntity,
  RateLimitBucketEntity,
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

export const entityRegistry: Array<Function | EntitySchema> = [
  OtpChallengeEntity,
  OtpDeliveryJobEntity,
  RateLimitBucketEntity,
  UserEntity,
  AuditLogEntity,
  RoleEntity,
  PermissionEntity,
  UserRoleEntity,
  RolePermissionEntity,
  UserPermissionOverrideEntity,
];
