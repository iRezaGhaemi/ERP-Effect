import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/*/vitest.config.ts',
      'packages/features/*/vitest.config.ts',
      'packages/platform/*/vitest.config.ts',
      'packages/shared/*/vitest.config.ts',
    ],
  },
});
