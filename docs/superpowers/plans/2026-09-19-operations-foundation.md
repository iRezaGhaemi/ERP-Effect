# Operations Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first usable vertical slice: the production Next.js shell, real customer/workspace/project services, and a dashboard populated only from PostgreSQL data.

**Architecture:** Add three independent feature packages with public `contracts`, `entities`, `server`, and `web` entry points. NestJS composes the packages and a state-free dashboard query; Next.js consumes validated REST responses through one shared browser client. All writes use the existing authentication, CSRF, RBAC, audit, and TypeORM transaction boundaries.

**Tech Stack:** TypeScript 5.9, React 19, Next.js 16, NestJS 11, TypeORM 0.3, PostgreSQL 17, Zod 4, Vitest 4, Testcontainers, Playwright, pnpm/Turborepo.

**Spec:** `docs/superpowers/specs/2026-09-19-launch-first-operations-design.md`

## Global Constraints

- The product serves one company; do not add `tenant_id`.
- Browser entry points must not import NestJS or TypeORM.
- Cross-package imports must use package exports, never another package's private `src` path.
- Every mutation requires the current cookie session, Origin validation, CSRF, permission enforcement, and an audit record.
- Mutable domain records carry an integer `version`; mismatches return `409 CONCURRENT_UPDATE`.
- Production never creates operational demo data. Demo records require `SEED_DEMO_DATA=true`.
- UI is Persian RTL, IRANSansX, primary `#6F6AEB`, right sidebar, subtle borders, no decorative gradients or shadows.
- Every behavior follows RED → GREEN → refactor. Each task is committed separately and pushed after its review gate.
- Preserve the existing username/password authentication and keep chat/messenger absent.

## Plan Decomposition

The approved release contains independently reviewable subsystems, so it is intentionally split into separate implementation plans. This document implements deliveries A and B (shell, customer, workspace, project, and their real dashboard). After this plan is delivered, the remaining approved scope is executed through `2026-09-19-task-management.md`, `2026-09-19-files-notifications.md`, and `2026-09-19-launch-acceptance.md`, each written and reviewed before its own first code change.

## File Structure

```text
packages/features/customers/src/
  contracts/customer.schemas.ts       DTOs, inputs and list query
  entities/customer.entity.ts         Customer persistence
  entities/customer-contact.entity.ts Contact persistence
  server/customers.service.ts          Transactions and audit
  server/customers.controller.ts       REST/RBAC boundary
  server/customers.module.ts           Nest composition
  web/customers-client.ts              Browser REST client

packages/features/workspaces/src/
  contracts/workspace.schemas.ts
  entities/workspace.entity.ts
  entities/workspace-member.entity.ts
  server/workspaces.service.ts
  server/workspaces.controller.ts
  server/workspaces.module.ts
  web/workspaces-client.ts

packages/features/projects/src/
  contracts/project.schemas.ts
  entities/project.entity.ts
  entities/project-member.entity.ts
  server/projects.service.ts
  server/projects.controller.ts
  server/projects.module.ts
  web/projects-client.ts

packages/platform/database/src/migrations/202609190012-create-operations-foundation.ts
apps/api/src/dashboard/dashboard.controller.ts
apps/api/src/dashboard/dashboard.service.ts
apps/web/src/lib/api-client.ts
apps/web/src/app/customers/**
apps/web/src/app/workspaces/[id]/**
apps/web/src/app/projects/[id]/**
apps/web/src/app/dashboard/**
```

---

### Task 1: Public contracts and package boundaries

**Files:**
- Create: `packages/features/customers/package.json`
- Create: `packages/features/customers/tsconfig.json`
- Create: `packages/features/customers/vitest.config.ts`
- Create: `packages/features/customers/vitest.integration.config.ts`
- Create: `packages/features/customers/src/contracts/customer.schemas.ts`
- Create: `packages/features/customers/src/contracts/customer.schemas.test.ts`
- Create: `packages/features/customers/src/contracts/index.ts`
- Create: `packages/features/workspaces/package.json`
- Create: `packages/features/workspaces/tsconfig.json`
- Create: `packages/features/workspaces/vitest.config.ts`
- Create: `packages/features/workspaces/vitest.integration.config.ts`
- Create: `packages/features/workspaces/src/contracts/workspace.schemas.ts`
- Create: `packages/features/workspaces/src/contracts/workspace.schemas.test.ts`
- Create: `packages/features/workspaces/src/contracts/index.ts`
- Create: `packages/features/projects/package.json`
- Create: `packages/features/projects/tsconfig.json`
- Create: `packages/features/projects/vitest.config.ts`
- Create: `packages/features/projects/vitest.integration.config.ts`
- Create: `packages/features/projects/src/contracts/project.schemas.ts`
- Create: `packages/features/projects/src/contracts/project.schemas.test.ts`
- Create: `packages/features/projects/src/contracts/index.ts`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `CustomerDto`, `CustomerDetailDto`, `CustomerPageQuery`, `CreateCustomerInput`, `UpdateCustomerInput`, `ContactDto`, `CreateContactInput`, `UpdateContactInput`.
- Produces: `WorkspaceDto`, `WorkspaceDetailDto`, `WorkspacePageQuery`, `CreateWorkspaceInput`, `UpdateWorkspaceInput`, `ReplaceWorkspaceMembersInput`.
- Produces: `ProjectDto`, `ProjectDetailDto`, `ProjectPageQuery`, `CreateProjectInput`, `UpdateProjectInput`, `ReplaceProjectMembersInput`.
- All page responses use `createPageSchema` and the existing `{ items, meta }` shape from `@effect-erp/contracts`.

