import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AccessPageQuerySchema,
  CreateRoleSchema,
  PermissionDtoSchema,
  PermissionPageSchema,
  ReplacePermissionOverridesSchema,
  ReplaceUserRolesSchema,
  RoleDtoSchema,
  RolePageSchema,
  UpdateRoleSchema,
} from "@effect/access-control/contracts";
import {
  AuthSessionListQuerySchema,
  AuthSessionPageSchema,
  AuthSessionResponseSchema,
  CsrfTokenSchema,
  LoginSchema,
  MeResponseSchema,
} from "@effect/auth/contracts";
import { AuditLogPageSchema, AuditQuerySchema } from "@effect/audit/contracts";
import {
  ErrorEnvelopeSchema,
  HealthResponseSchema,
  OkResponseSchema,
  UuidIdParamsSchema,
} from "@effect-erp/contracts";
import {
  ChangePasswordSchema,
  CreatePasswordUserSchema,
  ResetPasswordSchema,
  SetupCredentialsSchema,
  UpdateUserSchema,
  UserDetailDtoSchema,
  UserDtoSchema,
  UserPageQuerySchema,
  UserPageSchema,
} from "@effect/users/contracts";
import { z } from "zod";

type JsonObject = Record<string, unknown>;
type SecurityMode = "access" | "public" | "refresh";

const componentSchemas: Record<string, z.ZodType> = {
  AccessPageQuery: AccessPageQuerySchema,
  AuditLogPage: AuditLogPageSchema,
  AuditQuery: AuditQuerySchema,
  AuthSessionListQuery: AuthSessionListQuerySchema,
  AuthSessionPage: AuthSessionPageSchema,
  AuthSessionResponse: AuthSessionResponseSchema,
  ChangePassword: ChangePasswordSchema,
  CreateRole: CreateRoleSchema,
  CreatePasswordUser: CreatePasswordUserSchema,
  ErrorEnvelope: ErrorEnvelopeSchema,
  HealthResponse: HealthResponseSchema,
  Login: LoginSchema,
  MeResponse: MeResponseSchema,
  OkResponse: OkResponseSchema,
  PermissionDto: PermissionDtoSchema,
  PermissionPage: PermissionPageSchema,
  ReplacePermissionOverrides: ReplacePermissionOverridesSchema,
  ReplaceUserRoles: ReplaceUserRolesSchema,
  ResetPassword: ResetPasswordSchema,
  RoleDto: RoleDtoSchema,
  RolePage: RolePageSchema,
  SetupCredentials: SetupCredentialsSchema,
  UpdateRole: UpdateRoleSchema,
  UpdateUser: UpdateUserSchema,
  UserDetailDto: UserDetailDtoSchema,
  UserDto: UserDtoSchema,
  UserPage: UserPageSchema,
  UserPageQuery: UserPageQuerySchema,
  UuidIdParams: UuidIdParamsSchema,
};

const inputComponentSchemas = new Set([
  "AccessPageQuery",
  "AuditQuery",
  "AuthSessionListQuery",
  "ChangePassword",
  "CreateRole",
  "CreatePasswordUser",
  "Login",
  "ReplacePermissionOverrides",
  "ReplaceUserRoles",
  "ResetPassword",
  "SetupCredentials",
  "UpdateRole",
  "UpdateUser",
  "UserPageQuery",
  "UuidIdParams",
]);

function jsonSchema(
  schema: z.ZodType,
  io: "input" | "output" = "output",
): JsonObject {
  const { $schema: _dialect, ...value } = z.toJSONSchema(schema, { io });
  return value;
}

function reference(name: string): JsonObject {
  return { $ref: `#/components/schemas/${name}` };
}

function response(description: string, schemaName?: string): JsonObject {
  return {
    description,
    ...(schemaName
      ? { content: { "application/json": { schema: reference(schemaName) } } }
      : {}),
  };
}

function errorResponses(): Record<string, JsonObject> {
  return {
    "401": response("Authentication required", "ErrorEnvelope"),
    "403": response("Forbidden", "ErrorEnvelope"),
    "404": response("Not found", "ErrorEnvelope"),
    "409": response("Conflict", "ErrorEnvelope"),
    "422": response("Validation failed", "ErrorEnvelope"),
    "429": response("Rate limited", "ErrorEnvelope"),
    "502": response("Upstream delivery failed", "ErrorEnvelope"),
    "503": response("Temporarily unavailable", "ErrorEnvelope"),
    "500": response("Unexpected error", "ErrorEnvelope"),
  };
}

function requestBody(schemaName: string): JsonObject {
  return {
    required: true,
    content: { "application/json": { schema: reference(schemaName) } },
  };
}

