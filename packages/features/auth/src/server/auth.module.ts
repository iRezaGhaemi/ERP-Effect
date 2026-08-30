import { AuditModule } from "@effect/audit/server";
import { AccessControlModule } from "@effect/access-control/server";
import { parseEnv } from "@effect-erp/config";
import { UsersModule } from "@effect/users/server";
import { Logger, Module } from "@nestjs/common";

import { AUTH_OPTIONS } from "./auth.options.js";
import { AuthenticationGuard } from "./authentication.guard.js";
import { AuthController } from "./auth.controller.js";
import { OTP_CODE_SEALER, OtpCodeSealer } from "./otp-code-sealer.js";
import {
  OTP_DELIVERY_WORKER_OPTIONS,
  OtpDeliveryWorker,
} from "./otp-delivery.worker.js";
import { OtpService } from "./otp.service.js";
import {
  OTP_RESPONSE_ENVELOPE,
  ShortOtpResponseEnvelope,
} from "./otp-response-envelope.js";
import { RateLimitService } from "./rate-limit.service.js";
import { SessionService } from "./session.service.js";
import { ConsoleSmsProvider } from "./sms/console-sms.provider.js";
import { FakeSmsProvider } from "./sms/fake-sms.provider.js";
import {
  HTTP_SMS_PROVIDER_TIMEOUT_MILLISECONDS,
  HttpSmsProvider,
} from "./sms/http-sms.provider.js";
import { SMS_PROVIDER } from "./sms/sms-provider.js";
import { TokenService } from "./token.service.js";

function loadEnv() {
  const testDefaults =
    process.env.NODE_ENV === "test"
      ? {
          DATABASE_URL: "postgres://test:test@localhost:5432/test",
          WEB_ORIGIN: "http://localhost:3000",
          INTERNAL_API_URL: "http://localhost:3001",
          OTP_PEPPER: "test-otp-pepper-at-least-32-characters",
          JWT_ACCESS_SECRET: "test-jwt-secret-at-least-32-characters",
          SMS_PROVIDER: "fake",
          INITIAL_ADMIN_PHONE: "09121234567",
        }
      : {};
  return parseEnv({ ...testDefaults, ...process.env });
}

@Module({
  imports: [AuditModule, UsersModule, AccessControlModule],
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_OPTIONS,
      useFactory: () => {
        const env = loadEnv();
        return {
          pepper: env.OTP_PEPPER,
          ttlSeconds: env.OTP_TTL_SECONDS,
          resendSeconds: env.OTP_RESEND_SECONDS,
          jwtAccessSecret: env.JWT_ACCESS_SECRET,
          accessTtlSeconds: 900,
          refreshTtlDays: env.REFRESH_TTL_DAYS,
          cookieSecure: env.COOKIE_SECURE,
        };
      },
    },
    {
      provide: SMS_PROVIDER,
      useFactory: () => {
        const env = loadEnv();
        if (env.SMS_PROVIDER === "fake") return new FakeSmsProvider();
        if (env.SMS_PROVIDER === "http") {
          return new HttpSmsProvider(env.SMS_HTTP_URL!, env.SMS_HTTP_TOKEN!);
        }
        return new ConsoleSmsProvider(
          env.NODE_ENV,
          new Logger("ConsoleSmsProvider"),
          (line) => process.stdout.write(`${line}\n`),
        );
      },
    },
    {
      provide: OTP_CODE_SEALER,
      inject: [AUTH_OPTIONS],
      useFactory: (options: { pepper: string }) =>
        new OtpCodeSealer(options.pepper),
    },
    {
      provide: OTP_DELIVERY_WORKER_OPTIONS,
      useFactory: () => {
        const env = loadEnv();
        return {
          enabled: env.NODE_ENV !== "test",
          pollMilliseconds: 250,
          leaseSeconds: 30,
          providerTimeoutSeconds:
            HTTP_SMS_PROVIDER_TIMEOUT_MILLISECONDS / 1_000,
          activationMarginSeconds: env.OTP_DELIVERY_ACTIVATION_MARGIN_SECONDS,
          maxAttempts: 3,
          terminalRetentionSeconds: 86_400,
          cleanupBatchSize: 500,
          cleanupIntervalMilliseconds: 60_000,
        };
      },
    },
    {
      provide: OTP_RESPONSE_ENVELOPE,
      useFactory: () => new ShortOtpResponseEnvelope(),
    },
    RateLimitService,
    TokenService,
    SessionService,
    OtpService,
    OtpDeliveryWorker,
    AuthenticationGuard,
  ],
  exports: [
    AUTH_OPTIONS,
    SMS_PROVIDER,
    OTP_RESPONSE_ENVELOPE,
    OTP_CODE_SEALER,
    OTP_DELIVERY_WORKER_OPTIONS,
    RateLimitService,
    TokenService,
    SessionService,
    OtpService,
    OtpDeliveryWorker,
    AuthenticationGuard,
  ],
})
export class AuthModule {}
