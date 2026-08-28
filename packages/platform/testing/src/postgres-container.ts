import { GenericContainer, type StartedTestContainer } from 'testcontainers';

export async function startPostgresContainer(): Promise<StartedTestContainer> {
  return new GenericContainer('postgres:17-alpine')
    .withEnvironment({
      POSTGRES_DB: 'effect_erp',
      POSTGRES_PASSWORD: 'effect',
      POSTGRES_USER: 'effect',
    })
    .withExposedPorts(5432)
    .start();
}
