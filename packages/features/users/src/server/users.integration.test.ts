import { DataSource } from 'typeorm';
import { afterEach, describe, expect, it } from 'vitest';

import { startPostgresContainer } from '@effect-erp/testing';

import { UserEntity } from '../entities/index.js';
import { CreateUsers202608280001 } from '../../../../platform/database/src/migrations/202608280001-create-users.js';

const dataSources: DataSource[] = [];

afterEach(async () => {
  await Promise.all(dataSources.splice(0).map(async (dataSource) => dataSource.destroy()));
});

async function runFreshMigrationSuite(): Promise<void> {
  const container = await startPostgresContainer();
  const dataSource = new DataSource({
    type: 'postgres',
    host: container.getHost(),
    port: container.getMappedPort(5432),
    username: 'effect',
    password: 'effect',
    database: 'effect_erp',
    entities: [UserEntity],
    migrations: [CreateUsers202608280001],
    synchronize: false,
  });
  dataSources.push(dataSource);

  try {
    await dataSource.initialize();
    await dataSource.runMigrations();

    expect(dataSource.options.synchronize).toBe(false);
    await dataSource.query(
      `INSERT INTO users (phone, "firstName", "lastName") VALUES ($1, $2, $3)`,
      ['+989121234567', 'رضا', 'قایمی'],
    );
    await expect(
      dataSource.query(
        `INSERT INTO users (phone, "firstName", "lastName") VALUES ($1, $2, $3)`,
        ['+989121234567', 'رضا', 'دوم'],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  } finally {
    await dataSource.destroy();
    const index = dataSources.indexOf(dataSource);
    if (index >= 0) dataSources.splice(index, 1);
    await container.stop();
  }
}

describe('users migration', () => {
  it('creates the users schema from an empty database twice', async () => {
    await runFreshMigrationSuite();
    await runFreshMigrationSuite();
  });
});
