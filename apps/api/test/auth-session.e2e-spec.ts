import {
  AuthSessionResponseSchema,
  MeResponseSchema,
} from "@effect/auth/contracts";
import {
  AUTH_OPTIONS,
  OTP_RESPONSE_ENVELOPE,
  OtpDeliveryWorker,
  SMS_PROVIDER,
  ShortOtpResponseEnvelope,
} from "@effect/auth/server";
import { FakeSmsProvider } from "@effect/auth/server";
import { entityRegistry } from "@effect-erp/database";
import { startPostgresContainer } from "@effect-erp/testing";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";
import { afterEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { CreateUsers202608280001 } from "../../../packages/platform/database/src/migrations/202608280001-create-users.js";
import { CreateAuditLogs202608280002 } from "../../../packages/platform/database/src/migrations/202608280002-create-audit-logs.js";
import { ReconcileAuditLogsActorNull202608280003 } from "../../../packages/platform/database/src/migrations/202608280003-reconcile-audit-logs-actor-null.js";
import { HardenAuditLogBoundary202608280004 } from "../../../packages/platform/database/src/migrations/202608280004-harden-audit-log-boundary.js";
import { CreateAccessControl202608280005 } from "../../../packages/platform/database/src/migrations/202608280005-create-access-control.js";
import { CreateOtp202608280006 } from "../../../packages/platform/database/src/migrations/202608280006-create-otp.js";
import { CreateOtpDeliveryOutbox202608280007 } from "../../../packages/platform/database/src/migrations/202608280007-create-otp-delivery-outbox.js";
import { HardenOtpDeliveryOutbox202608280008 } from "../../../packages/platform/database/src/migrations/202608280008-harden-otp-delivery-outbox.js";
import { CreateSessions202608280009 } from "../../../packages/platform/database/src/migrations/202608280009-create-sessions.js";

const sources: DataSource[] = [];
let app: INestApplication | undefined;

afterEach(async () => {
  if (app) await app.close();
  app = undefined;
  await Promise.all(sources.splice(0).map((source) => source.destroy()));
});

function cookieHeader(setCookies: string[] | string | undefined): string {
  const cookies = Array.isArray(setCookies)
    ? setCookies
    : setCookies
      ? [setCookies]
      : [];
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

describe("auth session API", () => {
  it("verifies OTP into HttpOnly cookies and rejects a logged-out session", async () => {
    const container = await startPostgresContainer();
    try {
      const source = new DataSource({
        type: "postgres",
        host: container.getHost(),
        port: container.getMappedPort(5432),
        username: "effect",
        password: "effect",
        database: "effect_erp",
        entities: entityRegistry,
        migrations: [
          CreateUsers202608280001,
          CreateAuditLogs202608280002,
          ReconcileAuditLogsActorNull202608280003,
          HardenAuditLogBoundary202608280004,
          CreateAccessControl202608280005,
          CreateOtp202608280006,
          CreateOtpDeliveryOutbox202608280007,
          HardenOtpDeliveryOutbox202608280008,
          CreateSessions202608280009,
        ],
        synchronize: false,
      });
      sources.push(source);
      await source.initialize();
      await source.runMigrations();
      await source.query(
        `INSERT INTO users (phone, "firstName", "lastName", status)
         VALUES ($1, 'A', 'A', 'ACTIVE')`,
        ["+989121234567"],
      );
      const sms = new FakeSmsProvider();
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(DataSource)
        .useValue(source)
        .overrideProvider(SMS_PROVIDER)
        .useValue(sms)
        .overrideProvider(OTP_RESPONSE_ENVELOPE)
        .useValue(new ShortOtpResponseEnvelope(0))
        .overrideProvider(AUTH_OPTIONS)
        .useValue({
          pepper: "e2e-session-otp-pepper-at-least-32-characters",
          ttlSeconds: 120,
          resendSeconds: 60,
          jwtAccessSecret: "e2e-session-jwt-secret-at-least-32-characters",
          accessTtlSeconds: 900,
          refreshTtlDays: 30,
          cookieSecure: false,
        })
        .compile();
      app = module.createNestApplication();
      app.setGlobalPrefix("api/v1");
      await app.init();

      const requested = await request(app.getHttpServer())
        .post("/api/v1/auth/otp/request")
        .set("x-request-id", "req_e2e_session_request")
        .send({ phone: "09121234567" })
        .expect(202);
      await module.get(OtpDeliveryWorker).runOnce();
      const code = sms.sent[0]?.message.match(/\d{6}/)?.[0];
      expect(code).toEqual(expect.any(String));

      const verified = await request(app.getHttpServer())
        .post("/api/v1/auth/otp/verify")
        .set("x-request-id", "req_e2e_session_verify")
        .send({ challengeId: requested.body.challengeId, code })
        .expect(200);

      expect(() =>
        AuthSessionResponseSchema.parse(verified.body),
      ).not.toThrow();
      expect(JSON.stringify(verified.body)).not.toContain("effect_access");
      expect(JSON.stringify(verified.body)).not.toContain("effect_refresh");
      const cookies = verified.headers["set-cookie"];
      expect(cookies).toEqual(
        expect.arrayContaining([
          expect.stringContaining("effect_access="),
          expect.stringContaining("effect_refresh="),
          expect.stringContaining("effect_csrf="),
        ]),
      );
      expect(cookies.join("\n")).toContain("HttpOnly");
      const authCookies = cookieHeader(cookies);

      const me = await request(app.getHttpServer())
        .get("/api/v1/me")
        .set("Cookie", authCookies)
        .expect(200);
      expect(() => MeResponseSchema.parse(me.body)).not.toThrow();

      const logout = await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Cookie", authCookies)
        .expect(200);
      expect(cookieHeader(logout.headers["set-cookie"])).toContain(
        "effect_access=",
      );

      await request(app.getHttpServer())
        .get("/api/v1/me")
        .set("Cookie", authCookies)
        .expect(401);
    } finally {
      await Promise.all(sources.splice(0).map((source) => source.destroy()));
      await container.stop();
    }
  });
});
