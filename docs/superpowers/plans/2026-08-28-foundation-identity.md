# Foundation and Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-shaped vertical slice of Effect ERP: a Dockerized modular monorepo with a Next.js UI, NestJS REST API, PostgreSQL persistence, OTP authentication, users, RBAC, sessions, and audit history.

**Architecture:** Keep one deployable web app, one deployable API, and one PostgreSQL database. Each business feature is a pnpm workspace package with isolated `server`, `web`, and `contracts` exports; TypeORM entities stay with their feature while migrations and the DataSource stay centralized. The legacy single-file prototype remains unchanged and acts as the visual reference.

**Tech Stack:** Node.js 24 LTS, pnpm workspaces, Turborepo, TypeScript strict mode, Next.js 16 App Router, React, NestJS ESM, TypeORM, PostgreSQL 17, Zod, `@asteasolutions/zod-to-openapi`, Vitest, Testing Library, Supertest, Playwright, Testcontainers, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-08-28-foundation-identity-design.md`

## Global Constraints

- The product is single-company; do not add `tenantId`.
- Use REST endpoints under `/api/v1` and generate OpenAPI from shared Zod schemas.
- Keep `effect-erp.html`, `src/`, and the existing `.testenv/` prototype tests working.
- Use TypeORM with `synchronize: false` in every environment; all schema changes require migrations.
- Keep Entity classes in feature packages and migrations/DataSource in `packages/platform/database`.
- Expose feature code through explicit `./server`, `./web`, and `./contracts` subpaths; never export server code from browser entry points.
- Use PostgreSQL for OTP throttling and sessions; do not add Redis, a message broker, microservices, or Kubernetes.
- Store no raw OTP, access token, refresh token, cookie, SMS credential, or secret in the database, structured logs, or production logs. Only the explicit development-only `ConsoleSmsProvider` may print an OTP locally.
- Use same-origin `/api` routing from Next.js to NestJS, secure HttpOnly cookies, CSRF validation, and Origin validation.
- Use Node.js 24.x LTS. Pin the exact pnpm and dependency versions through `packageManager` and `pnpm-lock.yaml` during Task 1.
- Follow TDD: observe each focused test fail before writing its implementation.
- Stage only the files listed by each task; preserve unrelated existing working-tree changes.

---

## File Map

### Repository tooling

- `package.json` — root scripts and package manager pin.
- `pnpm-workspace.yaml` — workspace discovery.
- `turbo.json` — dependency-aware task graph.
- `.nvmrc` — Node.js 24 runtime.
- `.env.example` — non-secret configuration contract.
- `.dockerignore` — minimal Docker build context.
- `vitest.config.ts` — Vitest Projects discovery for the monorepo.
- `tooling/workspace-layout.test.mjs` — repository boundary smoke test.
- `.github/workflows/ci.yml` — lint, typecheck, unit, integration, E2E, and build gates.

### Applications

- `apps/api/src/main.ts` — Nest bootstrap and global middleware.
- `apps/api/src/app.module.ts` — API composition root.
- `apps/api/src/health/*` — liveness/readiness endpoints.
- `apps/api/src/openapi.ts` — OpenAPI document generation.
- `apps/api/test/identity.e2e-spec.ts` — complete API identity flow.
- `apps/web/src/app/*` — Next.js routes and layouts.
- `apps/web/next.config.ts` — same-origin API rewrite and standalone output.
- `apps/web/e2e/identity.spec.ts` — browser journey.

### Platform and shared packages

- `packages/platform/config` — Zod environment parsing and production guards.
- `packages/platform/database` — TypeORM DataSource, entity registry, migrations, and seed runner.
- `packages/platform/logger` — structured logging, redaction, request IDs.
- `packages/platform/testing` — PostgreSQL container and application fixtures.
- `packages/shared/contracts` — error, pagination, principal, and health schemas.
- `packages/shared/ui` — RTL tokens and reusable form/shell components.

### Feature packages

- `packages/features/users` — User entity, contracts, service, controller, and admin UI.
- `packages/features/audit` — append-only AuditLog entity, writer, query API, and UI.
- `packages/features/access-control` — roles, permissions, overrides, seed catalog, guard, and UI.
- `packages/features/auth` — OTP, rate limits, SMS adapters, JWT, refresh rotation, sessions, CSRF integration, and login/session UI.

---

### Task 1: Establish the monorepo contract

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.nvmrc`
- Create: `vitest.config.ts`
- Create: `tooling/workspace-layout.test.mjs`
- Create: `packages/shared/typescript-config/package.json`
- Create: `packages/shared/typescript-config/base.json`
- Create: `packages/shared/typescript-config/nest.json`
- Create: `packages/shared/typescript-config/next.json`
- Create: `packages/shared/eslint-config/package.json`
- Create: `packages/shared/eslint-config/base.mjs`
- Create: `packages/shared/eslint-config/next.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: the existing repository root and prototype build.
- Produces: root commands `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:e2e`.
- Produces: shared strict TypeScript configs and flat ESLint configs consumed by every new workspace package.

- [ ] **Step 1: Write the failing workspace layout test**

```js
// tooling/workspace-layout.test.mjs
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('declares the application and package workspaces', () => {
  assert.equal(existsSync('package.json'), true);
  assert.equal(existsSync('pnpm-workspace.yaml'), true);
  const workspace = readFileSync('pnpm-workspace.yaml', 'utf8');
  assert.match(workspace, /apps\/\*/);
  assert.match(workspace, /packages\/features\/\*/);
  assert.match(workspace, /packages\/platform\/\*/);
  assert.match(workspace, /packages\/shared\/\*/);
});
```

- [ ] **Step 2: Run the structural test and observe failure**

Run: `node --test tooling/workspace-layout.test.mjs`

Expected: FAIL because `package.json` and `pnpm-workspace.yaml` do not exist.

- [ ] **Step 3: Create root workspace files**

Create `package.json` with `private: true`, `type: "module"`, Node engine `>=24 <25`, and these scripts:

```json
{
  "name": "effect-erp",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:integration": "turbo run test:integration",
    "test:e2e": "turbo run test:e2e"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/features/*
  - packages/platform/*
  - packages/shared/*
```

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
    "lint": { "dependsOn": ["^lint"], "outputs": [] },
    "typecheck": { "dependsOn": ["^typecheck"], "outputs": [] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "test:integration": { "dependsOn": ["^build"], "cache": false, "outputs": [] },
    "test:e2e": { "dependsOn": ["^build"], "cache": false, "outputs": ["playwright-report/**", "test-results/**"] }
  }
}
```

Create `vitest.config.ts` using the current Vitest Projects API:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/*/vitest.config.ts',
      'packages/features/*/vitest.config.ts',
      'packages/platform/*/vitest.config.ts',
      'packages/shared/*/vitest.config.ts',
    ],
  },
});
```

Set `.nvmrc` to `24`. Add `node_modules/`, `.turbo/`, `.next/`, `dist/`, `coverage/`, `.env`, `.env.*`, `!.env.example`, `playwright-report/`, `test-results/`, and `.DS_Store` to `.gitignore` while retaining `.testenv/node_modules/`.

Create a strict `base.json` with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`, `declaration`, `sourceMap`, and `skipLibCheck`. `nest.json` extends base with `module` and `moduleResolution` set to `NodeNext`, decorators enabled, and `outDir: "dist"`. `next.json` extends base with `module: "ESNext"`, `moduleResolution: "Bundler"`, `jsx: "preserve"`, `noEmit: true`, and the Next.js TypeScript plugin. Export flat ESLint presets from `base.mjs` and `next.mjs`; base rejects floating promises and unused imports, while next adds the official Next.js flat rules.

