import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

export async function startPostgresContainer(): Promise<StartedTestContainer> {
  return new GenericContainer('postgres:17-alpine')
    .withEnvironment({
      POSTGRES_DB: 'effect_erp',
      POSTGRES_PASSWORD: 'effect',
      POSTGRES_USER: 'effect',
    })
    .withExposedPorts(5432)
    // PostgreSQL starts a temporary init server first; wait for the final server.
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 2))
    .start();
}
