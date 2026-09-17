import { readdir } from "node:fs/promises";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
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
      AUTH_RATE_LIMIT_SECRET:
        "release-boundary-rate-limit-secret-at-least-32-characters",
      JWT_ACCESS_SECRET: "release-boundary-test-jwt-at-least-32-characters",
    };
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    let app;
    try {
      const module = await Test.createTestingModule({ imports: [AppModule] })
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
