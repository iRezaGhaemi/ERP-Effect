import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/{csrf-guard,health,identity,migrate}.e2e-spec.ts"],
    name: "api-unit",
  },
});
