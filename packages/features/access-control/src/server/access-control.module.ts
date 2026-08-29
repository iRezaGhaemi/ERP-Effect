import { AuditModule } from "@effect/audit/server";
import { Module } from "@nestjs/common";

import { AccessControlController } from "./access-control.controller.js";
import {
  AccessControlService,
  PostgresAccessControlRepository,
} from "./access-control.service.js";
import { PermissionGuard } from "./permission.guard.js";

@Module({
  imports: [AuditModule],
  controllers: [AccessControlController],
  providers: [
    PostgresAccessControlRepository,
    AccessControlService,
    PermissionGuard,
  ],
  exports: [AccessControlService, PermissionGuard],
})
export class AccessControlModule {}