- [ ] **Step 4: Pin pnpm, install root tooling, and rerun the test**

Run:

```bash
corepack use pnpm@latest-10
pnpm add -Dw turbo typescript eslint @eslint/js typescript-eslint eslint-config-next eslint-plugin-import-x prettier vitest @vitest/coverage-v8
node --test tooling/workspace-layout.test.mjs
```

Expected: the structural test passes and `pnpm-lock.yaml` records exact dependency versions.

- [ ] **Step 5: Verify the legacy prototype still builds**

Run: `./build.sh && npm test --prefix .testenv`

Expected: the existing prototype build, regression, smoke, and leak tests pass.

- [ ] **Step 6: Commit the workspace contract**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .nvmrc vitest.config.ts tooling/workspace-layout.test.mjs packages/shared/typescript-config packages/shared/eslint-config .gitignore
git commit -m "build: establish modular monorepo"
```

---

### Task 2: Add shared configuration, contracts, and logging

**Files:**
- Create: `packages/platform/config/package.json`
- Create: `packages/platform/config/vitest.config.ts`
- Create: `packages/platform/config/src/env.ts`
- Create: `packages/platform/config/src/index.ts`
- Create: `packages/platform/config/src/env.test.ts`
- Create: `packages/platform/logger/package.json`
- Create: `packages/platform/logger/vitest.config.ts`
- Create: `packages/platform/logger/src/logger.ts`
- Create: `packages/platform/logger/src/index.ts`
- Create: `packages/platform/logger/src/logger.test.ts`
- Create: `packages/shared/contracts/package.json`
- Create: `packages/shared/contracts/vitest.config.ts`
- Create: `packages/shared/contracts/src/error.ts`
- Create: `packages/shared/contracts/src/domain-error.ts`
- Create: `packages/shared/contracts/src/health.ts`
- Create: `packages/shared/contracts/src/pagination.ts`
- Create: `packages/shared/contracts/src/principal.ts`
- Create: `packages/shared/contracts/src/request-context.ts`
- Create: `packages/shared/contracts/src/index.ts`
- Create: `packages/shared/contracts/src/contracts.test.ts`
- Create: `.env.example`

**Interfaces:**
- Produces: `parseEnv(input: NodeJS.ProcessEnv): AppEnv`.
- Produces: `DomainError`, `ApiError`, `ErrorEnvelopeSchema`, `HealthResponseSchema`, `createPageSchema`, `Page<T>`, `AuthenticatedPrincipalSchema`, and `RequestContextSchema`.
- Produces: `createAppLogger(destination?: DestinationStream): Logger` with secret redaction.

- [ ] **Step 1: Write failing contract and environment tests**

```ts
const baseEnv = {
  NODE_ENV: 'development',
  API_PORT: '3001',
  DATABASE_URL: 'postgres://effect:effect@localhost:5432/effect_erp',
  WEB_ORIGIN: 'http://localhost:3000',
  INTERNAL_API_URL: 'http://localhost:3001',
  OTP_PEPPER: 'o'.repeat(32),
  JWT_ACCESS_SECRET: 'j'.repeat(32),
  SMS_PROVIDER: 'console',
  INITIAL_ADMIN_PHONE: '09121234567',
};

it('rejects an unsafe production SMS provider', () => {
  expect(() => parseEnv({ ...baseEnv, NODE_ENV: 'production', SMS_PROVIDER: 'console' }))
    .toThrow(/SMS_PROVIDER/);
});

it('accepts the stable error envelope', () => {
  const parsed = ErrorEnvelopeSchema.parse({
    error: { code: 'OTP_EXPIRED', message: 'کد تأیید منقضی شده است.', fields: {}, requestId: 'req_1' },
  });
  expect(parsed.error.code).toBe('OTP_EXPIRED');
});
```

Also test that a 31-character OTP pepper and JWT secret fail, missing `DATABASE_URL` fails, production accepts only `SMS_PROVIDER=http`, and the authenticated principal contains UUID `userId` and `sessionId` values.

- [ ] **Step 2: Run focused tests and observe module-not-found failures**

Run: `pnpm vitest run packages/platform/config/src/env.test.ts packages/shared/contracts/src/contracts.test.ts`

Expected: FAIL because the package implementations do not exist.

- [ ] **Step 3: Implement exact environment and contract schemas**

Use Zod to define these environment keys: `NODE_ENV`, `API_PORT`, `DATABASE_URL`, `WEB_ORIGIN`, `INTERNAL_API_URL`, `OTP_PEPPER`, `JWT_ACCESS_SECRET`, `SMS_PROVIDER`, `SMS_HTTP_URL`, `SMS_HTTP_TOKEN`, `INITIAL_ADMIN_PHONE`, `COOKIE_SECURE`, `OTP_TTL_SECONDS`, `OTP_RESEND_SECONDS`, and `REFRESH_TTL_DAYS`. Defaults are API port 3001, OTP TTL 120 seconds, resend 60 seconds, refresh 30 days, and secure cookies outside development. Add a super-refinement that rejects `console` and `fake` SMS providers in production and requires URL/token for the `http` provider.

Define the error contract exactly as:

```ts
export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().regex(/^[A-Z0-9_]+$/),
    message: z.string().min(1),
    fields: z.record(z.string(), z.array(z.string())).default({}),
    requestId: z.string().min(1),
  }),
});
```

Define `AuthenticatedPrincipal` with `userId`, `sessionId`, `phone`, and `permissions: string[]`. Define `RequestContext` with `requestId`, `ipAddress`, and `userAgent`. Define page metadata with positive `page` and `pageSize`, non-negative `total` and `pageCount`, `Page<T>` as `{items: T[]; meta: PageMeta}`, and `createPageSchema(itemSchema)` as the runtime equivalent. `DomainError` carries stable `code`, `message`, and field errors; `ApiError` reconstructs that shape in the web client.

- [ ] **Step 4: Implement structured logging and redaction tests**

Configure Pino to redact these exact paths: `req.headers.authorization`, `req.headers.cookie`, `otp`, `code`, `accessToken`, `refreshToken`, `SMS_HTTP_TOKEN`, `OTP_PEPPER`, and `JWT_ACCESS_SECRET`. The test writes a log object containing `otp: '123456'` and asserts the captured output contains `[Redacted]` and does not contain `123456`.

- [ ] **Step 5: Run package tests and typecheck**

Run: `pnpm vitest run packages/platform/config packages/platform/logger packages/shared/contracts && pnpm typecheck`

Expected: all focused tests pass and exported types compile under strict TypeScript.

- [ ] **Step 6: Commit shared foundations**

```bash
git add packages/platform/config packages/platform/logger packages/shared/contracts .env.example pnpm-lock.yaml
git commit -m "feat: add shared config contracts and logging"
```

---

### Task 3: Bootstrap web, API, PostgreSQL, and health checks

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/health/health.service.ts`
- Create: `apps/api/test/health.e2e-spec.ts`
- Create: `apps/web/package.json`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/globals.css`
- Create: `packages/platform/database/package.json`
- Create: `packages/platform/database/vitest.config.ts`
- Create: `packages/platform/database/src/data-source.ts`
- Create: `packages/platform/database/src/entity-registry.ts`
- Create: `packages/platform/database/src/index.ts`
- Create: `packages/platform/testing/package.json`
- Create: `packages/platform/testing/vitest.config.ts`
- Create: `packages/platform/testing/src/postgres-container.ts`
- Create: `packages/platform/testing/src/index.ts`
- Create: `compose.yml`
- Create: `apps/api/Dockerfile`
- Create: `apps/web/Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Produces: `createDataSource(options: DatabaseOptions): DataSource`.
- Produces: `GET /api/v1/health/live -> {status:'ok'}`.
- Produces: `GET /api/v1/health/ready -> {status:'ok', checks:{database:'up'}}` or HTTP 503.
- Produces: Next same-origin rewrite `/api/:path* -> INTERNAL_API_URL/api/:path*`.

