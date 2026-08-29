import "reflect-metadata";

import { assertAuditDatabaseBoundary } from "@effect/audit/server";
import { createDataSource, seedInitialAccess } from "@effect-erp/database";

const databaseUrl = process.env.DATABASE_URL;
const initialAdminPhone = process.env.INITIAL_ADMIN_PHONE;
if (!databaseUrl || !initialAdminPhone)
  throw new Error("DATABASE_URL and INITIAL_ADMIN_PHONE are required.");

const dataSource = createDataSource({ url: databaseUrl });
try {
  await dataSource.initialize();
  await assertAuditDatabaseBoundary(dataSource);
  await seedInitialAccess(dataSource, initialAdminPhone);
} finally {
  if (dataSource.isInitialized) await dataSource.destroy();
}
