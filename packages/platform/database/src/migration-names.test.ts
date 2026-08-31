import {
  MigrationExecutor,
  type Migration,
  type MigrationInterface,
} from "typeorm";
import { expect, it } from "vitest";

import { createDataSource } from "./data-source.js";

it("TypeORM accepts every registered migration and preserves its execution order", () => {
  const source = createDataSource({
    url: "postgres://unused:unused@localhost/unused",
  });
  source.migrations.push(
    ...(source.options.migrations as Array<new () => MigrationInterface>).map(
      (MigrationClass) => new MigrationClass(),
    ),
  );
  // Characterize the installed executor's timestamp parsing without a database.
  const executor = new MigrationExecutor(source) as unknown as {
    getMigrations(): Migration[];
  };
  const migrations = executor.getMigrations();
  expect(migrations).toHaveLength(9);
  expect(migrations.map(({ name }) => name)).toEqual(
    source.migrations.map(({ name }) => name),
  );
  expect(new Set(migrations.map(({ timestamp }) => timestamp)).size).toBe(9);
  expect(
    migrations.every(({ timestamp }) => timestamp >= Date.UTC(2026, 7, 28)),
  ).toBe(true);
});
