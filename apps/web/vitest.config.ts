import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: false,
  esbuild: { jsx: "automatic" },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    name: 'web',
    passWithNoTests: true,
  },
});
