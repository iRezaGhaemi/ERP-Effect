# Password Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace OTP with administrator-provisioned username/password accounts, forced initial changes, secure resets and preserved authorization/session/audit behavior.

**Architecture:** Keep the modular monolith. Users owns credential validation, hashing and persistence; auth coordinates verification, password lifecycle, permissions and sessions. Additive credential schema precedes the final OTP cutover migration. Intermediate task commits are not a delivered stage; push only after the complete stage passes acceptance.

**Tech Stack:** Node 24, TypeScript, Next.js, NestJS, TypeORM/PostgreSQL, Node crypto.scrypt, pnpm, Docker, Vitest, Playwright and the existing prototype build.

**Spec:** `docs/superpowers/specs/2026-09-01-password-auth-design.md` (approved by the user's instruction to execute the stages).

## Global Constraints

- Single-company application; no public registration, email recovery, SMS or OTP login.
- Preserve user UUIDs, roles, permission assignments and audit history. No production deployment or database operation is authorized.
- Existing linked worktree: `codex/foundation-identity`. Preserve the existing IPv4 Compose healthcheck fix and smoke tests.
- Username: 3–64 ASCII characters, leading letter, subsequent letters/digits/dot/hyphen/underscore; trim and lowercase before storage and lookup.
- Password: NFC Unicode, 15–128 code points for new credentials, no trimming/digit conversion/composition rule; reject repeated-character and a documented local set of common weak passwords. Verification accepts existing input up to the same maximum without applying the new-password blocklist.
- `scrypt`: N=32768, r=8, p=3, maxmem=64 MiB, random 16-byte salt, 64-byte key, strict versioned encoding, timing-safe comparison. At most 2 active hashes and 8 queued per process.
- Temporary credentials expire after 24 hours; restricted login sessions expire within 10 minutes and cannot refresh or access normal APIs.
- Reuse HttpOnly cookies, Origin/CSRF, refresh rotation and append-only audit. No secret in API responses, browser storage, logs, committed files or images.
- Credential changes increment `credentialVersion`, invalidate prior access/refresh sessions, and require transactional audit. Consistent user -> session -> refresh lock order; sort multiple users by UUID.
- Login rate limits: 5 attempts/username/15 minutes and 30/IP/15 minutes. Change/reset: 5 attempts/actor/15 minutes. Database-backed buckets with a distinct `AUTH_RATE_LIMIT_SECRET` and Retry-After on 429.
- Administrator reset requires `users:credentials:manage`, current administrator password and a full session; a delegated manager cannot reset a system super-admin. No self-reset through the admin endpoint; no implicit activation of suspended users.
- Seed never overwrites existing credentials or reactivates a suspended account. Bootstrap secrets are supplied only to the seed job; no shared default password.
- Keep historic migration files unchanged. Current runtime OTP entities/workers/providers/routes/test SMS endpoint are removed at cutover, not silently left enabled.
- Messenger removal is a separate completed plan; do not reintroduce chat. Task comments and notifications stay.
- Use test-first changes and exact-file commits. Each task has focused tests and a review. Full phase acceptance precedes the phase push; no force push.

## File/contract map

- `users/contracts/credential.schemas.ts`: browser-safe username/new-password/current-password and administrator payload validation.
- `users/server/password-hasher.ts` and `password-work-queue.ts`: server-only crypto and bounded work scheduling.
- `users/server/user-credentials.service.ts`: credential-aware selects, locks and mutations using a caller's EntityManager.
- `auth/server/password-auth.service.ts`: login, self-change, administrator setup/reset; auth controller holds HTTP concerns only.
- `auth/server/auth-cookies.ts`: existing cookie response mechanics extracted for reuse by login/change/refresh.
- `auth/server/allow-password-change.decorator.ts`: explicit restricted-session allowlist metadata.
- Two new migrations: `202609010010-add-password-credentials.ts` (schema only) and `202609010011-retire-otp.ts` (cutover/invalidation/removal).
- `auth/web/login-form.tsx`, `change-password-form.tsx`, `credential-admin-form.tsx`: focused forms, using typed clients; keep current design tokens.
- `apps/api/src/reset-admin.ts`: explicit operator recovery entry point, never a public controller.

### Task 1: Credential primitives and a reliable unit-test baseline

**Files:** Create `packages/features/users/src/contracts/credential.schemas.ts`, `packages/features/users/src/contracts/credential.schemas.test.ts`, `packages/features/users/src/server/password-hasher.ts`, `packages/features/users/src/server/password-work-queue.ts`, `packages/features/users/src/server/password-hasher.test.ts`. Modify users contracts/server barrel exports, `packages/platform/logger/src/logger.ts` and its test, `packages/features/access-control/src/server/access-control-migration.test.ts`, `packages/features/auth/src/server/otp-migration.test.ts`, `turbo.json`.

**Interfaces:**

```ts
// Export from @effect/users/contracts; old user creation remains unchanged in this task.
export const UsernameSchema: z.ZodType<string>;
export const PasswordInputSchema: z.ZodType<string>; // NFC, 1..128 code points; no strength rule
export const NewPasswordSchema: z.ZodType<string>; // NFC, 15..128 + local weak-password rules
export const CreateCredentialsSchema: z.ZodType<{ username: string; initialPassword: string }>;
export const SetupCredentialsSchema: z.ZodType<{ username: string; initialPassword: string; actorPassword: string }>;
export const ResetPasswordSchema: z.ZodType<{ newPassword: string; actorPassword: string }>;
export const ChangePasswordSchema: z.ZodType<{ currentPassword: string; newPassword: string }>;
// Export server-only; exactly one default queue shared by all callers in a process.
export class PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, encoded: string): Promise<boolean>;
}
export const passwordHasher: PasswordHasher;
// Queue exhaustion throws DomainError("PASSWORD_HASH_BUSY", Persian temporary-unavailable message).
```

- [ ] **Step 1 — RED contracts and real hashing.** Write table-driven invalid username tests and Unicode/length/weak-password tests, plus real hash/verify tests:

```ts
expect(UsernameSchema.parse(' Reza.Ghaemi ')).toBe('reza.ghaemi');
expect(NewPasswordSchema.parse('  رمز بلند فارسی من  ')).toBe('  رمز بلند فارسی من  ');
expect(NewPasswordSchema.safeParse('a'.repeat(15)).success).toBe(false);
const one = await passwordHasher.hash('A long test passphrase!');
const two = await passwordHasher.hash('A long test passphrase!');
expect(one).not.toBe(two);
expect(await passwordHasher.verify('A long test passphrase!', one)).toBe(true);
expect(await passwordHasher.verify('Another test passphrase!', one)).toBe(false);
expect(await passwordHasher.verify('A long test passphrase!', 'scrypt$huge$bad')).toBe(false);
```

Test actual saturation with 11 immediate hash calls: at most 10 admitted (2 running, 8 queued), overflow rejects with the documented domain error, all admitted work settles, and a subsequent call succeeds. Avoid timing-duration assertions and mocks of cryptography. Run `pnpm --filter @effect/users exec vitest run --config vitest.config.ts src/contracts/credential.schemas.test.ts src/server/password-hasher.test.ts`; record the missing-behavior RED output before implementing.

- [ ] **Step 2 — Implement small primitives.** Use `z.string().transform(v => v.normalize('NFC'))` and code-point refinements for passwords; username uses `trim().toLowerCase()` plus `/^[a-z][a-z0-9._-]{2,63}$/`. Store `$scrypt$v1$32768$8$3$<base64url-salt>$<base64url-key>`; strict-decode lengths, canonical encoding and profile before KDF. Derive with asynchronous Node `scrypt`, release queue capacity in `finally`, and compare equal-length buffers with `timingSafeEqual`. Put only browser-safe schemas in contracts. Export crypto only from the server barrel.
- [ ] **Step 3 — RED/GREEN logging.** Extend existing nested-secret tests with all password fields, hash, bootstrap secret and rate-limit secret; prove literal test secrets appear before the fix and disappear afterwards while non-secret fields remain. Add corresponding redact entries, including arrays and error/custom-instance paths supported by the current logger.
- [ ] **Step 4 — Repair known baseline evidence, not migrations.** Current `pnpm test` fails because access-control and OTP migration tests assert pre-correction names. Remove the obsolete exact-name assertions; the existing `packages/platform/database/src/migration-names.test.ts` exercises TypeORM's real parser for names/order. Preserve every SQL/constraint assertion. Do not revert the valid timestamp metadata or SQL. Set Turbo `test.outputs` to `[]` because these scripts do not produce coverage; leave test coverage semantics unchanged.
- [ ] **Step 5 — Verify and commit.** Run users tests/build, logger tests, access-control tests, auth migration tests, then `pnpm test`; inspect and record any independently discovered baseline failure. Run `git diff --check`; commit exact task files as `feat: add password credential validation and hashing`. Do not claim login conversion is complete.

### Task 2: Add credential persistence without cutting over existing login

**Files:** Modify `packages/features/users/src/entities/user.entity.ts`, users server module/barrel; create `packages/features/users/src/server/user-credentials.service.ts`, its unit and integration tests, `packages/platform/database/src/migrations/202609010010-add-password-credentials.ts`; modify database migration registration and migration-name test. Update migration arrays in users/access-control/audit/auth integration fixtures and API fixture setup only where those fixtures select `UserEntity` with the new columns.

**Interfaces:**

```ts
// UserEntity additions (explicit snake_case SQL names, defaults for legacy rows):
username: string | null;
passwordHash: string | null; // select:false
mustChangePassword: boolean;
temporaryPasswordExpiresAt: Date | null;
passwordChangedAt: Date | null;
credentialVersion: number;

export class UserCredentialsService {
  findByUsername(username: string, manager?: EntityManager): Promise<UserEntity | null>; // explicit hash select
  lockById(id: string, manager: EntityManager): Promise<UserEntity | null>; // includes hash
  setTemporary(user: UserEntity, username: string, hash: string, manager: EntityManager): Promise<UserEntity>;
  setPermanent(user: UserEntity, hash: string, manager: EntityManager): Promise<UserEntity>;
}
```

- [ ] **Step 1 — RED upgrade and persistence.** On a disposable PostgreSQL instance migrate through 009, create a legacy user with a role and audit row, apply 010, and assert UUID/role/audit are unchanged and credential fields indicate pending setup. Attempt duplicate normalized usernames and partial credential rows and expect PostgreSQL constraint violations. Assert a normal repository find does not return `passwordHash`, while explicit credential lookup can verify it.
- [ ] **Step 2 — Add migration/entity.** Use a 13-digit epoch-suffixed migration `name` following the existing parser regression. Add nullable username/hash, nonnegative version default 0, must-change default true, dates, a unique username index, canonical username CHECK, paired-null credentials CHECK and temporary/permanent date consistency CHECK. Do not drop OTP or invalidate sessions yet. Register migration in order and update expected count to 10.
- [ ] **Step 3 — Add repository operations.** `setTemporary` canonicalizes username, increments version, sets `mustChangePassword=true`, assigns 24-hour expiry and changed timestamp. `setPermanent` increments version, sets false, clears temporary expiry. Both use the provided manager and return saved entities; neither logs secrets, opens an independent transaction, activates users, grants roles, or revokes sessions. Orchestration/audit/revocation belong to Task 3. A username may only be initially assigned or retained; conflicting assignment is rejected.
- [ ] **Step 4 — Verify fixtures and commit.** Update only full-entity fixture migration lists requiring the added columns; keep historical schema-only tests historical. Run focused real PostgreSQL upgrade/service tests, affected integration packages, users build and migration-parser test. Commit as `feat: add persistent password credentials` after diff-check and self-review.

### Task 3: Replace the authentication API and enforce the full password lifecycle

**Files:** Create `packages/features/auth/src/server/password-auth.service.ts`, `credential-admin.controller.ts`, `auth-cookies.ts`, `allow-password-change.decorator.ts`, `packages/features/auth/src/contracts/password.schemas.ts`, password service/HTTP/integration tests; modify auth module/options/controller/session/token/guard/rate-limit, users controller/service as needed for credential account creation, shared principal contracts, auth session entity, env config/tests, API CSRF/Origin error mapping. Create `packages/platform/database/src/migrations/202609010011-retire-otp.ts`, register it and update entity registry. Remove runtime OTP/SMS modules and their obsolete service tests; keep historical migrations and SQL regression coverage. Update `apps/api/src/test-support/test-app.module.ts`, remove fake SMS controller, and update API E2E fixtures away from OTP. Keep interfaces introduced in Tasks 1–2 intact.

**Interfaces:**

```ts
export class PasswordAuthService {
  login(input: {username: string; password: string}, context: RequestContext): Promise<AuthResult>;
  changePassword(actorId: string, input: {currentPassword: string; newPassword: string}, context: RequestContext): Promise<AuthResult>;
  setupCredentials(actorId: string, userId: string, input: {username: string; initialPassword: string; actorPassword: string}, context: RequestContext): Promise<void>;
  resetPassword(actorId: string, userId: string, input: {newPassword: string; actorPassword: string}, context: RequestContext): Promise<void>;
}
// HTTP: POST /auth/login, /auth/password/change, /users/:id/credentials, /users/:id/password/reset.
// AuthResult retains tokens internally; public body is { user, sessionId }.
// User response adds username:null|string, credentialsReady:boolean, mustChangePassword:boolean.
// Extend AuthenticatedPrincipal with credentialVersion:number and mustChangePassword:boolean.
```

- [ ] **Step 1 — RED real HTTP lifecycle.** Add an API suite with fresh database and credentials from Tasks 1–2; no fake SMS endpoint. Verify login 200, bad/unknown/suspended/pending/expired 401 with identical `INVALID_CREDENTIALS`, malformed input 422, rate-limit 429 and integer Retry-After. Example core journey:

```ts
const login = await request(app.getHttpServer()).post('/api/v1/auth/login')
  .set('Origin', webOrigin).send({username: 'admin.test', password: initialPassword});
expect(login.status).toBe(200);
expect(login.body.user.mustChangePassword).toBe(true);
const cookies = login.headers['set-cookie'];
expect((await request(app.getHttpServer()).get('/api/v1/users').set('Cookie', cookies)).status).toBe(403);
// Build x-csrf-token from the returned effect_csrf cookie, never hardcode a valid token.
const changed = await changeWithCookies(cookies, initialPassword, personalPassword);
expect(changed.status).toBe(200);
expect(changed.body.user.mustChangePassword).toBe(false);
expect((await request(app.getHttpServer()).get('/api/v1/me').set('Cookie', cookies)).status).toBe(401);
```

Define `changeWithCookies` locally in the test utility to POST `/auth/password/change` with Origin, decoded CSRF cookie header and actual session cookies. Verify cookie flags, no returned hash/token, reset invalidation, actor password rejection, permission rejection, protection of super-admin, self-reset denial, suspended target staying suspended and rollback on audit failure.

- [ ] **Step 2 — Implement login and sessions.** Normalize/validate inputs, consume shared PostgreSQL limits before KDF, use a valid dummy hash for unknown/unusable accounts, verify hash outside transaction, then lock/recheck the user hash/version/status/expiry before `createForLogin`. Add credential version to sessions/JWT and validate it in guards/refresh. Restrict temporary-session expiry to 10 minutes; allow only explicitly marked me/change/logout handlers and reject refresh for restricted accounts. Factor existing cookie helpers into one module; retain Origin and CSRF protection. Public login replaces only old OTP paths in CSRF exceptions. Return error envelopes without input echoing.
- [ ] **Step 3 — Implement credential mutations and authorization.** Lock actor/target in sorted UUID order, validate full session, latest permissions/system-admin status and actor credential snapshot, then mutate through `UserCredentialsService`, revoke all target sessions/refresh tokens and append audit in one transaction. Self-change verifies current password, rejects reuse, issues a new full session transactionally. Add `users:credentials:manage` catalog grant for system super-admin only. Public user creation uses an explicitly named `CreatePasswordUserSchema` extending existing profile schema with `CreateCredentialsSchema`; keep the internal profile-only creation helper for fixture/bootstrap use, not an alternate HTTP bypass. Response DTOs explicitly map non-secret fields. Add a credential-aware user DTO schema for Task 4 without silently defaulting absent security flags.
- [ ] **Step 4 — Cut over runtime and database.** Migration 011 adds session credential version, extends revocation reasons with `AUTH_METHOD_CHANGED`, `PASSWORD_CHANGED`, `PASSWORD_RESET`, invalidates existing sessions/refresh tokens and drops OTP outbox/challenge tables and their old bucket scopes. Keep rate_limit_buckets. Remove OTP entities from registry, services/providers from module and server exports, and test-only SMS controller/composition. All runtime configuration uses `AUTH_RATE_LIMIT_SECRET` and existing JWT/session/cookie settings; bootstrap inputs are validated in the seed entry point, not required by every API process. Keep historical migrations unchanged.
- [ ] **Step 5 — Race/security verification and commit.** Add deterministic barrier-based integration tests for login/reset and refresh/reset so old verified credentials cannot create valid sessions after reset. Use user -> session -> refresh lock order in all affected paths, including logout/session revocation, to avoid introducing inverse ordering. Run auth unit/integration, API E2E and affected access-control tests; update their credential fixture data rather than keeping OTP bypasses. Update the metadata-count regression to 11. Commit as `feat: replace OTP authentication with password lifecycle` only after focused checks pass; the web and deployment integration remain Tasks 4–6.

### Task 4: Wire real login, password change and administrator account forms

**Files:** Modify `packages/features/auth/src/web/auth-client.ts`, login/session components and tests; create change-password and credential-admin forms/tests; update users form/client/table/tests, `apps/web/src/app/login/page.tsx`, `apps/web/src/app/settings/users/page.tsx` and its test, dashboard/roles/audit/session pages as needed for restricted-user redirects, `apps/web/src/proxy.ts` and its test, shared AppShell menu. Create `apps/web/src/app/change-password/page.tsx`. Keep existing visual design.

**Interfaces:**

```ts
AuthClient.login(input: {username:string; password:string}): Promise<AuthSessionResponse>;
AuthClient.changePassword(input: {currentPassword:string; newPassword:string}): Promise<AuthSessionResponse>;
AuthClient.setupCredentials(id:string, input: SetupCredentialsInput): Promise<void>;
AuthClient.resetPassword(id:string, input: ResetPasswordInput): Promise<void>;
// Remove requestOtp/verifyOtp and unused OTP client contracts when no consumer remains.
```

- [ ] **Step 1 — RED component/client behavior.** Test typing username/password and submission, disabled pending state, generic failure, password reveal, no OTP inputs, and navigating a temporary user to `/change-password`. Test change confirmation mismatch prevents request, incorrect current password remains on form, successful change clears inputs and navigates. Test admin setup/reset visibility by permission, required actor password, pending-account status and no secret reuse after save.
- [ ] **Step 2 — Implement typed forms/client.** Consume Task 3's credential-aware response schema, create account payload and password endpoints. Use the existing CSRF-bearing request helper for mutations. Use `autocomplete=username`, `current-password` and `new-password` appropriately. Forms clear secret fields after success and never put them in URLs/storage/toasts. User creation requires both permissions; detail view offers setup for pending credentials and reset for prepared accounts. Preserve current roles/overrides/status operations.
- [ ] **Step 3 — Route enforcement UX.** Add `/change-password` to protected proxy matcher, use `/me` security flags for redirects in protected pages, and keep the server as authority. The self-change page is usable after initial enrollment too. Login with an expired/stale cookie reaches recovery without an infinite dashboard/login redirect. Failed refresh caused by required change must not automatically grant or bypass a full session.
- [ ] **Step 4 — Test and commit.** Run users/auth web Vitest suites, Next proxy/page suites, `pnpm typecheck` and web build. Update public DTO fixture fields consistently; do not weaken schemas to fit old fixtures. Commit as `feat: add password login and account management screens`.

### Task 5: Bootstrap, operator recovery and deployment integration

**Files:** Modify `packages/platform/database/src/seed.ts`, seed tests, `apps/api/src/seed.ts`, API scripts/build/tests, `compose.yml`, `compose.test.yml`, `.env.example`, `apps/api/Dockerfile`, CI environment setup and `README.md` current operations instructions. Create `apps/api/src/reset-admin.ts` and tests. Preserve the existing IPv4 health probes and include their smoke test in this phase's committed files after verification.

**Interfaces:**

```ts
type InitialCredentials = {username: string; password: string};
seedInitialAccess(dataSource: DataSource, initialAdminPhone: string, credentials?: InitialCredentials): Promise<void>;
// Credentials required only when initial account lacks them; never overwrite an existing password.
// Operator CLI: pnpm --filter @effect/api reset-admin -- --user-id <uuid>
// Secret comes from hidden terminal prompt or a deliberately provided secret file/stdin, never argv.
```

- [ ] **Step 1 — RED seed/recovery tests.** Run real database cases for fresh bootstrap, upgrade of existing system-admin without credentials, repeated seed preserving changed password/expiry/status, username collision, non-admin matching phone rejection and missing secret failure. Recovery tests require explicit existing super-admin UUID, no activation/grants, temporary expiry, version bump, old-session invalidation and audit.
- [ ] **Step 2 — Implement safe bootstrap.** Validate bootstrap username/password at the seed boundary with Task 1 schemas. Seed catalog and system role without reactivating suspended accounts or replacing configured credentials. Only the matched initial system-admin may receive first credentials; fail closed for an unrelated existing account. Expose no credentials in return values or logs.
- [ ] **Step 3 — Implement explicit operator recovery.** Parse/validate UUID, obtain secret without terminal echo, open the intended runtime data source, assert audit boundary, and apply credential reset/revocation/audit atomically after verifying system-admin membership. No public route, startup hook or environment-triggered automatic reset. Preserve suspended state. Ensure secret never appears in argv/output or exceptions.
- [ ] **Step 4 — Wire Docker/config/CI.** Replace OTP/SMS env with AUTH_RATE_LIMIT_SECRET; pass INITIAL_ADMIN_USERNAME/PASSWORD only to seed. `.env.example` has placeholders, not a usable common password; test Compose has clearly isolated fixture credentials and temporary volumes. Test compose/services no longer expose or depend on fake SMS. Keep API/web non-root runtime and restricted database connection. Update generated OpenAPI and runtime boundary tests for absence of test routes and OTP endpoints.
- [ ] **Step 5 — Verify and commit.** Run seed/recovery tests, API runtime smoke, env validation tests, Docker config checks, build/test images and a fresh disposable Compose startup with migrations/seed. Verify seed repeat and health endpoints. Never run test migrations against the existing dev volume. Commit as `feat: provision and recover password-based administrator accounts`.

### Task 6: Remove prototype OTP and deliver verified Stage 1

**Files:** Modify `src/16-auth.js` and only auth-related hooks/styles in `src/15-shell.js`, `src/26-boot.js`, `src/03-modules.css`; update `.testenv/smoke.js`, relevant authentication assertions in `.testenv/qa24.js`, `.testenv/ui-regressions.test.js`; regenerate `effect-erp.html`; update `apps/web/e2e/identity.spec.ts`, release/identity/security API E2E, `.github/workflows/ci.yml`, `README.md` and `docs/progress/2026-09-01-product-roadmap.md`. Historical OTP spec/progress is retained but clearly superseded by current docs.

- [ ] **Step 1 — RED prototype behavior.** Test the login form has labeled username/password inputs, no OTP step, and displays a demo-only warning. Demo entry uses explicit non-secret example credentials or the existing quick-demo button and never stores input as a real account password. Test mismatched demo input shows an error, valid example enters dashboard, and user-supplied strings do not become executable HTML. Keep messenger absence regression and task comment coverage.
- [ ] **Step 2 — Remove demo OTP.** Replace phone/code/cooldown state/functions, obsolete OTP binding hooks and SMS copy with the password-form simulation. Keep the existing two-column visual layout and accessible labels. Update smoke to exercise the new demo login; do not bypass auth just to keep tests green. Rebuild HTML.
- [ ] **Step 3 — Real browser acceptance.** On a freshly bootstrapped disposable web/API stack: admin initial login -> forced change -> create ordinary user -> user first login/change -> administrator reset -> old password rejected -> new temporary password forces another change -> old sessions rejected. Include roles/overrides/suspension/session/audit journeys and verify hidden raw password values never appear in rendered account summaries. Fix the known user-details selector by clicking its actual accessible details button, not user text.
- [ ] **Step 4 — Ordered full gate.** Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build`, `./build.sh`, `npm test --prefix .testenv`, applicable prototype browser QA, OpenAPI drift check, Docker smoke and `git diff --check`. Record exact outputs and limitations. All data tests use disposable databases; stop only this phase's test containers and preserve unrelated services/volumes.
- [ ] **Step 5 — Final review and stage commit.** Review the phase's cumulative diff and resolve critical/important findings. Commit tested source/docs/generated artifacts as `feat: complete password authentication stage`. Mark Stage 1 complete in roadmap only with evidence; list partial future stages honestly.
- [ ] **Step 6 — Push as explicitly requested.** Controller runs non-force push to origin/codex/foundation-identity, using the already configured GitHub credentials without printing tokens. Compare `git rev-parse HEAD` and `git ls-remote origin refs/heads/codex/foundation-identity`; record the matching SHA in the roadmap/status report. No merge to main or production deployment. Continue to Stage 2 after successful delivery.
