import { readdir } from "node:fs/promises";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { OTP_DELIVERY_WORKER_OPTIONS } from "@effect/auth/server";
import request from "supertest";
import { expect, it, vi } from "vitest";
import { AppModule } from "../dist/app.module.js";

it.each(["development", "production"])(
  "compiled %s API excludes SMS inspection and returns 404",
  async (mode) => {
    const files = await readdir("dist", { recursive: true });
    expect(
      files.some((file) => /test-support|fake-sms|main\.test/.test(file)),
    ).toBe(false);
    const env = {
      NODE_ENV: mode,
      DATABASE_URL: "postgres://unused:unused@localhost/unused",
      WEB_ORIGIN: "https://erp.example.test",
      INTERNAL_API_URL: "http://localhost:3001",
      OTP_PEPPER: "release-boundary-test-pepper-at-least-32-characters",
      JWT_ACCESS_SECRET: "release-boundary-test-jwt-at-least-32-characters",
      SMS_PROVIDER: "http",
      SMS_HTTP_URL: "https://sms.example.test",
      SMS_HTTP_TOKEN: "isolated-boundary-fixture",
      INITIAL_ADMIN_PHONE: "09121234567",
      OTP_DELIVERY_ACTIVATION_MARGIN_SECONDS: "5",
    };
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    let app;
    try {
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(OTP_DELIVERY_WORKER_OPTIONS)
        .useValue({ enabled: false })
        .overrideProvider(DataSource)
        .useValue({ isInitialized: false })
        .compile();
      app = module.createNestApplication();
      app.setGlobalPrefix("api/v1");
      await app.init();
      await request(app.getHttpServer())
        .get("/api/v1/test/sms/latest")
        .query({ phone: "+989121234567" })
        .expect(404);
    } finally {
      await app?.close();
      vi.unstubAllEnvs();
    }
  },
);
