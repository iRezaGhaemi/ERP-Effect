import { RequestOtpResponseSchema } from "@effect/auth/contracts";
import {
  AUTH_OPTIONS,
  OTP_RESPONSE_ENVELOPE,
  OtpDeliveryWorker,
  SMS_PROVIDER,
  ShortOtpResponseEnvelope,
} from "@effect/auth/server";
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

const sources: DataSource[] = [];
let app: INestApplication | undefined;

afterEach(async () => {
  if (app) await app.close();
  app = undefined;
  await Promise.all(sources.splice(0).map((source) => source.destroy()));
});

describe("OTP request API", () => {
  it("returns shape-identical 202 responses for active, missing, and suspended phones", async () => {
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
        ],
        synchronize: false,
      });
      sources.push(source);
      await source.initialize();
      await source.runMigrations();
      await source.query(
        `INSERT INTO users (phone, "firstName", "lastName", status) VALUES ($1, 'A', 'A', 'ACTIVE'), ($2, 'S', 'S', 'SUSPENDED')`,
        ["+989121234567", "+989121234568"],
      );
      const sent: unknown[] = [];
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(DataSource)
        .useValue(source)
        .overrideProvider(SMS_PROVIDER)
        .useValue({ send: async (input: unknown) => sent.push(input) })
        .overrideProvider(OTP_RESPONSE_ENVELOPE)
        .useValue(new ShortOtpResponseEnvelope(0))
        .overrideProvider(AUTH_OPTIONS)
        .useValue({
          pepper: "e2e-test-otp-pepper-at-least-32-characters",
          ttlSeconds: 120,
          resendSeconds: 60,
        })
        .compile();
      app = module.createNestApplication();
      app.setGlobalPrefix("api/v1");
      await app.init();

      const responses = await Promise.all(
        ["09121234567", "09121234568", "09121234569"].map((phone, index) =>
          request(app!.getHttpServer())
            .post("/api/v1/auth/otp/request")
            .set("x-request-id", `req_e2e_${index}`)
            .send({ phone })
            .expect(202),
        ),
      );
      for (const response of responses) {
        expect(() =>
          RequestOtpResponseSchema.parse(response.body),
        ).not.toThrow();
        expect(Object.keys(response.body).sort()).toEqual([
          "accepted",
          "challengeId",
          "retryAfterSeconds",
        ]);
      }
      expect(sent).toHaveLength(0);
      const challengeRows = await source.query<
        Array<{ id: string; phone: string; isDecoy: boolean }>
      >(`SELECT id, phone, is_decoy AS "isDecoy" FROM otp_challenges`);
      expect(challengeRows).toHaveLength(3);
      expect(challengeRows.filter((row) => row.isDecoy)).toHaveLength(2);
      expect(JSON.stringify(challengeRows)).not.toContain("+989121234568");
      expect(JSON.stringify(challengeRows)).not.toContain("+989121234569");
      expect(challengeRows.map((row) => row.id)).not.toContain(
        responses[1]?.body.challengeId,
      );
      expect(challengeRows.map((row) => row.id)).not.toContain(
        responses[2]?.body.challengeId,
      );
      const jobs = await source.query<Array<{ status: string }>>(
        `SELECT status FROM otp_delivery_jobs ORDER BY status`,
      );
      expect(jobs).toEqual([
        { status: "DISCARDED" },
        { status: "DISCARDED" },
        { status: "PENDING" },
      ]);

      await module.get(OtpDeliveryWorker).runOnce();
      expect(sent).toHaveLength(1);
    } finally {
      await Promise.all(sources.splice(0).map((source) => source.destroy()));
      await container.stop();
    }
  });
});
