import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "test/{access-control,password-auth,release-boundary,reset-admin}.e2e-spec.ts",
    ],
    name: "api-e2e",
    // Each file owns a PostgreSQL Testcontainer. Running them serially keeps the
    // release gate reliable on CI runners and developer machines with limited
    // Docker disk and memory budgets.
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 60_000,
  },
});
