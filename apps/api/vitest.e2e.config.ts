import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "test/{access-control,auth-session,otp-request,fake-sms,release-boundary}.e2e-spec.ts",
    ],
    name: "api-e2e",
    testTimeout: 120_000,
    hookTimeout: 60_000,
  },
});