- [ ] **Step 1: Write failing contract tests**

Create focused tests that define trimming, date ordering, pagination limits, enum values, version requirements, and UUID member IDs:

```ts
it("normalizes a customer create command", () => {
  expect(CreateCustomerSchema.parse({
    name: "  آژانس سپهر  ",
    ownerUserId: "013a40c7-82e7-4435-a5d6-988b03fdce37",
    email: "INFO@SEPEHR.IR",
  })).toEqual({
    name: "آژانس سپهر",
    legalName: null,
    ownerUserId: "013a40c7-82e7-4435-a5d6-988b03fdce37",
    phone: null,
    email: "info@sepehr.ir",
    notes: null,
  });
});

it("rejects a project due date before its start date", () => {
  expect(() => CreateProjectSchema.parse({
    workspaceId: "143a40c7-82e7-4435-a5d6-988b03fdce37",
    name: "کمپین پاییز",
    startDate: "2026-09-20",
    dueDate: "2026-09-19",
  })).toThrow();
});

it("caps list pages at one hundred rows", () => {
  expect(() => CustomerPageQuerySchema.parse({ page: 1, pageSize: 101 })).toThrow();
});
```

- [ ] **Step 2: Run the contract tests and verify RED**

Run:

```bash
pnpm --filter @effect/customers test
pnpm --filter @effect/workspaces test
pnpm --filter @effect/projects test
```

Expected: each command fails because its schema exports do not exist.

- [ ] **Step 3: Implement the schemas and exports**

Use explicit schemas and inferred types. The customer status and shared version contract must be defined exactly as follows:

```ts
export const CustomerStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);
export const CustomerPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).default(""),
  status: CustomerStatusSchema.optional(),
  sort: z.enum(["name", "createdAt", "updatedAt"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});
export const VersionSchema = z.number().int().min(1);
```

Use `z.string().trim().min(1).max(...)`, `z.uuid()`, nullable defaults, and object-level date refinement. Package exports must expose only `./contracts`, `./entities`, `./server`, and `./web`; dependency lists must match actual imports.

The customer package production dependencies are `@effect/audit`, `@effect-erp/contracts`, `@effect/ui`, `@nestjs/common`, `react`, `react-dom`, `typeorm`, and `zod`. Workspace and project packages add `@effect/access-control` and `@effect/users`. All three dev dependency lists contain `@effect-erp/testing`, `@testing-library/react`, `@testing-library/user-event`, `@types/node`, `@types/react`, `@types/react-dom`, and `jsdom`. Scripts are exactly `"build": "tsc -p tsconfig.json"`, `"typecheck": "pnpm run build"`, `"test": "vitest run --config vitest.config.ts"`, and `"test:integration": "vitest run --config vitest.integration.config.ts"`.

- [ ] **Step 4: Install the workspace links and verify GREEN**

Run:

```bash
pnpm install --offline
pnpm --filter @effect/customers test
pnpm --filter @effect/workspaces test
pnpm --filter @effect/projects test
pnpm --filter @effect/customers typecheck
pnpm --filter @effect/workspaces typecheck
pnpm --filter @effect/projects typecheck
```

