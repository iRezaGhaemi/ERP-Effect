import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    name: 'platform-database',
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
