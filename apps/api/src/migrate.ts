import "reflect-metadata";

import { createDataSource } from "@effect-erp/database";

const url = process.env.DATABASE_URL;

if (url === undefined) {
  throw new Error("DATABASE_URL is required for migrations.");
}

const dataSource = createDataSource({ url });

try {
  await dataSource.initialize();
  await dataSource.runMigrations();
} finally {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}