Expected: all contract tests and typechecks pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add packages/features/customers packages/features/workspaces packages/features/projects pnpm-lock.yaml
git commit -m "feat: define operations foundation contracts"
git push origin codex/foundation-identity
```

---

### Task 2: PostgreSQL migration and TypeORM entities

**Files:**
- Create: `packages/features/customers/src/entities/customer.entity.ts`
- Create: `packages/features/customers/src/entities/customer-contact.entity.ts`
- Create: `packages/features/customers/src/entities/index.ts`
- Create: `packages/features/workspaces/src/entities/workspace.entity.ts`
- Create: `packages/features/workspaces/src/entities/workspace-member.entity.ts`
- Create: `packages/features/workspaces/src/entities/index.ts`
- Create: `packages/features/projects/src/entities/project.entity.ts`
- Create: `packages/features/projects/src/entities/project-member.entity.ts`
- Create: `packages/features/projects/src/entities/index.ts`
- Create: `packages/platform/database/src/migrations/202609190012-create-operations-foundation.ts`
- Create: `packages/platform/database/src/operations-foundation.integration.test.ts`
- Modify: `packages/platform/database/package.json`
- Modify: `packages/platform/database/src/entity-registry.ts`
- Modify: `packages/platform/database/src/data-source.ts`
- Modify: `packages/platform/database/src/migration-names.test.ts`

**Interfaces:**
- Produces: six TypeORM entities exported from the three package `./entities` entry points.
- Produces: migration class `CreateOperationsFoundation202609190012` with name `CreateOperationsFoundation1789776000012`.
- Database enums are represented as varchar check constraints, not PostgreSQL enum types, so later additions remain migratable.

- [ ] **Step 1: Write the failing migration integration test**

```ts
it("creates operations tables and enforces one primary contact", async () => {
  await source.runMigrations();
  const tables = await source.query<Array<{ customers: string | null; projects: string | null }>>(
    `SELECT to_regclass('public.customers') AS customers,
            to_regclass('public.projects') AS projects`,
  );
  expect(tables[0]).toEqual({ customers: "customers", projects: "projects" });
  await expect(source.query(
    `INSERT INTO customer_contacts
      (id, customer_id, first_name, last_name, is_primary, created_at, updated_at, version)
     VALUES (gen_random_uuid(), $1, 'الف', 'الف', true, now(), now(), 1),
            (gen_random_uuid(), $1, 'ب', 'ب', true, now(), now(), 1)`,
    [customerId],
  )).rejects.toMatchObject({ code: "23505" });
});
```

Add assertions for project date ordering, unique workspace membership, unique project membership, archive blockers, and six tables being absent again after `undoLastMigration()`.

- [ ] **Step 2: Run the migration test and verify RED**

Run:

```bash
pnpm --filter @effect-erp/database exec vitest run --config vitest.integration.config.ts src/operations-foundation.integration.test.ts
```

Expected: FAIL because migration 012 and its tables are missing.

- [ ] **Step 3: Implement the migration and entities**

The migration must create these tables in dependency order:

```sql
customers
customer_contacts
workspaces
workspace_members
projects
project_members
```

Add foreign keys to `users`, `customers`, `workspaces`, and `projects`; `ON DELETE RESTRICT` for domain parents and `ON DELETE CASCADE` only for membership/contact children. Add:

```sql
CREATE UNIQUE INDEX uq_customer_primary_contact
  ON customer_contacts(customer_id) WHERE is_primary = true;
CREATE INDEX ix_customers_status_created ON customers(status, created_at DESC);
CREATE INDEX ix_workspaces_customer_status ON workspaces(customer_id, status);
CREATE INDEX ix_projects_workspace_status_due ON projects(workspace_id, status, due_date);
ALTER TABLE projects ADD CONSTRAINT ck_projects_date_order
  CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date);
```

Create two trigger functions that raise SQLSTATE `23514` when a customer with a non-archived workspace, or a workspace with a non-archived project, is changed to `ARCHIVED`. Entity columns must match the approved spec and use `@VersionColumn({ name: "version" })`.

- [ ] **Step 4: Register migration/entities and verify GREEN**

Run:

```bash
pnpm --filter @effect-erp/database exec vitest run --config vitest.integration.config.ts src/operations-foundation.integration.test.ts
pnpm --filter @effect-erp/database test
pnpm --filter @effect-erp/database typecheck
```

Expected: integration, migration-order unit tests, and typecheck pass; migration count is 12 with 12 unique timestamps.

- [ ] **Step 5: Commit Task 2**

```bash
git add packages/features/customers/src/entities packages/features/workspaces/src/entities packages/features/projects/src/entities packages/platform/database
git commit -m "feat: add operations foundation schema"
git push origin codex/foundation-identity
```

---

### Task 3: Customer and contact service/API

**Files:**
- Create: `packages/features/customers/src/server/customers.service.ts`
- Create: `packages/features/customers/src/server/customers.service.test.ts`
- Create: `packages/features/customers/src/server/customers.integration.test.ts`
- Create: `packages/features/customers/src/server/customers.controller.ts`
- Create: `packages/features/customers/src/server/customers.controller.test.ts`
- Create: `packages/features/customers/src/server/customers.module.ts`
- Create: `packages/features/customers/src/server/index.ts`
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/openapi.ts`

**Interfaces:**
- Consumes: Task 1 customer contracts, Task 2 entities, `AuditWriter`, `RequirePermission`, current `AuthenticatedPrincipal`.
- Produces: `CustomersService.list/get/create/update/archive/listContacts/createContact/updateContact/deleteContact`.
- Produces: routes under `/api/v1/customers` guarded by `customers:read` or `customers:manage`.

- [ ] **Step 1: Write failing service and controller tests**

