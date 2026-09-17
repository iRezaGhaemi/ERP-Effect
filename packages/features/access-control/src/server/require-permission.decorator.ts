import { SetMetadata } from "@nestjs/common";

import type { PermissionKey } from "../contracts/index.js";

export const PERMISSION_METADATA_KEY = "effect:required-permission";

export const RequirePermission = (
  key: PermissionKey,
): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSION_METADATA_KEY, [key]);

export const RequirePermissions = (
  ...keys: PermissionKey[]
): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSION_METADATA_KEY, keys);
