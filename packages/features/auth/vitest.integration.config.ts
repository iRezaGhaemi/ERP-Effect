import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@effect/auth/entities": fileURLToPath(
        new URL("./src/entities/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    // Each case provisions an isolated PostgreSQL container, including on cold CI hosts.
    testTimeout: 120_000,
    hookTimeout: 60_000,
    include: ["src/**/*.integration.test.ts"],
    name: "features-auth-integration",
  },
});