- [ ] **Step 1: Write failing health E2E tests**

```ts
it('reports liveness without querying the database', async () => {
  await request(app.getHttpServer()).get('/api/v1/health/live').expect(200).expect({ status: 'ok' });
});

it('returns 503 when PostgreSQL is unavailable', async () => {
  database.query.mockRejectedValueOnce(new Error('connection refused'));
  await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503);
});
```

- [ ] **Step 2: Run the E2E test and observe failure**

Run: `pnpm --filter @effect/api test:e2e -- health.e2e-spec.ts`

Expected: FAIL because the API package and health endpoints do not exist.

- [ ] **Step 3: Implement the NestJS application and database health service**

Bootstrap NestJS on `0.0.0.0:${API_PORT}` with URI versioning disabled and the literal global prefix `api/v1`. `HealthService.readiness()` must execute `SELECT 1` through the injected DataSource and throw `ServiceUnavailableException` on failure. Do not use `synchronize` in `createDataSource`.

```ts
async readiness(): Promise<HealthResponse> {
  try {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', checks: { database: 'up' } };
  } catch {
    throw new ServiceUnavailableException({ status: 'error', checks: { database: 'down' } });
  }
}
```

- [ ] **Step 4: Implement the minimal Next.js shell and same-origin rewrite**

The root layout must render `<html lang="fa" dir="rtl">`. The home page calls `/api/v1/health/ready` on the server and renders `Effect ERP آماده است` only for a valid health response. Configure `output: 'standalone'` and a rewrite sourced from `INTERNAL_API_URL`.

- [ ] **Step 5: Add Docker development topology**

Use `postgres:17-alpine`, database `effect_erp`, user `effect`, a named volume, and `pg_isready` health check. Expose web on 3000 and API on 3001. Make API depend on healthy PostgreSQL and web depend on healthy API. Dockerfiles must use Node 24 Alpine and pnpm through Corepack.

- [ ] **Step 6: Verify database, API, web, and prototype**

Run:

```bash
pnpm --filter @effect/api test:e2e -- health.e2e-spec.ts
docker compose up -d --build --wait
curl --fail http://localhost:3001/api/v1/health/ready
curl --fail http://localhost:3000
docker compose down
./build.sh
```

Expected: health reports database `up`, the web response contains `Effect ERP آماده است`, and the prototype rebuild succeeds.

- [ ] **Step 7: Commit the running platform slice**

```bash
git add apps/api apps/web packages/platform/database packages/platform/testing compose.yml .dockerignore pnpm-lock.yaml
git commit -m "feat: bootstrap web api and postgres"
```

---

### Task 4: Implement the users feature and first migration

**Files:**
- Create: `packages/features/users/package.json`
- Create: `packages/features/users/vitest.config.ts`
- Create: `packages/features/users/src/contracts/user.schemas.ts`
- Create: `packages/features/users/src/contracts/index.ts`
- Create: `packages/features/users/src/entities/user.entity.ts`
- Create: `packages/features/users/src/entities/index.ts`
- Create: `packages/features/users/src/server/phone.ts`
- Create: `packages/features/users/src/server/users.service.ts`
- Create: `packages/features/users/src/server/users.module.ts`
- Create: `packages/features/users/src/server/index.ts`
- Create: `packages/features/users/src/server/users.service.test.ts`
- Create: `packages/features/users/src/server/users.integration.test.ts`
- Create: `packages/platform/database/src/migrations/202608280001-create-users.ts`
- Modify: `packages/platform/database/src/entity-registry.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `normalizeIranianMobile(value: string): string` returning canonical `+989xxxxxxxxx`.
- Produces: `UsersFacade.findActiveByPhone(phone: string, manager?: EntityManager): Promise<UserEntity | null>`.
- Produces: `UsersService.create(input: CreateUserInput, actorId: string, manager?: EntityManager): Promise<UserEntity>`.

- [ ] **Step 1: Write failing phone and repository tests**

```ts
it.each([
  ['۰۹۱۲۱۲۳۴۵۶۷', '+989121234567'],
  ['09121234567', '+989121234567'],
  ['00989121234567', '+989121234567'],
  ['+989121234567', '+989121234567'],
])('normalizes %s', (input, expected) => {
  expect(normalizeIranianMobile(input)).toBe(expected);
});

