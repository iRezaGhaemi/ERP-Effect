import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import {
  AccessControlModule,
  PermissionGuard,
} from "@effect/access-control/server";
import { AuditModule } from "@effect/audit/server";
import { parseEnv } from "@effect-erp/config";
import { createDataSource, DatabaseModule } from "@effect-erp/database";
import { UsersModule } from "@effect/users/server";

import { HealthController } from "./health/health.controller.js";
import { HealthService } from "./health/health.service.js";

@Module({
  imports: [
    DatabaseModule.forRoot({
      createDataSource: () =>
        createDataSource({ url: parseEnv(process.env).DATABASE_URL }),
    }),
    AuditModule,
    UsersModule,
    AccessControlModule,
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    { provide: APP_GUARD, useExisting: PermissionGuard },
  ],
})
export class AppModule {}
