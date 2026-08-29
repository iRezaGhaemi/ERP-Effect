import "reflect-metadata";

import { parseMigrationEnv } from "@effect-erp/config";
import { createDataSource } from "@effect-erp/database";

const { DATABASE_MIGRATION_URL } = parseMigrationEnv(process.env);

const dataSource = createDataSource({ url: DATABASE_MIGRATION_URL });

try {
  await dataSource.initialize();
  await dataSource.runMigrations();
} finally {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}