it('enforces unique normalized phone numbers', async () => {
  await service.create({ phone: '09121234567', firstName: 'رضا', lastName: 'قایمی' }, actorId);
  await expect(service.create({ phone: '+989121234567', firstName: 'رضا', lastName: 'دوم' }, actorId))
    .rejects.toMatchObject({ code: 'PHONE_ALREADY_EXISTS' });
});
```

- [ ] **Step 2: Run focused tests and observe failure**

Run: `pnpm --filter @effect/users test`

Expected: FAIL because the normalizer, entity, and service do not exist.

- [ ] **Step 3: Implement contracts, entity, and service**

`UserEntity` uses table `users`, UUID primary key, unique `phone`, enum `ACTIVE | SUSPENDED`, nullable `lastLoginAt`, and timestamp columns. The create schema accepts an Iranian mobile number and 1–80 character first and last names. Normalize before every lookup or write and translate PostgreSQL unique violation `23505` to `PHONE_ALREADY_EXISTS`.

Use this canonical validation after digit conversion:

```ts
if (!/^\+989\d{9}$/.test(canonical)) {
  throw new DomainError('PHONE_INVALID', 'شماره موبایل معتبر نیست.');
}
```

- [ ] **Step 4: Add and test the users migration**

Create table `users`, enum `user_status`, unique index `uq_users_phone`, and index `ix_users_status`. Run the migration against a Testcontainers PostgreSQL instance, assert a second canonical phone insert fails with `23505`, then run the same migration suite from an empty database a second time.

Run: `pnpm --filter @effect/users test:integration`

Expected: all user integration tests pass with `synchronize: false`.

- [ ] **Step 5: Commit the users domain**

```bash
git add packages/features/users packages/platform/database/src/entity-registry.ts packages/platform/database/src/migrations/202608280001-create-users.ts apps/api/src/app.module.ts pnpm-lock.yaml
git commit -m "feat: add users domain and migration"
```

---

### Task 5: Add append-only audit history

**Files:**
- Create: `packages/features/audit/package.json`
- Create: `packages/features/audit/vitest.config.ts`
- Create: `packages/features/audit/src/contracts/audit.schemas.ts`
- Create: `packages/features/audit/src/contracts/index.ts`
- Create: `packages/features/audit/src/entities/audit-log.entity.ts`
- Create: `packages/features/audit/src/entities/index.ts`
- Create: `packages/features/audit/src/server/audit-writer.ts`
- Create: `packages/features/audit/src/server/audit-query.service.ts`
- Create: `packages/features/audit/src/server/audit.module.ts`
- Create: `packages/features/audit/src/server/index.ts`
- Create: `packages/features/audit/src/server/audit.integration.test.ts`
- Create: `packages/platform/database/src/migrations/202608280002-create-audit-logs.ts`
- Modify: `packages/platform/database/src/entity-registry.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `AuditWriter.write(event: AuditEvent, manager?: EntityManager): Promise<void>`.
- Produces: `AuditQueryService.list(query: AuditQuery): Promise<Page<AuditLogDto>>`.

- [ ] **Step 1: Write the failing append-only integration test**

```ts
it('writes system and actor audit records but exposes no mutation API', async () => {
  await writer.write({ actorId: null, action: 'auth.otp_rejected', entityType: 'auth', entityId: null, metadata: {}, ipAddress: '127.0.0.1', requestId: 'req_1' });
  const page = await query.list({ page: 1, pageSize: 20 });
  expect(page.items).toHaveLength(1);
  expect(page.items[0]?.action).toBe('auth.otp_rejected');
  await expect(dataSource.query("UPDATE audit_logs SET action = 'tampered'"))
    .rejects.toThrow(/audit_logs are append-only/);
  await expect(dataSource.query('DELETE FROM audit_logs'))
    .rejects.toThrow(/audit_logs are append-only/);
});
```

- [ ] **Step 2: Run the test and observe failure**

Run: `pnpm --filter @effect/audit test:integration`

Expected: FAIL because the audit entity and writer do not exist.

- [ ] **Step 3: Implement audit persistence and pagination**

Use table `audit_logs` with nullable `actor_id`, `entity_id`, and `ip_address`; non-null `action`, `entity_type`, `metadata jsonb`, `request_id`, and `created_at`. The writer accepts an optional transaction manager and otherwise uses its repository manager. The query sorts by `(created_at DESC, id DESC)` and caps page size at 100.

- [ ] **Step 4: Add the audit migration and immutability checks**

The migration adds the table, a foreign key from `actor_id` to `users.id` with `ON DELETE SET NULL`, indexes on `(created_at, id)`, `actor_id`, `action`, and `(entity_type, entity_id)`, and a PostgreSQL trigger that raises `audit_logs are append-only` before UPDATE or DELETE. The integration test asserts both mutations fail. Only the later read-only GET controller is exposed.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm --filter @effect/audit test:integration && pnpm typecheck`

```bash
git add packages/features/audit packages/platform/database/src/entity-registry.ts packages/platform/database/src/migrations/202608280002-create-audit-logs.ts apps/api/src/app.module.ts pnpm-lock.yaml
git commit -m "feat: add append-only audit history"
```

---

### Task 6: Implement RBAC, identity administration, and secure seed

**Files:**
- Create: `packages/features/access-control/package.json`
- Create: `packages/features/access-control/vitest.config.ts`
- Create: `packages/features/access-control/src/contracts/access.schemas.ts`
- Create: `packages/features/access-control/src/contracts/index.ts`
- Create: `packages/features/access-control/src/entities/role.entity.ts`
- Create: `packages/features/access-control/src/entities/permission.entity.ts`
- Create: `packages/features/access-control/src/entities/user-role.entity.ts`
- Create: `packages/features/access-control/src/entities/role-permission.entity.ts`
- Create: `packages/features/access-control/src/entities/user-permission-override.entity.ts`
- Create: `packages/features/access-control/src/entities/index.ts`
- Create: `packages/features/access-control/src/server/access-control.service.ts`
- Create: `packages/features/access-control/src/server/access-control.module.ts`
- Create: `packages/features/access-control/src/server/require-permission.decorator.ts`
- Create: `packages/features/access-control/src/server/permission.guard.ts`
- Create: `packages/features/access-control/src/server/access-control.controller.ts`
- Create: `packages/features/access-control/src/server/index.ts`
- Create: `packages/features/access-control/src/server/access-control.test.ts`
- Create: `packages/features/users/src/server/users.controller.ts`
- Create: `packages/features/audit/src/server/audit.controller.ts`
- Create: `packages/platform/database/src/migrations/202608280003-create-access-control.ts`
- Create: `packages/platform/database/src/seed.ts`
- Create: `apps/api/test/access-control.e2e-spec.ts`
- Modify: `packages/features/users/src/server/users.service.ts`
- Modify: `packages/platform/database/src/entity-registry.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `AccessControlService.hasPermission(userId: string, key: string): Promise<boolean>`.
- Produces: `AccessControlService.listEffectivePermissions(userId: string): Promise<string[]>`.
- Produces: `AccessControlService.replaceUserRoles(userId: string, roleIds: string[], actorId: string): Promise<void>`.
- Produces: `RequirePermission(key: PermissionKey): MethodDecorator & ClassDecorator`.
- Produces protected users, roles, permissions, overrides, and audit REST endpoints from the spec.

- [ ] **Step 1: Write failing permission precedence tests**

```ts
it('applies deny override before allow override and role grants', async () => {
  repository.roleKeys.mockResolvedValue(['users:update']);
  repository.override.mockResolvedValue('DENY');
  await expect(service.hasPermission(userId, 'users:update')).resolves.toBe(false);
});

it('allows an explicit user grant when no deny exists', async () => {
  repository.roleKeys.mockResolvedValue([]);
  repository.override.mockResolvedValue('ALLOW');
  await expect(service.hasPermission(userId, 'users:update')).resolves.toBe(true);
});
```

Also test suspended user denial, absent permission denial, and protection against suspending the last active super-admin.

- [ ] **Step 2: Run focused tests and observe failure**

Run: `pnpm --filter @effect/access-control test`

Expected: FAIL because permission resolution and entities do not exist.

- [ ] **Step 3: Implement entities, resolver, decorator, and guard**

