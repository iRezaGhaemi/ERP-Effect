# Foundation / identity development checkpoint

## Latest product decision

The user replaced OTP authentication with **username and password login** and requested that current progress be pushed to Git. OTP development and the old release-gate execution were stopped. The current code still contains OTP; credential-based login has not been implemented. This checkpoint must not be treated as a production-ready release.

The replacement should preserve the existing single-company architecture, user administration, RBAC, sessions, audit, same-origin routing, and CSRF/Origin protections. The new credential lifecycle and removal/migration of OTP code need a revised design before implementation.

## Preserved progress

- Modular pnpm workspace: Next.js web, NestJS API, PostgreSQL/TypeORM, shared contracts and feature packages.
- Users, roles, permissions, user overrides, session management, audit history, and their administration UI.
- In-progress release tooling: CI, Docker/Compose, test-only API composition, browser journey, typed lint, runtime packaging, and documentation.
- Migration execution names corrected for TypeORM's timestamp format.
- PostgreSQL UPDATE-returning result handling corrected in the OTP worker; retained as part of the current checkpoint, pending removal of OTP through the revised auth design.

## Verification before interruption

Focused results recorded during development: migration regression, real users/audit/access-control integration tests, OTP worker unit tests (17), real worker tests (6), API unit tests (15), compiled test-only endpoint boundaries, lint, native offline Docker builds, pruned runtime/browser entry smoke, and unchanged generated OpenAPI.

The Docker test stack started successfully with separate migration and seed jobs. The last browser attempt reached login and role/user creation, then timed out because the fixture clicked the user text rather than the existing details button. This test selector has **not** been fixed. The full ordered acceptance suite and final whole-branch review have **not** completed. CI may therefore report failures on this development branch.

CRM, finance, tasks, leave, messenger, and business reports remain prototype-only. No production database or server was migrated or deployed.