function queryParameters(schema: z.ZodType): JsonObject[] {
  const value = jsonSchema(schema, "input");
  const properties =
    value.properties && typeof value.properties === "object"
      ? (value.properties as Record<string, JsonObject>)
      : {};
  const required = new Set(
    Array.isArray(value.required)
      ? value.required.filter(
          (name): name is string => typeof name === "string",
        )
      : [],
  );
  return Object.entries(properties).map(([name, property]) => ({
    in: "query",
    name,
    required: required.has(name),
    schema: property,
  }));
}

function idParameter(): JsonObject {
  const properties = jsonSchema(UuidIdParamsSchema, "input")
    .properties as Record<string, JsonObject>;
  return {
    in: "path",
    name: "id",
    required: true,
    schema: properties.id,
  };
}

function originParameter(): JsonObject {
  return {
    in: "header",
    name: "Origin",
    required: true,
    description: "Must equal the configured WEB_ORIGIN.",
    schema: { type: "string", format: "uri" },
  };
}

function csrfParameter(): JsonObject {
  return {
    in: "header",
    name: "x-csrf-token",
    required: true,
    description:
      "Must match the effect_csrf cookie for authenticated mutations.",
    schema: jsonSchema(CsrfTokenSchema, "input"),
  };
}

function securityRequirements(mode: SecurityMode): JsonObject[] {
  if (mode === "public") return [];
  if (mode === "refresh") return [{ RefreshCookieAuth: [] }];
  return [{ AccessCookieAuth: [] }];
}

function operation(input: {
  operationId: string;
  tags: string[];
  security?: SecurityMode;
  mutation?: boolean;
  requestSchema?: string;
  parameters?: JsonObject[];
  successStatus: string;
  successSchema?: string;
}): JsonObject {
  const mutation = input.mutation ?? false;
  const security = input.security ?? "access";
  const parameters = [
    ...(input.parameters ?? []),
    ...(mutation
      ? [originParameter(), ...(security === "access" ? [csrfParameter()] : [])]
      : []),
  ];
  return {
    operationId: input.operationId,
    tags: input.tags,
    security: securityRequirements(security),
    ...(parameters.length ? { parameters } : {}),
    ...(input.requestSchema
      ? { requestBody: requestBody(input.requestSchema) }
      : {}),
    responses: {
      [input.successStatus]: response("Success", input.successSchema),
      ...errorResponses(),
    },
  };
}

function healthOperation(operationId: string): JsonObject {
  return {
    operationId,
    tags: ["health"],
    security: [],
    responses: {
      "200": response("Healthy", "HealthResponse"),
      "503": response("Unavailable", "HealthResponse"),
    },
  };
}