Use unique role slug, unique permission key, composite primary keys for join tables, and a unique `(user_id, permission_id)` override. Resolve in this exact order: inactive user false, DENY false, ALLOW true, role grant true, otherwise false. `PermissionGuard` reads `request.user.userId` from the shared principal contract and metadata from `RequirePermission`.

- [ ] **Step 4: Add migration and idempotent seed**

Seed these permission keys: `users:read`, `users:create`, `users:update`, `users:suspend`, `roles:manage`, `sessions:revoke`, and `audit:read`. Upsert system role `super-admin`, attach every permission, normalize `INITIAL_ADMIN_PHONE`, upsert the first active user, and attach the role. Running seed twice must leave one role, seven permissions, one initial user, and seven role-permission rows.

- [ ] **Step 5: Expose protected administration endpoints with auditing**

Register controllers matching the spec. All writes use a transaction containing the domain change and an AuditWriter call. List endpoints use page/pageSize contracts. Map missing records to 404, duplicate role/phone to 409, invalid data to 422, and permission denial to 403. Prevent deletion of system roles and suspension of the last active super-admin.

- [ ] **Step 6: Run integration and E2E permission tests**

Run:

```bash
pnpm --filter @effect/access-control test
pnpm --filter @effect/access-control test:integration
pnpm --filter @effect/api test:e2e -- access-control.e2e-spec.ts
```

Expected: explicit deny wins, unauthorized endpoints return 403, audit entries are written, and seed is idempotent.

- [ ] **Step 7: Commit RBAC and administration**

```bash
git add packages/features/access-control packages/features/users packages/features/audit packages/platform/database apps/api pnpm-lock.yaml
git commit -m "feat: add users roles permissions and audit APIs"
```

---

### Task 7: Implement OTP request, database throttling, and SMS adapters

**Files:**
- Create: `packages/features/auth/package.json`
- Create: `packages/features/auth/vitest.config.ts`
- Create: `packages/features/auth/src/contracts/auth.schemas.ts`
- Create: `packages/features/auth/src/contracts/index.ts`
- Create: `packages/features/auth/src/entities/otp-challenge.entity.ts`
- Create: `packages/features/auth/src/entities/rate-limit-bucket.entity.ts`
- Create: `packages/features/auth/src/entities/index.ts`
- Create: `packages/features/auth/src/server/sms/sms-provider.ts`
- Create: `packages/features/auth/src/server/sms/console-sms.provider.ts`
- Create: `packages/features/auth/src/server/sms/fake-sms.provider.ts`
- Create: `packages/features/auth/src/server/sms/http-sms.provider.ts`
- Create: `packages/features/auth/src/server/rate-limit.service.ts`
- Create: `packages/features/auth/src/server/otp.service.ts`
- Create: `packages/features/auth/src/server/auth.module.ts`
- Create: `packages/features/auth/src/server/auth.controller.ts`
- Create: `packages/features/auth/src/server/index.ts`
- Create: `packages/features/auth/src/server/otp.service.test.ts`
- Create: `packages/features/auth/src/server/otp.integration.test.ts`
- Create: `packages/platform/database/src/migrations/202608280004-create-otp.ts`
- Create: `apps/api/test/otp-request.e2e-spec.ts`
- Modify: `packages/platform/database/src/entity-registry.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `SmsProvider.send(input: {recipient: string; message: string; requestId: string}): Promise<void>`.
- Produces: `OtpService.request(input: RequestOtpInput, context: RequestContext): Promise<RequestOtpResponse>`.
- Produces: `POST /api/v1/auth/otp/request` with a shape-identical 202 response for active, missing, and suspended users.

- [ ] **Step 1: Write failing uniform-response and throttling tests**

```ts
it.each([
  ['active', { id: '6e444c58-63ee-4c74-b39d-f72a5eb84d3f', status: 'ACTIVE' }],
  ['missing', null],
  ['suspended', null],
])('returns the same public shape for %s users', async (_kind, foundUser) => {
  users.findActiveByPhone.mockResolvedValue(foundUser);
  const result = await service.request({ phone: '09121234567' }, context);
  expect(result).toEqual({ accepted: true, challengeId: expect.any(String), retryAfterSeconds: 60 });
});

it('blocks the sixth request in the phone window', async () => {
  for (let count = 0; count < 5; count += 1) {
    await rateLimiter.consume('otp:phone', '+989121234567', { limit: 5, windowSeconds: 600 });
  }
  await expect(rateLimiter.consume('otp:phone', '+989121234567', { limit: 5, windowSeconds: 600 }))
    .rejects.toMatchObject({ code: 'RATE_LIMITED' });
});
```

- [ ] **Step 2: Run tests and observe failure**

Run: `pnpm --filter @effect/auth test -- otp.service.test.ts`

Expected: FAIL because OTP service, rate limiter, and SMS providers do not exist.

- [ ] **Step 3: Implement database-backed atomic rate limits**

Hash bucket keys with HMAC-SHA256 and `OTP_PEPPER`. Maintain separate scopes `otp:phone` and `otp:ip`. Use a transaction and row-level locking/upsert so concurrent requests cannot exceed five per phone per 10 minutes or 20 per IP per 10 minutes. Update buckets for missing and suspended users too.

- [ ] **Step 4: Implement OTP challenge and providers**

Generate six numeric digits with `randomInt(0, 1_000_000)` and left-pad to six characters. Hash `challengeId + ':' + code` with HMAC-SHA256 and the pepper. Store a 120-second expiry and zero attempts. Send only for active users; for other users return a random UUID not persisted. `ConsoleSmsProvider` logs a development-only redacted event plus the code on a dedicated local development line. `FakeSmsProvider` stores sent messages in memory for tests. `HttpSmsProvider` POSTs `{recipient,message,requestId}` with Bearer auth and treats non-2xx as `SMS_DELIVERY_FAILED`.

- [ ] **Step 5: Add migration and failure compensation**

Create `otp_challenges` and `rate_limit_buckets` with indexes on phone/created time, expiry, and blocked time. If SMS delivery fails, mark the challenge invalid in the same request path and audit `auth.otp_delivery_failed`; never return the OTP in the HTTP response.

- [ ] **Step 6: Run unit, integration, and endpoint tests**

Run:

```bash
pnpm --filter @effect/auth test
pnpm --filter @effect/auth test:integration
pnpm --filter @effect/api test:e2e -- otp-request.e2e-spec.ts
```

Expected: raw codes are absent from the database and structured logger capture, uniform responses match, and concurrent throttling tests pass. The development-only console-provider test captures its dedicated OTP line separately.

- [ ] **Step 7: Commit OTP request flow**

```bash
git add packages/features/auth packages/platform/database apps/api pnpm-lock.yaml
git commit -m "feat: add secure OTP request flow"
```

---

### Task 8: Implement OTP verification and rotating sessions

**Files:**
- Create: `packages/features/auth/src/entities/session.entity.ts`
- Create: `packages/features/auth/src/entities/refresh-token.entity.ts`
- Create: `packages/features/auth/src/server/token.service.ts`
- Create: `packages/features/auth/src/server/session.service.ts`
- Create: `packages/features/auth/src/server/authentication.guard.ts`
- Create: `packages/features/auth/src/server/public.decorator.ts`
- Create: `packages/features/auth/src/test/session.fixture.ts`
- Create: `packages/features/auth/src/server/session.service.test.ts`
- Create: `packages/features/auth/src/server/session.integration.test.ts`
- Create: `packages/platform/database/src/migrations/202608280005-create-sessions.ts`
- Modify: `packages/features/auth/src/server/otp.service.ts`
- Modify: `packages/features/auth/src/server/auth.controller.ts`
- Modify: `packages/platform/database/src/entity-registry.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `OtpService.verify(input: VerifyOtpInput, context: RequestContext): Promise<AuthResult>`.
- Produces: `SessionService.refresh(rawToken: string, context: RequestContext): Promise<AuthResult>`.
- Defines: `AuthResult = {user: UserSummary; sessionId: string; accessToken: string; refreshToken: string; csrfToken: string}` as a server-only return type; HTTP responses expose only `user` and `sessionId` while tokens are written to cookies.
- Produces: global AuthenticationGuard and `Public()` decorator.
- Produces: verify, refresh, logout, logout-all, session list, session revoke, and `GET /api/v1/me` endpoints.
- Produces for tests: `SessionFixture.createActiveSession(input: {userId: string}): Promise<{sessionId: string; rawRefreshToken: string}>`.

