import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 120_000,
    hookTimeout: 60_000,
    include: ["src/**/*.integration.test.ts"],
    name: "features-projects-integration",
  },
});