```ts
it("creates a customer and audit row atomically", async () => {
  const customer = await service.create({
    name: "آژانس سپهر",
    ownerUserId: actorId,
  }, actorId);
  expect(customer).toMatchObject({ name: "آژانس سپهر", status: "ACTIVE", version: 1 });
  expect(await auditRows("customers.created", customer.id)).toHaveLength(1);
});

it("maps stale customer updates to CONCURRENT_UPDATE", async () => {
  const created = await createCustomer();
  await service.update(created.id, { version: 1, name: "نسخه دوم" }, actorId);
  await expect(service.update(created.id, { version: 1, name: "نسخه سوم" }, actorId))
    .rejects.toMatchObject({ code: "CONCURRENT_UPDATE" });
});
```

Controller tests must assert metadata for `customers:read` and `customers:manage`, Zod rejection, and request actor propagation.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter @effect/customers test
pnpm --filter @effect/customers test:integration
```

Expected: FAIL because service/controller/module exports are missing.

- [ ] **Step 3: Implement customer transactions**

Use one transaction per mutation. The optimistic update must use an affected-row check:

```ts
const result = await manager.createQueryBuilder()
  .update(CustomerEntity)
  .set({ name: values.name, version: () => '"version" + 1' })
  .where("id = :id AND version = :version", { id, version: values.version })
  .execute();
if (result.affected !== 1) {
  const exists = await manager.getRepository(CustomerEntity).exist({ where: { id } });
  throw new DomainError(exists ? "CONCURRENT_UPDATE" : "CUSTOMER_NOT_FOUND",
    exists ? "اطلاعات مشتری هم‌زمان تغییر کرده است." : "مشتری پیدا نشد.");
}
```

List search covers `name`, `legal_name`, `phone`, and `email` with parameterized `ILIKE`. Contact primary replacement first clears the old primary inside the same transaction. Every mutation writes an audit action with identifiers and changed field names only.

- [ ] **Step 4: Implement controller/module/OpenAPI and verify GREEN**

Use `ZodValidationPipe`, public permission decorators, and existing `DomainExceptionFilter`; do not reproduce error-envelope mapping inside the controller. Run:

```bash
pnpm --filter @effect/customers test
pnpm --filter @effect/customers test:integration
pnpm --filter @effect/api typecheck
pnpm --filter @effect/api openapi:generate
```

Expected: all tests/typechecks pass and OpenAPI contains customer/contact routes with cookie security.

Update the explicit API build chain in `apps/api/package.json` so `@effect/customers` builds before `@effect-erp/database` and the API TypeScript compilation.

- [ ] **Step 5: Commit Task 3**

```bash
git add packages/features/customers apps/api/package.json apps/api/src/app.module.ts apps/api/src/openapi.ts apps/api/openapi.json pnpm-lock.yaml
git commit -m "feat: add customer management service"
git push origin codex/foundation-identity
```

---

### Task 4: Workspace and project service/API with membership scopes

**Files:**
- Create: `packages/features/workspaces/src/server/workspaces.service.ts`
- Create: `packages/features/workspaces/src/server/workspaces.service.test.ts`
- Create: `packages/features/workspaces/src/server/workspaces.integration.test.ts`
- Create: `packages/features/workspaces/src/server/workspaces.controller.ts`
- Create: `packages/features/workspaces/src/server/workspaces.controller.test.ts`
- Create: `packages/features/workspaces/src/server/workspaces.module.ts`
- Create: `packages/features/workspaces/src/server/index.ts`
- Create: `packages/features/projects/src/server/projects.service.ts`
- Create: `packages/features/projects/src/server/projects.service.test.ts`
- Create: `packages/features/projects/src/server/projects.integration.test.ts`
- Create: `packages/features/projects/src/server/projects.controller.ts`
- Create: `packages/features/projects/src/server/projects.controller.test.ts`
- Create: `packages/features/projects/src/server/projects.module.ts`
- Create: `packages/features/projects/src/server/index.ts`
- Modify: `packages/features/access-control/src/server/access-control.service.ts`
- Modify: `packages/features/access-control/src/server/access-control.test.ts`
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/openapi.ts`

**Interfaces:**
- Consumes: workspace/project contracts and entities, `AccessControlService.isSystemAdministrator(userId, manager?)`.
- Produces: `WorkspacesService` and `ProjectsService` CRUD/archive/member replacement APIs.
- Produces: `/api/v1/workspaces` and `/api/v1/projects` routes.

- [ ] **Step 1: Write failing access and domain tests**

```ts
it("lists only member workspaces for an ordinary user", async () => {
  await assignWorkspaceMember(firstWorkspaceId, memberId, "MEMBER");
  expect((await service.list({ page: 1, pageSize: 25, search: "" }, memberId)).items)
    .toEqual([expect.objectContaining({ id: firstWorkspaceId })]);
});

it("allows system administrators to read all workspaces", async () => {
  access.isSystemAdministrator.mockResolvedValue(true);
  expect((await service.list(defaultQuery, adminId)).meta.total).toBe(2);
});

it("rejects workspace archive while an active project exists", async () => {
  await expect(service.archive(workspaceId, { version: 1 }, actorId))
    .rejects.toMatchObject({ code: "WORKSPACE_HAS_ACTIVE_PROJECTS" });
});
```