- [ ] **Step 1: Write failing single-use and replay tests**

```ts
it('consumes a challenge exactly once', async () => {
  const first = await service.verify(validInput, context);
  expect(first.user.id).toBe(userId);
  await expect(service.verify(validInput, context)).rejects.toMatchObject({ code: 'OTP_INVALID' });
});

it('revokes the session family when a rotated token is replayed', async () => {
  const original = await sessionFixture.createActiveSession({ userId });
  await service.refresh(original.rawRefreshToken, context);
  await expect(service.refresh(original.rawRefreshToken, context)).rejects.toMatchObject({ code: 'SESSION_REVOKED' });
  const activeTokens = await refreshTokenRepository.count({
    where: { sessionId: original.sessionId, revokedAt: IsNull() },
  });
  expect(activeTokens).toBe(0);
});
```

- [ ] **Step 2: Run focused tests and observe failure**

Run: `pnpm --filter @effect/auth test -- session.service.test.ts`

Expected: FAIL because verification, sessions, and rotation do not exist.

- [ ] **Step 3: Implement transactional verification**

Lock the challenge row, reject consumed/expired/invalid challenges with public code `OTP_INVALID`, increment failed attempts, and invalidate at five attempts. Compare hashes with `timingSafeEqual`. On success update `users.last_login_at`, consume the challenge, create Session and RefreshToken rows, and write `auth.login_succeeded` within one transaction.

- [ ] **Step 4: Implement access and refresh tokens**

Create a 15-minute HS256 JWT containing `sub`, `sid`, `phone`, `iat`, and `exp`. Generate a 32-byte random opaque refresh token, store only its SHA-256 hash, and set 30-day expiry. On refresh, lock the token and session rows; consume the old token, create its replacement, set `replacedByTokenId`, and update session last-used time in one transaction. When a consumed token is replayed, commit session/token revocation and `auth.refresh_reuse_detected` first, then throw `SESSION_REVOKED` outside that transaction so the security write is not rolled back.

- [ ] **Step 5: Implement auth cookies and session endpoints**

Use cookies `effect_access`, `effect_refresh`, and `effect_csrf`; set path `/`, HttpOnly on auth cookies, non-HttpOnly on CSRF cookie, `SameSite=Lax`, and configured Secure flag. On every protected request, AuthenticationGuard verifies the JWT, loads the active Session and active User, then calls `listEffectivePermissions` to construct `request.user`; revoked sessions and suspended users therefore lose access immediately. Logout revokes current session and clears all cookies. Logout-all revokes every active user session. Session list returns device, masked IP, created/last-used timestamps, and `current` boolean. `GET /me` returns the current user summary plus effective permissions.

- [ ] **Step 6: Add migration and run concurrency tests**

Create `sessions` and `refresh_tokens`, foreign keys with cascade from user to sessions and session to tokens, unique token hash, and indexes for active sessions and token lookup. Run two simultaneous refresh calls with the same raw token; exactly one must succeed and the other must trigger family revocation.

Run: `pnpm --filter @effect/auth test && pnpm --filter @effect/auth test:integration`

- [ ] **Step 7: Commit authentication sessions**

```bash
git add packages/features/auth packages/features/users packages/platform/database apps/api pnpm-lock.yaml
git commit -m "feat: add OTP verification and rotating sessions"
```

---

### Task 9: Apply API security, errors, request IDs, and OpenAPI

