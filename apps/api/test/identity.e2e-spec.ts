import {
  type AuthenticatedPrincipal,
  ErrorEnvelopeSchema,
} from "@effect-erp/contracts";
import { PermissionGuard } from "@effect/access-control/server";
import { AuthenticationGuard } from "@effect/auth/server";
import { UsersService } from "@effect/users/server";
import {
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  UnauthorizedException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";
import { afterEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";

type RequestWithPrincipal = {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedPrincipal;
};

const webOrigin = "http://localhost:3000";
const authCookies =
  "effect_access=identity-test-access; effect_csrf=identity-test-csrf";
const validUser = {
  phone: "09123334444",
  firstName: "کاربر",
  lastName: "آزمایشی",
};
const authorizedPrincipal: AuthenticatedPrincipal = {
  userId: "00000000-0000-4000-8000-000000000001",
  sessionId: "00000000-0000-4000-8000-000000000002",
  phone: "+989121234567",
  permissions: [
    "users:read",
    "users:create",
    "users:update",
    "users:suspend",
    "roles:manage",
    "sessions:revoke",
    "audit:read",
  ],
};

class TestingAuthenticationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requestObject = context
      .switchToHttp()
      .getRequest<RequestWithPrincipal>();
    const cookies = String(requestObject.headers.cookie ?? "");
    if (!cookies.includes("effect_access=identity-test-access"))
      throw new UnauthorizedException();
    requestObject.user = authorizedPrincipal;
    return true;
  }
}

class TestingPermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return Boolean(
      context.switchToHttp().getRequest<RequestWithPrincipal>().user,
    );
  }
}

let app: INestApplication | undefined;

afterEach(async () => {
  if (app) await app.close();
  app = undefined;
});

async function createApp(): Promise<INestApplication> {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DataSource)
    .useValue({})
    .overrideProvider(AuthenticationGuard)
    .useClass(TestingAuthenticationGuard)
    .overrideProvider(PermissionGuard)
    .useClass(TestingPermissionGuard)
    .overrideProvider(UsersService)
    .useValue({
      create: async () => ({
        id: "00000000-0000-4000-8000-000000000003",
        ...validUser,
        phone: "+989123334444",
        status: "ACTIVE",
        lastLoginAt: null,
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
      }),
    } as Partial<UsersService>)
    .compile();
  app = module.createNestApplication();
  app.setGlobalPrefix("api/v1");
  await app.init();
  return app;
}

describe("identity API security boundary", () => {
  it("rejects an authenticated mutation without matching CSRF values", async () => {
    const server = (await createApp()).getHttpServer();

    await request(server)
      .post("/api/v1/users")
      .set("Cookie", authCookies)
      .set("Origin", webOrigin)
      .send(validUser)
      .expect(403)
      .expect(({ body }) => expect(body.error.code).toBe("CSRF_INVALID"));
  });

  it("rejects a mutation from an origin other than WEB_ORIGIN", async () => {
    const server = (await createApp()).getHttpServer();

    await request(server)
      .post("/api/v1/users")
      .set("Cookie", authCookies)
      .set("Origin", "https://untrusted.example")
      .set("x-csrf-token", "identity-test-csrf")
      .send(validUser)
      .expect(403)
      .expect(({ body }) => expect(body.error.code).toBe("ORIGIN_INVALID"));
  });

  it("returns the same request ID in header and error body", async () => {
    const server = (await createApp()).getHttpServer();

    const response = await request(server)
      .get("/api/v1/users/not-a-uuid")
      .set("Cookie", authCookies)
      .expect(422);
    expect(response.body.error.requestId).toBe(
      response.headers["x-request-id"],
    );
    expect(() => ErrorEnvelopeSchema.parse(response.body)).not.toThrow();
  });

  it("keeps an anonymous protected request at 401", async () => {
    const server = (await createApp()).getHttpServer();

    await request(server).get("/api/v1/users/not-a-uuid").expect(401);
  });

  it("documents only versioned API paths with success and ErrorEnvelope responses", async () => {
    const openApiModule = "../src/openapi.js";
    const { buildOpenApiDocument } = await import(openApiModule);
    const document = buildOpenApiDocument() as {
      paths: Record<
        string,
        Record<
          string,
          {
            tags?: string[];
            responses?: Record<string, unknown>;
          }
        >
      >;
    };

    for (const [path, pathItem] of Object.entries(document.paths)) {
      expect(path.startsWith("/api/v1")).toBe(true);
      for (const operation of Object.values(pathItem)) {
        if (operation.tags?.includes("health")) continue;
        const responses = operation.responses ?? {};
        expect(
          Object.keys(responses).some((status) => /^2\d\d$/.test(status)),
        ).toBe(true);
        expect(JSON.stringify(responses)).toContain(
          "#/components/schemas/ErrorEnvelope",
        );
      }
    }
  });
});
