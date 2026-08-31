import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Each case provisions an isolated PostgreSQL container, including on cold CI hosts.
    testTimeout: 120_000,
    hookTimeout: 60_000,
    include: ['src/**/*.integration.test.ts'],
    name: 'features-users-integration',
  },
});