export function buildOpenApiDocument(): JsonObject {
  return {
    openapi: "3.1.0",
    info: { title: "Effect ERP API", version: "1.0.0" },
    tags: [
      { name: "auth" },
      { name: "users" },
      { name: "roles" },
      { name: "sessions" },
      { name: "audit" },
      { name: "health" },
    ],
    paths: {
      "/api/v1/health/live": {
        get: healthOperation("HealthController_liveness"),
      },
      "/api/v1/health/ready": {
        get: healthOperation("HealthController_readiness"),
      },
      "/api/v1/auth/login": {
        post: operation({
          operationId: "AuthController_login",
          tags: ["auth"],
          security: "public",
          mutation: true,
          requestSchema: "Login",
          successStatus: "200",
          successSchema: "AuthSessionResponse",
        }),
      },
      "/api/v1/auth/password/change": {
        post: operation({
          operationId: "AuthController_changePassword",
          tags: ["auth"],
          mutation: true,
          requestSchema: "ChangePassword",
          successStatus: "200",
          successSchema: "AuthSessionResponse",
        }),
      },
      "/api/v1/auth/refresh": {
        post: operation({
          operationId: "AuthController_refresh",
          tags: ["auth"],
          security: "refresh",
          mutation: true,
          successStatus: "200",
          successSchema: "AuthSessionResponse",
        }),
      },
      "/api/v1/auth/logout": {
        post: operation({
          operationId: "AuthController_logout",
          tags: ["auth"],
          mutation: true,
          successStatus: "200",
          successSchema: "OkResponse",
        }),
      },
      "/api/v1/auth/logout-all": {
        post: operation({
          operationId: "AuthController_logoutAll",
          tags: ["auth"],
          mutation: true,
          successStatus: "200",
          successSchema: "OkResponse",
        }),
      },
      "/api/v1/auth/sessions": {
        get: operation({
          operationId: "AuthController_listSessions",
          tags: ["sessions"],
          parameters: queryParameters(AuthSessionListQuerySchema),
          successStatus: "200",
          successSchema: "AuthSessionPage",
        }),
      },
      "/api/v1/auth/sessions/{id}": {
        delete: operation({
          operationId: "AuthController_revokeSession",
          tags: ["sessions"],
          mutation: true,
          parameters: [idParameter()],
          successStatus: "200",
          successSchema: "OkResponse",
        }),
      },
      "/api/v1/me": {
        get: operation({
          operationId: "AuthController_me",
          tags: ["auth"],
          successStatus: "200",
          successSchema: "MeResponse",
        }),
      },
      "/api/v1/users": {
        get: operation({
          operationId: "UsersController_list",
          tags: ["users"],
          parameters: queryParameters(UserPageQuerySchema),
          successStatus: "200",
          successSchema: "UserPage",
        }),
        post: operation({
          operationId: "UsersController_create",
          tags: ["users"],
          mutation: true,
          requestSchema: "CreatePasswordUser",
          successStatus: "201",
          successSchema: "UserDto",
        }),
      },
      "/api/v1/users/{id}": {
        get: operation({
          operationId: "UsersController_get",
          tags: ["users"],
          parameters: [idParameter()],
          successStatus: "200",
          successSchema: "UserDetailDto",
        }),
        patch: operation({
          operationId: "UsersController_update",
          tags: ["users"],
          mutation: true,
          parameters: [idParameter()],
          requestSchema: "UpdateUser",
          successStatus: "200",
          successSchema: "UserDto",
        }),
      },
      "/api/v1/users/{id}/suspend": {
        post: operation({
          operationId: "UsersController_suspend",
          tags: ["users"],
          mutation: true,
          parameters: [idParameter()],
          successStatus: "200",
          successSchema: "UserDto",
        }),
      },
      "/api/v1/users/{id}/activate": {
        post: operation({
          operationId: "UsersController_activate",
          tags: ["users"],
          mutation: true,
          parameters: [idParameter()],
          successStatus: "200",
          successSchema: "UserDto",
        }),
      },
      "/api/v1/users/{id}/credentials": {
        post: operation({
          operationId: "CredentialAdminController_setup",
          tags: ["users"],
          mutation: true,
          parameters: [idParameter()],
          requestSchema: "SetupCredentials",
          successStatus: "204",
        }),
      },
      "/api/v1/users/{id}/password/reset": {
        post: operation({
          operationId: "CredentialAdminController_reset",
          tags: ["users"],
          mutation: true,
          parameters: [idParameter()],
          requestSchema: "ResetPassword",
          successStatus: "204",
        }),
      },
      "/api/v1/roles": {
        get: operation({
          operationId: "AccessControlController_listRoles",
          tags: ["roles"],
          parameters: queryParameters(AccessPageQuerySchema),
          successStatus: "200",
          successSchema: "RolePage",
        }),
        post: operation({
          operationId: "AccessControlController_createRole",
          tags: ["roles"],
          mutation: true,
          requestSchema: "CreateRole",
          successStatus: "201",
          successSchema: "RoleDto",
        }),
      },
      "/api/v1/roles/{id}": {
        patch: operation({
          operationId: "AccessControlController_updateRole",
          tags: ["roles"],
          mutation: true,
          parameters: [idParameter()],
          requestSchema: "UpdateRole",
          successStatus: "200",
          successSchema: "RoleDto",
        }),
      },
      "/api/v1/permissions": {
        get: operation({
          operationId: "AccessControlController_listPermissions",
          tags: ["roles"],
          parameters: queryParameters(AccessPageQuerySchema),
          successStatus: "200",
          successSchema: "PermissionPage",
        }),
      },
      "/api/v1/users/{id}/roles": {
        put: operation({
          operationId: "AccessControlController_replaceRoles",
          tags: ["users"],
          mutation: true,
          parameters: [idParameter()],
          requestSchema: "ReplaceUserRoles",
          successStatus: "200",
          successSchema: "OkResponse",
        }),
      },
      "/api/v1/users/{id}/permission-overrides": {
        put: operation({
          operationId: "AccessControlController_replaceOverrides",
          tags: ["users"],
          mutation: true,
          parameters: [idParameter()],
          requestSchema: "ReplacePermissionOverrides",
          successStatus: "200",
          successSchema: "OkResponse",
        }),
      },
      "/api/v1/audit-logs": {
        get: operation({
          operationId: "AuditController_list",
          tags: ["audit"],
          parameters: queryParameters(AuditQuerySchema),
          successStatus: "200",
          successSchema: "AuditLogPage",
        }),
      },
    },
    components: {
      securitySchemes: {
        AccessCookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "effect_access",
          description: "Authenticated session access cookie.",
        },
        RefreshCookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "effect_refresh",
          description:
            "Refresh-session cookie accepted only by the refresh endpoint.",
        },
      },
      schemas: Object.fromEntries(
        Object.entries(componentSchemas).map(([name, schema]) => [
          name,
          jsonSchema(
            schema,
            inputComponentSchemas.has(name) ? "input" : "output",
          ),
        ]),
      ),
    },
  };
}

export function writeOpenApiDocument(): void {
  const outputPath = fileURLToPath(new URL("../openapi.json", import.meta.url));
  writeFileSync(
    outputPath,
    `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  writeOpenApiDocument();
