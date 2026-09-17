import { AccessControlModule } from "@effect/access-control/server";
import { AuditModule } from "@effect/audit/server";
import { parseEnv } from "@effect-erp/config";
import { UsersModule } from "@effect/users/server";
import { Module } from "@nestjs/common";

import { AUTH_OPTIONS } from "./auth.options.js";
import { AUTH_CONCURRENCY_HOOKS } from "./auth-concurrency-hooks.js";
import { AuthenticationGuard } from "./authentication.guard.js";
import { AuthController } from "./auth.controller.js";
import { CredentialAdminController } from "./credential-admin.controller.js";
import { PasswordAuthService } from "./password-auth.service.js";
import { RateLimitService } from "./rate-limit.service.js";
import { SessionService } from "./session.service.js";
import { TokenService } from "./token.service.js";

function loadEnv() {
  const testDefaults =
    process.env.NODE_ENV === "test"
      ? {
          DATABASE_URL: "postgres://test:test@localhost:5432/test",
          WEB_ORIGIN: "http://localhost:3000",
          INTERNAL_API_URL: "http://localhost:3001",
          AUTH_RATE_LIMIT_SECRET:
            "test-auth-rate-limit-secret-at-least-32-characters",
          JWT_ACCESS_SECRET: "test-jwt-secret-at-least-32-characters",
        }
      : {};
  return parseEnv({ ...testDefaults, ...process.env });
}

@Module({
  imports: [AuditModule, UsersModule, AccessControlModule],
  controllers: [AuthController, CredentialAdminController],
  providers: [
    {
      provide: AUTH_OPTIONS,
      useFactory: () => {
        const env = loadEnv();
        return {
          rateLimitSecret: env.AUTH_RATE_LIMIT_SECRET,
          jwtAccessSecret: env.JWT_ACCESS_SECRET,
          accessTtlSeconds: 900,
          refreshTtlDays: env.REFRESH_TTL_DAYS,
          cookieSecure: env.COOKIE_SECURE,
        };
      },
    },
    { provide: AUTH_CONCURRENCY_HOOKS, useValue: {} },
    RateLimitService,
    TokenService,
    SessionService,
    PasswordAuthService,
    AuthenticationGuard,
  ],
  exports: [
    AUTH_OPTIONS,
    RateLimitService,
    TokenService,
    SessionService,
    PasswordAuthService,
    AuthenticationGuard,
  ],
})
export class AuthModule {}