Also test duplicate member IDs, inactive users, project date ordering, stale versions, unknown parents, audit rollback, and the `VIEWER/MEMBER/MANAGER` write rules.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter @effect/access-control test
pnpm --filter @effect/workspaces test
pnpm --filter @effect/projects test
pnpm --filter @effect/workspaces test:integration
pnpm --filter @effect/projects test:integration
```

Expected: FAIL because administrator detection and both services are missing.

- [ ] **Step 3: Implement administrator detection and scoped queries**

Add this public method without changing effective permission semantics:

```ts
async isSystemAdministrator(userId: string, manager?: EntityManager): Promise<boolean> {
  return this.repository.hasSystemSuperAdminRole(userId, manager);
}
```

Ordinary list/detail queries join membership tables. A workspace `MANAGER` can replace workspace members; a project `MANAGER` can replace project members. System administrators bypass membership. Creating a project requires workspace `MANAGER` or system administrator. Member replacement validates every user as active before delete/insert in one transaction.

Controllers additionally require `workspaces:read`/`workspaces:manage` or `projects:read`/`projects:manage`; membership checks never replace global permission checks. Update the explicit API build chain so customers, workspaces, and projects all build before database/API compilation.

- [ ] **Step 4: Implement routes/OpenAPI and verify GREEN**

Run:

```bash
pnpm --filter @effect/access-control test
pnpm --filter @effect/workspaces test
pnpm --filter @effect/projects test
pnpm --filter @effect/workspaces test:integration
pnpm --filter @effect/projects test:integration
pnpm --filter @effect/api typecheck
pnpm --filter @effect/api openapi:generate
```

Expected: all commands pass and generated OpenAPI contains workspace/project/member routes.

- [ ] **Step 5: Commit Task 4**

```bash
git add packages/features/access-control packages/features/workspaces packages/features/projects apps/api pnpm-lock.yaml
git commit -m "feat: add workspace and project services"
git push origin codex/foundation-identity
```

---

### Task 5: Permissions and environment-gated demo seed

**Files:**
- Modify: `packages/platform/config/src/env.ts`
- Modify: `packages/platform/config/src/env.test.ts`
- Modify: `packages/platform/database/src/seed.ts`
- Modify: `packages/platform/database/src/seed.test.ts`
- Create: `packages/platform/database/src/operations-seed.integration.test.ts`
- Modify: `.env.example`
- Modify: `compose.test.yml`

**Interfaces:**
- Consumes: six operations permission keys and operations entities.
- Produces: optional `SEED_DEMO_DATA: boolean`, default `false`.
- Produces: idempotent demo customer/workspace/project/member graph only when the flag is true.

- [ ] **Step 1: Write failing config and seed tests**

```ts
it("keeps operational demo data disabled by default", () => {
  expect(parseEnv(validEnv()).SEED_DEMO_DATA).toBe(false);
});

it("does not create customers without the explicit demo flag", async () => {
  await seedDatabase(source, bootstrapCredentials, { seedDemoData: false });
  expect(await source.getRepository(CustomerEntity).count()).toBe(0);
});