**Files:**
- Create: `apps/api/src/common/request-id.middleware.ts`
- Create: `apps/api/src/common/domain-exception.filter.ts`
- Create: `apps/api/src/common/origin.guard.ts`
- Create: `apps/api/src/common/csrf.guard.ts`
- Create: `apps/api/src/common/zod-validation.pipe.ts`
- Create: `apps/api/src/openapi.ts`
- Create: `apps/api/openapi.json`
- Create: `apps/api/test/identity.e2e-spec.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: feature controllers under `packages/features/*/src/server/`

**Interfaces:**
- Produces: stable `ErrorEnvelope` responses with request ID.
- Produces: same-origin Origin and double-submit CSRF enforcement for authenticated mutations.
- Produces: `openapi.json` covering all Phase 1 endpoints.

- [ ] **Step 1: Write failing security and error-envelope E2E tests**

```ts
it('rejects an authenticated mutation without matching CSRF values', async () => {
  await request(server)
    .post('/api/v1/users')
    .set('Cookie', authCookies)
    .set('Origin', webOrigin)
    .send(validUser)
    .expect(403)
    .expect(({ body }) => expect(body.error.code).toBe('CSRF_INVALID'));
});

it('returns the same request ID in header and error body', async () => {
  const response = await request(server).get('/api/v1/users/not-a-uuid').expect(422);
  expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
});
```

- [ ] **Step 2: Run identity E2E and observe failure**

Run: `pnpm --filter @effect/api test:e2e -- identity.e2e-spec.ts`

Expected: FAIL because the global security pipeline and stable errors are not wired.

- [ ] **Step 3: Implement the global request pipeline**

Generate or validate `x-request-id`, attach it to request/response, parse all body/query/params with feature Zod schemas, map DomainError codes to explicit HTTP statuses, and return the stable error envelope. Never expose stack traces outside logs.

- [ ] **Step 4: Implement Origin and CSRF protection**

For POST, PUT, PATCH, and DELETE, require Origin equal to `WEB_ORIGIN`. For authenticated mutations additionally require header `x-csrf-token` to match cookie `effect_csrf` using constant-time comparison. Exempt liveness, readiness, OTP request, OTP verify, and refresh only from CSRF; do not exempt them from Origin checks.

- [ ] **Step 5: Generate and validate OpenAPI**

Generate operation IDs from controller method names, use tags `auth`, `users`, `roles`, `sessions`, `audit`, and `health`, and write `apps/api/openapi.json`. Add a test asserting every non-health operation declares success and `ErrorEnvelope` responses and that all documented paths start with `/api/v1`.

- [ ] **Step 6: Run full API verification**

Run:

```bash
pnpm --filter @effect/api test:e2e
pnpm --filter @effect/api openapi:generate
git add apps/api/openapi.json
pnpm --filter @effect/api openapi:generate
git diff --exit-code -- apps/api/openapi.json
pnpm lint
pnpm typecheck
```

Expected: complete identity journey passes, OpenAPI is reproducible, and static checks pass.

- [ ] **Step 7: Commit the API security boundary**

```bash
git add apps/api packages/features packages/shared/contracts pnpm-lock.yaml
git commit -m "feat: secure and document identity API"
```

---

### Task 10: Build the Next.js login and session experience

**Files:**
- Create: `packages/shared/ui/package.json`
- Create: `packages/shared/ui/vitest.config.ts`
- Create: `packages/shared/ui/src/tokens.css`
- Create: `packages/shared/ui/src/button.tsx`
- Create: `packages/shared/ui/src/text-field.tsx`
- Create: `packages/shared/ui/src/app-shell.tsx`
- Create: `packages/shared/ui/src/index.ts`
- Create: `packages/features/auth/src/web/auth-client.ts`
- Create: `packages/features/auth/src/web/login-form.tsx`
- Create: `packages/features/auth/src/web/session-list.tsx`
- Create: `packages/features/auth/src/web/index.ts`
- Create: `packages/features/auth/src/web/login-form.test.tsx`
- Create from `fonts/isx/sub-Regular.woff2`: `apps/web/public/fonts/IRANSansX-Regular.woff2`
- Create from `fonts/isx/sub-Medium.woff2`: `apps/web/public/fonts/IRANSansX-Medium.woff2`
- Create from `fonts/isx/sub-DemiBold.woff2`: `apps/web/public/fonts/IRANSansX-DemiBold.woff2`
- Create from `fonts/login-art.jpg`: `apps/web/public/login-art.jpg`
- Create: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/app/settings/sessions/page.tsx`
- Create: `apps/web/src/proxy.ts`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces: `AuthClient.requestOtp`, `verifyOtp`, `refresh`, `me`, `logout`, `logoutAll`, `listSessions`, and `revokeSession`.
- Produces: `LoginAuthClient = Pick<AuthClient, 'requestOtp' | 'verifyOtp'>` for component testing and dependency isolation.
- Produces: RTL `/login` and `/settings/sessions` routes matching the v2.6 prototype identity.

- [ ] **Step 1: Write failing login component tests**

```tsx
it('normalizes Persian digits and moves from phone to six-digit OTP', async () => {
  const fakeClient = {
    requestOtp: vi.fn().mockResolvedValue({ accepted: true, challengeId: 'e8292771-e347-4f55-ad5f-ed813cfa42b5', retryAfterSeconds: 60 }),
    verifyOtp: vi.fn(),
  } satisfies LoginAuthClient;
  const user = userEvent.setup();
  render(<LoginForm client={fakeClient} />);
  await user.type(screen.getByLabelText('شماره موبایل'), '۰۹۱۲۱۲۳۴۵۶۷');
  await user.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }));
  expect(fakeClient.requestOtp).toHaveBeenCalledWith({ phone: '09121234567' });
  expect(screen.getAllByLabelText(/رقم/)).toHaveLength(6);
});
```

Also test API error copy, resend countdown, paste of six digits, keyboard submission, loading disablement, and redirect after successful verification.

- [ ] **Step 2: Run component tests and observe failure**

Run: `pnpm --filter @effect/auth test -- login-form.test.tsx`

Expected: FAIL because the web auth client and components do not exist.

- [ ] **Step 3: Implement shared RTL UI primitives**

Port only the v2.6 design tokens needed by this slice: primary `#6F6AEB`, page `#F6F6F8`, white surfaces, border `#E7E7EB`, 12px card radius, zero shadow, IRANSansX font faces, 8px spacing scale, and RTL focus styles. Buttons and fields must expose labels, error text, disabled state, and visible keyboard focus.

- [ ] **Step 4: Implement login and session pages**

Use shared Zod contracts before each request. Preserve cookies with `credentials: 'include'` and send the CSRF header for mutations. The login route shows the existing two-column desktop artwork and hides the image at 900px. The Next.js 16 `proxy.ts` entry checks auth-cookie presence and redirects unauthenticated protected routes to `/login`; authenticated `/login` redirects to the dashboard. NestJS remains authoritative and validates every token and permission. The session page marks the current session and confirms revocation of another session.

- [ ] **Step 5: Run accessibility and component checks**

Run: `pnpm --filter @effect/auth test && pnpm --filter @effect/web test && pnpm --filter @effect/web typecheck`

Expected: phone/OTP/session tests pass, `<html>` is Persian RTL, and no client bundle imports `typeorm` or `@nestjs/*`.

- [ ] **Step 6: Commit authentication UI**

```bash
git add packages/shared/ui packages/features/auth/src/web apps/web pnpm-lock.yaml
git commit -m "feat: add Next.js OTP and session UI"
```

---

### Task 11: Build users, roles, permissions, and audit UI

**Files:**
- Create: `packages/features/users/src/web/users-client.ts`
- Create: `packages/features/users/src/web/users-table.tsx`
- Create: `packages/features/users/src/web/user-form.tsx`
- Create: `packages/features/users/src/web/index.ts`
- Create: `packages/features/users/src/web/users.test.tsx`
- Create: `packages/features/access-control/src/web/access-client.ts`
- Create: `packages/features/access-control/src/web/roles-editor.tsx`
- Create: `packages/features/access-control/src/web/permission-overrides.tsx`
- Create: `packages/features/access-control/src/web/index.ts`
- Create: `packages/features/access-control/src/web/access.test.tsx`
- Create: `packages/features/audit/src/web/audit-client.ts`
- Create: `packages/features/audit/src/web/audit-table.tsx`
- Create: `packages/features/audit/src/web/index.ts`
- Create: `apps/web/src/app/settings/users/page.tsx`
- Create: `apps/web/src/app/settings/roles/page.tsx`
- Create: `apps/web/src/app/settings/audit/page.tsx`

**Interfaces:**
- Produces: administrator pages for users, roles, overrides, and read-only audit history.
- Produces: `UsersTableClient = Pick<UsersClient, 'list'>` and `PermissionOverridesClient = Pick<AccessClient, 'replaceOverrides'>`.
- Consumes: Phase 1 REST contracts and auth cookies from Tasks 6–10.

- [ ] **Step 1: Write failing permission-aware UI tests**

```tsx
it('hides user creation without users:create', () => {
  const readOnlyPrincipal = {
    userId: '6e444c58-63ee-4c74-b39d-f72a5eb84d3f',
    sessionId: '35cce04f-5ac1-497c-9798-951e935cdcf0',
    phone: '+989121234567',
    permissions: ['users:read'],
  };
  const client = { list: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, pageSize: 20, total: 0, pageCount: 0 } }) } satisfies UsersTableClient;
  render(<UsersTable principal={readOnlyPrincipal} client={client} />);
  expect(screen.queryByRole('button', { name: 'کاربر جدید' })).not.toBeInTheDocument();
});

it('shows explicit deny separately from role defaults', async () => {
  const user = { id: '013a40c7-82e7-4435-a5d6-988b03fdce37', overrides: [{ permissionKey: 'users:update', effect: 'DENY' as const }] };
  const client = { replaceOverrides: vi.fn().mockResolvedValue(undefined) } satisfies PermissionOverridesClient;
  render(<PermissionOverrides user={user} client={client} />);
  expect(screen.getByText('عدم دسترسی اختصاصی')).toBeVisible();
});
```

Also test pagination, suspended badge, role editing, last-super-admin error, empty audit state, and stable rendering of unknown audit metadata.

- [ ] **Step 2: Run feature web tests and observe failure**

Run: `pnpm vitest run packages/features/users/src/web packages/features/access-control/src/web packages/features/audit/src/web`

Expected: FAIL because the clients and components do not exist.

- [ ] **Step 3: Implement typed clients and administration pages**

All clients validate responses with feature Zod schemas and throw a typed `ApiError` from ErrorEnvelope. Keep server data in route/component fetch state rather than a global UI store. Every list renders loading, empty, error, permission-denied, and populated states. A user row opens a drawer containing profile fields, role assignments, and permission overrides. Mutations update only the affected query and announce success/error through an accessible live region.

- [ ] **Step 4: Match the prototype shell without copying legacy JavaScript**

Use the v2.6 sidebar position, IRANSansX typography, SVG-only icons, zero gradients, zero shadows, and `#6F6AEB`. Reuse new shared UI primitives. At widths 390, 1280, and 1500, tables must remain inside their container through responsive columns or horizontal table scrolling; the page itself must not overflow.

- [ ] **Step 5: Run frontend tests and production build**

Run:

```bash
pnpm vitest run packages/features/users/src/web packages/features/access-control/src/web packages/features/audit/src/web
pnpm --filter @effect/web build
pnpm --filter @effect/web typecheck
```

Expected: component tests and Next.js production build pass with no server-only package in client chunks.

- [ ] **Step 6: Commit administration UI**

```bash
git add packages/features/users/src/web packages/features/access-control/src/web packages/features/audit/src/web apps/web pnpm-lock.yaml
git commit -m "feat: add identity administration UI"
```

---

### Task 12: Add full-stack E2E, production images, CI, and handoff docs

**Files:**
- Create: `apps/web/e2e/identity.spec.ts`
- Create: `apps/web/e2e/helpers/fake-sms.ts`
- Create: `apps/api/src/test-support/fake-sms.controller.ts`
- Create: `apps/web/playwright.config.ts`
- Create: `compose.test.yml`
- Create: `.github/workflows/ci.yml`
- Modify: `apps/api/Dockerfile`
- Modify: `apps/web/Dockerfile`
- Modify: `compose.yml`
- Modify: `README.md`

**Interfaces:**
- Produces: one-command development startup, reproducible production images, and a CI-enforced release gate.
- Produces for E2E only: `readFakeSmsCode(request: APIRequestContext, phone: string): Promise<string>` which calls `/api/v1/test/sms/latest` and validates a six-digit code.
- Consumes: all Phase 1 packages and endpoints.

- [ ] **Step 1: Write the failing browser journey**

```ts
test('admin can sign in, create a user, assign access, and revoke a session', async ({ page, request }) => {
  await page.goto('/login');
  await page.getByLabel('شماره موبایل').fill('۰۹۱۲۱۲۳۴۵۶۷');
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  const otp = await readFakeSmsCode(request, '+989121234567');
  await page.getByLabel('کد تأیید').fill(otp);
  await page.getByRole('button', { name: 'ورود' }).click();
  await page.goto('/settings/users');
  await page.getByRole('button', { name: 'کاربر جدید' }).click();
  await page.getByLabel('نام').fill('سارا');
  await page.getByLabel('نام خانوادگی').fill('احمدی');
  await page.getByLabel('شماره موبایل').fill('09121111111');
  await page.getByRole('button', { name: 'ذخیره' }).click();
  await expect(page.getByText('سارا احمدی')).toBeVisible();
});
```

The test-only fake SMS inspection endpoint is compiled and registered only when `NODE_ENV=test`; assert it returns 404 in development and production builds.

- [ ] **Step 2: Run the journey and observe failure**

Run: `pnpm --filter @effect/web test:e2e -- identity.spec.ts`

Expected: FAIL until the test stack and fake SMS fixture are wired.

- [ ] **Step 3: Finalize test and production Compose files**

`compose.test.yml` uses isolated ports and an ephemeral PostgreSQL volume, runs migrations and seed before API tests, and sets `SMS_PROVIDER=fake`. Production Dockerfiles use pnpm deploy/pruned dependencies, a non-root user, read-only application files, Next standalone output, and API health checks. Do not run migrations implicitly in every API replica; expose `pnpm db:migrate` as a separate deployment command.

- [ ] **Step 4: Add CI gates**

The workflow uses Node 24, Corepack, frozen lockfile installation, Docker service availability, and these commands in order:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
./build.sh
npm test --prefix .testenv
git diff --check
```

Cache the pnpm store only; do not cache database state or generated OpenAPI. Upload Playwright traces only on failure.

- [ ] **Step 5: Document exact local and deployment workflows**

Update README with prerequisites, `.env.example` copy, `pnpm install`, `docker compose up --build`, migration, seed, development OTP retrieval, test commands, production image build, backup requirement before migrations, and the explicit warning that CRM, finance, tasks, leave, messenger, and reports still use the prototype only.

- [ ] **Step 6: Run the complete acceptance suite**

Run:

```bash
docker compose -f compose.test.yml up -d --build --wait
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
./build.sh
npm test --prefix .testenv
docker compose -f compose.test.yml down -v
git diff --check
```

Expected: every command exits zero; identity browser flow passes; migrations work from an empty database; prototype tests remain green.

- [ ] **Step 7: Commit the Phase 1 release gate**

```bash
git add apps/api/Dockerfile apps/api/src/test-support apps/web/Dockerfile apps/web/e2e apps/web/playwright.config.ts compose.yml compose.test.yml .github/workflows/ci.yml README.md pnpm-lock.yaml
git commit -m "test: complete foundation and identity release gate"
```

---

## Completion Review

Before declaring Phase 1 complete, verify every acceptance criterion in the design spec against fresh command output. Review dependency direction with `pnpm list --recursive`: browser entry points must not depend on NestJS or TypeORM, users must not depend on auth, and feature packages must not import each other's private source files. Review the final diff for leaked secrets, production `synchronize: true`, raw OTP outside the development-only console provider, permissive CORS, and unprotected mutation endpoints.
