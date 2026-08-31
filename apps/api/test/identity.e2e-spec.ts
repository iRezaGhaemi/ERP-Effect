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

type OpenApiParameter = {
  in?: string;
  name?: string;
  required?: boolean;
  schema?: Record<string, unknown>;
};

type OpenApiOperation = {
  parameters?: OpenApiParameter[];
  responses?: Record<string, unknown>;
  security?: Array<Record<string, string[]>>;
  tags?: string[];
};

type OpenApiDocument = {
  components: {
    schemas?: Record<
      string,
      {
        properties?: Record<string, { required?: string[] }>;
        required?: string[];
      }
    >;
    securitySchemes?: Record<string, unknown>;
  };
  paths: Record<string, Record<string, OpenApiOperation>>;
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

async function openApiDocument(): Promise<OpenApiDocument> {
  const openApiModule = "../src/openapi.js";
  const { buildOpenApiDocument } = await import(openApiModule);
  return buildOpenApiDocument() as OpenApiDocument;
}

function parameter(
  operation: OpenApiOperation,
  name: string,
): OpenApiParameter | undefined {
  return operation.parameters?.find((candidate) => candidate.name === name);
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
    const document = await openApiDocument();

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
        expect(responses).toHaveProperty("502");
        expect(responses).toHaveProperty("503");
      }
    }
  });

  it("documents cookie authentication plus Origin and CSRF semantics", async () => {
    const document = await openApiDocument();
    const usersCreate = document.paths["/api/v1/users"]?.post;
    const otpRequest = document.paths["/api/v1/auth/otp/request"]?.post;
    const refresh = document.paths["/api/v1/auth/refresh"]?.post;
    const live = document.paths["/api/v1/health/live"]?.get;

    expect(document.components.securitySchemes).toMatchObject({
      AccessCookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "effect_access",
      },
      RefreshCookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "effect_refresh",
      },
    });
    expect(usersCreate?.security).toEqual([{ AccessCookieAuth: [] }]);
    expect(otpRequest?.security).toEqual([]);
    expect(refresh?.security).toEqual([{ RefreshCookieAuth: [] }]);
    expect(live?.security).toEqual([]);
    expect(parameter(usersCreate as OpenApiOperation, "Origin")).toMatchObject({
      in: "header",
      required: true,
    });
    expect(
      parameter(usersCreate as OpenApiOperation, "x-csrf-token"),
    ).toMatchObject({
      in: "header",
      required: true,
      schema: {
        pattern: "^[A-Za-z0-9_-]{43}$",
      },
    });
    expect(parameter(otpRequest as OpenApiOperation, "Origin")).toMatchObject({
      in: "header",
      required: true,
    });
    expect(parameter(otpRequest as OpenApiOperation, "x-csrf-token")).toBe(
      undefined,
    );
    expect(parameter(refresh as OpenApiOperation, "Origin")).toMatchObject({
      in: "header",
      required: true,
    });
    expect(parameter(refresh as OpenApiOperation, "x-csrf-token")).toBe(
      undefined,
    );
  });

  it("documents defaulted pagination fields as optional request inputs", async () => {
    const document = await openApiDocument();
    const usersList = document.paths["/api/v1/users"]?.get as OpenApiOperation;

    expect(parameter(usersList, "page")).toMatchObject({
      in: "query",
      required: false,
      schema: { default: 1 },
    });
    expect(parameter(usersList, "pageSize")).toMatchObject({
      in: "query",
      required: false,
      schema: { default: 20 },
    });
  });

  it("keeps response components in output mode while request defaults stay optional", async () => {
    const document = await openApiDocument();
    const errorFields =
      document.components.schemas?.ErrorEnvelope?.properties?.error?.required;
    const createRoleRequired =
      document.components.schemas?.CreateRole?.required;

    expect(errorFields).toContain("fields");
    expect(createRoleRequired).not.toContain("permissionIds");
  });
});