it("reruns the demo seed without duplicating its graph", async () => {
  await seedDatabase(source, bootstrapCredentials, { seedDemoData: true });
  await seedDatabase(source, bootstrapCredentials, { seedDemoData: true });
  expect(await source.getRepository(CustomerEntity).count()).toBe(3);
  expect(await source.getRepository(WorkspaceEntity).count()).toBe(3);
  expect(await source.getRepository(ProjectEntity).count()).toBe(4);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter @effect-erp/config test
pnpm --filter @effect-erp/database test
pnpm --filter @effect-erp/database exec vitest run --config vitest.integration.config.ts src/operations-seed.integration.test.ts
```

Expected: FAIL because the flag/options and permissions are absent.

- [ ] **Step 3: Implement permissions and idempotent seed**

Add exactly these permissions to the canonical permission seed and super-admin grant:

```ts
"customers:read", "customers:manage",
"workspaces:read", "workspaces:manage",
"projects:read", "projects:manage"
```

Parse only literal `true`/`false` for `SEED_DEMO_DATA`. Use stable UUID constants and `upsert` conflict paths for demo rows. Do not overwrite user-edited rows on rerun; insert missing records only. `compose.test.yml` may enable demo data only for the isolated acceptance profile.

- [ ] **Step 4: Verify GREEN**

Run the three commands from Step 2 again, then:

```bash
pnpm test
```

Expected: config, seed, integration, and complete unit suites pass.

- [ ] **Step 5: Commit Task 5**

```bash
git add packages/platform/config packages/platform/database .env.example compose.test.yml
git commit -m "feat: seed operations foundation safely"
git push origin codex/foundation-identity
```

---

### Task 6: Shared web API client and production application shell

**Files:**
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/lib/api-client.test.ts`
- Modify: `packages/features/auth/src/web/auth-client.ts`
- Modify: `packages/features/auth/src/web/auth-client.test.ts`
- Modify: `packages/shared/ui/src/app-shell.tsx`
- Create: `packages/shared/ui/src/app-shell.test.tsx`
- Modify: `packages/shared/ui/src/index.ts`
- Modify: `apps/web/src/app/authenticated-page.tsx`
- Modify: `apps/web/src/app/authenticated-page.test.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces: `ApiClient.request<T>(path, schema, options)` with `GET | POST | PATCH | PUT | DELETE`, CSRF, credentials, and typed `ApiError`.
- Produces: `AppShell({ children, title, permissions, user, unreadCount })`.
- Navigation entries: dashboard, customers, projects, tasks, files, notifications, and settings; unfinished routes are not linked until their delivery.

- [ ] **Step 1: Write failing client and shell tests**

```ts
it("adds the CSRF cookie to mutations but not reads", async () => {
  document.cookie = "effect_csrf=csrf-value";
  fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
  await client.request("/customers", z.object({ ok: z.literal(true) }), {
    method: "POST",
    body: { name: "سپهر" },
  });
  expect(fetchMock).toHaveBeenCalledWith("/api/v1/customers", expect.objectContaining({
    credentials: "include",
    headers: expect.objectContaining({ "x-csrf-token": "csrf-value" }),
  }));
});

it("hides customer navigation without customers:read", () => {
  render(<AppShell title="داشبورد" permissions={[]} user={user} unreadCount={0}>بدنه</AppShell>);
  expect(screen.queryByRole("link", { name: "مشتریان" })).toBeNull();
});
```

Also test active-link semantics, mobile menu button, user name, unread badge, logout callback, error envelope parsing, and retry-safe GET behavior.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter @effect/ui test
pnpm --filter @effect/web exec vitest run --config vitest.config.ts src/lib/api-client.test.ts src/app/authenticated-page.test.tsx
```

Expected: FAIL because the shared client and expanded shell props do not exist.

- [ ] **Step 3: Implement the client and shell**

Move the generic request/error/CSRF behavior out of `AuthClient` without changing auth responses. The shell must use semantic `aside`, `nav`, `header`, `main`, `button`, `aria-current="page"`, and a focus-managed mobile drawer. Keep settings links grouped separately. Do not render links to tasks/files/notifications until their feature delivery; reserve their navigation definitions in a typed array with `enabled: false`.

- [ ] **Step 4: Implement responsive styling and verify GREEN**

The content width becomes fluid with `max-width: 1440px`; sidebar is 252px desktop and a fixed drawer under 900px. Add no shadows/gradients. Run:

```bash
pnpm --filter @effect/ui test
pnpm --filter @effect/web test
pnpm --filter @effect/web typecheck
```

Expected: all UI/web tests and typecheck pass.

- [ ] **Step 5: Commit Task 6**

```bash
git add apps/web/src packages/shared/ui/src packages/features/auth/src/web
git commit -m "feat: add production operations shell"
git push origin codex/foundation-identity
```

---

### Task 7: Customer, workspace, and project pages

**Files:**
- Create: `packages/features/customers/src/web/customers-client.ts`
- Create: `packages/features/customers/src/web/customers-client.test.ts`
- Create: `packages/features/customers/src/web/customer-form.tsx`
- Create: `packages/features/customers/src/web/customer-form.test.tsx`
- Create: `packages/features/customers/src/web/index.ts`
- Create: `packages/features/workspaces/src/web/workspaces-client.ts`
- Create: `packages/features/workspaces/src/web/workspaces-client.test.ts`
- Create: `packages/features/workspaces/src/web/workspace-form.tsx`
- Create: `packages/features/workspaces/src/web/workspace-form.test.tsx`
- Create: `packages/features/workspaces/src/web/index.ts`
- Create: `packages/features/projects/src/web/projects-client.ts`
- Create: `packages/features/projects/src/web/projects-client.test.ts`
- Create: `packages/features/projects/src/web/project-form.tsx`
- Create: `packages/features/projects/src/web/project-form.test.tsx`
- Create: `packages/features/projects/src/web/index.ts`
- Create: `apps/web/src/app/customers/page.tsx`
- Create: `apps/web/src/app/customers/page.test.tsx`
- Create: `apps/web/src/app/customers/[id]/page.tsx`
- Create: `apps/web/src/app/customers/[id]/page.test.tsx`
- Create: `apps/web/src/app/workspaces/[id]/page.tsx`
- Create: `apps/web/src/app/workspaces/[id]/page.test.tsx`
- Create: `apps/web/src/app/projects/[id]/page.tsx`
- Create: `apps/web/src/app/projects/[id]/page.test.tsx`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Consumes: Task 1 contracts and Task 6 `ApiClient`.
- Produces: list/detail/create/update/archive clients and pages for all three domains.
- Pages receive authoritative permissions from `AuthenticatedPage`; they never infer permission from hidden controls.

- [ ] **Step 1: Write failing component/client tests**

```tsx
it("renders the customer empty state and opens the create drawer", async () => {
  const client = { list: vi.fn().mockResolvedValue(emptyPage), create: vi.fn() };
  render(<CustomersPageContent client={client} permissions={["customers:read", "customers:manage"]} />);
  expect(await screen.findByText("هنوز مشتری‌ای ثبت نشده است")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "مشتری جدید" }));
  expect(screen.getByRole("dialog", { name: "ایجاد مشتری" })).toBeTruthy();
});

it("does not render mutation actions for read-only members", async () => {
  render(<ProjectDetailContent client={client} permissions={["projects:read"]} projectId={projectId} />);
  expect(await screen.findByText("کمپین پاییز")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "ویرایش پروژه" })).toBeNull();
});
```

Test loading skeleton, API error with retry, search debounce, page navigation, validation fields, stale-version refresh prompt, member replacement, archive blockers, and mobile drawer close/focus restore.

Customer-detail tests also create, update, and remove contacts, verify that selecting a new primary contact clears the previous primary marker, and hide contact mutation controls without `customers:manage`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter @effect/customers test
pnpm --filter @effect/workspaces test
pnpm --filter @effect/projects test
pnpm --filter @effect/web test
```

Expected: FAIL because web clients/components/pages are missing.

- [ ] **Step 3: Implement clients and pages**

Client methods validate request and response schemas. Pages use controlled query state encoded in URL search params. Create/edit forms submit exact schema inputs and announce success through `aria-live`. Details render only real API data. Customer detail links to its workspaces/projects; workspace detail links to projects; project detail shows summary and members, with task/file sections as explicit empty states saying those modules arrive in the next delivery rather than displaying sample records.

- [ ] **Step 4: Verify UI GREEN**

Run:

```bash
pnpm --filter @effect/customers test
pnpm --filter @effect/workspaces test
pnpm --filter @effect/projects test
pnpm --filter @effect/web test
pnpm --filter @effect/web typecheck
pnpm --filter @effect/web build
```

Expected: clients, components, pages, typecheck, and production build pass.

- [ ] **Step 5: Commit Task 7**

```bash
git add packages/features/customers packages/features/workspaces packages/features/projects apps/web pnpm-lock.yaml
git commit -m "feat: connect operations foundation pages"
git push origin codex/foundation-identity
```

---

### Task 8: Real dashboard summary and page

**Files:**
- Create: `packages/shared/contracts/src/dashboard.ts`
- Create: `packages/shared/contracts/src/dashboard.test.ts`
- Modify: `packages/shared/contracts/src/index.ts`
- Create: `apps/api/src/dashboard/dashboard.service.ts`
- Create: `apps/api/src/dashboard/dashboard.service.integration.test.ts`
- Create: `apps/api/src/dashboard/dashboard.controller.ts`
- Create: `apps/api/src/dashboard/dashboard.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/openapi.ts`
- Create: `apps/web/src/app/dashboard/dashboard-client.ts`
- Create: `apps/web/src/app/dashboard/dashboard-content.tsx`
- Create: `apps/web/src/app/dashboard/dashboard-content.test.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces: `DashboardSummarySchema` with nullable `activeCustomers`, `activeWorkspaces`, `activeProjects`, `projectsDueSoon`, and `recentProjects`; a `null` metric is omitted because the caller lacks its read permission, while zero means authorized but empty.
- Produces: `DashboardService.summary(userId)` scoped to memberships unless system administrator.
- Produces: `GET /api/v1/dashboard/summary`; the service reads effective permissions, throws `403` when all three read permissions are absent, and returns `null` for each unauthorized metric section.

- [ ] **Step 1: Write failing summary tests**

```ts
it("returns zeroes from an empty operational database", async () => {
  await expect(service.summary(adminId)).resolves.toEqual({
    activeCustomers: 0,
    activeWorkspaces: 0,
    activeProjects: 0,
    projectsDueSoon: 0,
    recentProjects: [],
  });
});

it("does not leak customer counts to a project-only reader", async () => {
  access.listEffectivePermissions.mockResolvedValue(["projects:read"]);
  await expect(service.summary(memberId)).resolves.toMatchObject({
    activeCustomers: null,
    activeWorkspaces: null,
    activeProjects: 0,
  });
});

it("does not include projects outside ordinary membership", async () => {
  await createProjectGraph({ memberId, includeSecondPrivateProject: true });
  const summary = await service.summary(memberId);
  expect(summary.activeProjects).toBe(1);
  expect(summary.recentProjects).toHaveLength(1);
});
```

Component tests assert zero/empty state, loading skeleton, retry, Persian labels, and no finance/task placeholders.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter @effect-erp/contracts exec vitest run --config vitest.config.ts src/dashboard.test.ts
pnpm --filter @effect/api exec vitest run --config vitest.config.ts src/dashboard
pnpm --filter @effect/web exec vitest run --config vitest.config.ts src/app/dashboard
```

Expected: FAIL because dashboard contracts/service/content do not exist.

- [ ] **Step 3: Implement dashboard query/API/UI**

Use parameterized aggregate SQL scoped through workspace/project membership. `projectsDueSoon` means active projects with non-null `due_date` between the current database date and seven days later. `recentProjects` returns at most five records ordered by `updated_at DESC, id ASC`. The page shows one restrained KPI row and a recent-project list; omit any module not delivered yet.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
pnpm --filter @effect-erp/contracts test
pnpm --filter @effect/api test
pnpm --filter @effect/api test:integration
pnpm --filter @effect/web test
pnpm typecheck
pnpm build
```

Expected: dashboard and all existing suites/builds pass.

- [ ] **Step 5: Commit Task 8**

```bash
git add packages/shared/contracts apps/api apps/web
git commit -m "feat: add real operations dashboard"
git push origin codex/foundation-identity
```

---

### Task 9: End-to-end release gate and delivery record

**Files:**
- Create: `apps/api/test/operations-foundation.e2e-spec.ts`
- Modify: `apps/api/vitest.e2e.config.ts`
- Create: `apps/web/e2e/operations-foundation.spec.ts`
- Modify: `apps/api/openapi.json`
- Modify: `README.md`
- Modify: `docs/progress/2026-09-01-product-roadmap.md`
- Modify: `docs/superpowers/specs/2026-09-19-launch-first-operations-design.md`

**Interfaces:**
- Consumes: every prior task.
- Produces: one browser acceptance journey and one API security/rollback suite for the first vertical slice.
- Produces: exact commit/remote SHA evidence in the roadmap after push.

- [ ] **Step 1: Write the failing API and browser acceptance tests**

The API journey must create a customer, contact, workspace, members, project, update by version, reject a stale version, reject a nonmember, block invalid archive, and assert audit rows. The browser journey must:

```ts
await login(page, adminUsername, adminPassword);
await page.getByRole("link", { name: "مشتریان" }).click();
await page.getByRole("button", { name: "مشتری جدید" }).click();
await page.getByLabel("نام مشتری").fill("مشتری پذیرش");
await page.getByRole("button", { name: "ذخیره مشتری" }).click();
await expect(page.getByText("مشتری پذیرش")).toBeVisible();
await createWorkspaceAndProjectThroughDrawers(page);
await page.getByRole("link", { name: "داشبورد" }).click();
await expect(page.getByText("۱", { exact: true }).first()).toBeVisible();
```

The helper performs explicit label/role actions for workspace and project creation; it must not call internal APIs directly.

```ts
async function createWorkspaceAndProjectThroughDrawers(page: Page) {
  await page.getByRole("link", { name: "مشتری پذیرش" }).click();
  await page.getByRole("button", { name: "فضای کاری جدید" }).click();
  await page.getByLabel("نام فضای کاری").fill("فضای پذیرش");
  await page.getByRole("button", { name: "ذخیره فضای کاری" }).click();
  await page.getByRole("link", { name: "فضای پذیرش" }).click();
  await page.getByRole("button", { name: "پروژه جدید" }).click();
  await page.getByLabel("نام پروژه").fill("پروژه پذیرش");
  await page.getByRole("button", { name: "ذخیره پروژه" }).click();
  await expect(page.getByRole("heading", { name: "پروژه پذیرش" })).toBeVisible();
}
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
pnpm --filter @effect/api run build:test
pnpm --filter @effect/api exec vitest run --config vitest.e2e.config.ts test/operations-foundation.e2e-spec.ts
pnpm --filter @effect/web test:e2e -- --grep "operations foundation"
```

Expected: FAIL until the final routes/selectors/environment are wired.

- [ ] **Step 3: Fix only acceptance wiring and update docs**

Regenerate OpenAPI; document migration, `SEED_DEMO_DATA`, URLs, permissions, and empty-production behavior. Mark roadmap stages 2 and 3 complete only for customer/workspace/project scope; leave tasks/files/notifications and later modules explicitly pending. Change the spec status to `تحویل A/B تکمیل‌شده` only after every gate passes.

- [ ] **Step 4: Run the complete release gate**

Run on Node 24:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm --filter @effect/api openapi:generate
git diff --check
```

Then start a uniquely named disposable Compose project with a fresh PostgreSQL volume, run health smoke and Playwright, verify `SEED_DEMO_DATA` idempotency, and remove only that exact project and its volumes. Expected: every command exits zero and regenerated OpenAPI has no diff.

- [ ] **Step 5: Review, commit, push, and verify remote SHA**

```bash
git add apps/api apps/web README.md docs/progress docs/superpowers/specs
git commit -m "feat: deliver operations foundation"
git push origin codex/foundation-identity
git rev-parse HEAD
git ls-remote origin refs/heads/codex/foundation-identity
```

Expected: local and remote SHAs match exactly. Record the phase commit SHA in `docs/progress/2026-09-01-product-roadmap.md`, commit that documentation update, push again, and recheck the final SHA.
