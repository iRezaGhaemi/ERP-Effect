export { AccessControlController } from "./access-control.controller.js";
export { AccessControlModule } from "./access-control.module.js";
export {
  AccessControlService,
  PostgresAccessControlRepository,
} from "./access-control.service.js";
export type { AccessControlRepository } from "./access-control.service.js";
export { PermissionGuard } from "./permission.guard.js";
export {
  PERMISSION_METADATA_KEY,
  RequirePermission,
  RequirePermissions,
} from "./require-permission.decorator.js";
