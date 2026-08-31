import {
  Module,
  type MiddlewareConsumer,
  type NestModule,
  RequestMethod,
} from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import {
  AccessControlModule,
  PermissionGuard,
} from "@effect/access-control/server";
import { AuditModule } from "@effect/audit/server";
import { AuthenticationGuard, AuthModule } from "@effect/auth/server";
import { parseEnv } from "@effect-erp/config";
import { createDataSource, DatabaseModule } from "@effect-erp/database";
import { UsersModule } from "@effect/users/server";

import { HealthController } from "./health/health.controller.js";
import { HealthService } from "./health/health.service.js";
import { CsrfGuard } from "./common/csrf.guard.js";
import { DomainExceptionFilter } from "./common/domain-exception.filter.js";
import { OriginGuard, WEB_ORIGIN } from "./common/origin.guard.js";
import { RequestIdMiddleware } from "./common/request-id.middleware.js";

@Module({
  imports: [
    DatabaseModule.forRoot({
      createDataSource: () =>
        createDataSource({ url: parseEnv(process.env).DATABASE_URL }),
    }),
    AuditModule,
    UsersModule,
    AccessControlModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    {
      provide: WEB_ORIGIN,
      useFactory: () =>
        process.env.NODE_ENV === "test"
          ? (process.env.WEB_ORIGIN ?? "http://localhost:3000")
          : parseEnv(process.env).WEB_ORIGIN,
    },
    DomainExceptionFilter,
    OriginGuard,
    CsrfGuard,
    { provide: APP_FILTER, useExisting: DomainExceptionFilter },
    { provide: APP_GUARD, useExisting: AuthenticationGuard },
    { provide: APP_GUARD, useExisting: PermissionGuard },
    { provide: APP_GUARD, useExisting: OriginGuard },
    { provide: APP_GUARD, useExisting: CsrfGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes({ path: "*path", method: RequestMethod.ALL });
  }
}
