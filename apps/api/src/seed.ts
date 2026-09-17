import "reflect-metadata";

import { assertAuditDatabaseBoundary } from "@effect/audit/server";
import { createDataSource, seedInitialAccess } from "@effect-erp/database";

const databaseUrl = process.env.DATABASE_URL;
const initialAdminPhone = process.env.INITIAL_ADMIN_PHONE;
const initialAdminUsername = process.env.INITIAL_ADMIN_USERNAME;
const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
if (!databaseUrl || !initialAdminPhone)
  throw new Error("DATABASE_URL and INITIAL_ADMIN_PHONE are required.");
if (Boolean(initialAdminUsername) !== Boolean(initialAdminPassword))
  throw new Error("Initial administrator credentials must be provided together.");

const dataSource = createDataSource({ url: databaseUrl });
try {
  await dataSource.initialize();
  await assertAuditDatabaseBoundary(dataSource);
  await seedInitialAccess(
    dataSource,
    initialAdminPhone,
    initialAdminUsername && initialAdminPassword
      ? { username: initialAdminUsername, password: initialAdminPassword }
      : undefined,
  );
} finally {
  if (dataSource.isInitialized) await dataSource.destroy();
}
