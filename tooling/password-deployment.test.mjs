import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const cwd = new URL("../", import.meta.url);
const fixtureEnv = {
  ...process.env,
  POSTGRES_MIGRATOR_PASSWORD: "config-test-migrator-placeholder",
  POSTGRES_RUNTIME_PASSWORD: "config-test-runtime-placeholder",
  INITIAL_ADMIN_PHONE: "09121234567",
  INITIAL_ADMIN_USERNAME: "config.admin",
  INITIAL_ADMIN_PASSWORD: "Config test bootstrap phrase 123!",
  AUTH_RATE_LIMIT_SECRET: "config-test-rate-limit-secret-32-chars",
  JWT_ACCESS_SECRET: "config-test-jwt-secret-at-least-32-chars",
};

function composeConfig(file, env = fixtureEnv) {
  return JSON.parse(
    execFileSync(
      "docker",
      ["compose", "-p", "effect-task5-config-only", "-f", file, "config", "--format", "json"],
      { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  );
}

function environmentKeys(service) {
  return Object.keys(service.environment ?? {}).sort();
}

function databaseUser(url) {
  return new URL(url).username;
}

test("production Compose isolates bootstrap inputs and database authorities", () => {
  const { services } = composeConfig("compose.yml");
  assert.deepEqual(environmentKeys(services.migrate), ["DATABASE_MIGRATION_URL"]);
  assert.equal(
    databaseUser(services.migrate.environment.DATABASE_MIGRATION_URL),
    "effect_migrator",
  );
  assert.deepEqual(environmentKeys(services.seed), [
    "DATABASE_URL",
    "INITIAL_ADMIN_PASSWORD",
    "INITIAL_ADMIN_PHONE",
    "INITIAL_ADMIN_USERNAME",
  ]);
  assert.equal(databaseUser(services.seed.environment.DATABASE_URL), "effect");
  assert.deepEqual(environmentKeys(services.api), [
    "API_PORT",
    "AUTH_RATE_LIMIT_SECRET",
    "COOKIE_SECURE",
    "DATABASE_URL",
    "INTERNAL_API_URL",
    "JWT_ACCESS_SECRET",
    "NODE_ENV",
    "WEB_ORIGIN",
  ]);
  assert.equal(databaseUser(services.api.environment.DATABASE_URL), "effect");
  assert.equal(services.api.read_only, true);
  assert.equal(services.seed.read_only, true);
  assert.equal(services.migrate.read_only, true);
  assert.match(services.api.healthcheck.test.join(" "), /127\.0\.0\.1/);
  assert.match(services.web.healthcheck.test.join(" "), /127\.0\.0\.1/);
  assert.doesNotMatch(JSON.stringify(services), /otp|sms/i);
});

test("bootstrap has no usable production default while isolated test Compose owns test credentials", () => {
  const withoutBootstrap = { ...fixtureEnv };
  delete withoutBootstrap.INITIAL_ADMIN_USERNAME;
  delete withoutBootstrap.INITIAL_ADMIN_PASSWORD;
  const missing = spawnSync(
    "docker",
    ["compose", "-p", "effect-task5-config-missing", "-f", "compose.yml", "config", "--format", "json"],
    { cwd, env: withoutBootstrap, encoding: "utf8" },
  );
  assert.notEqual(missing.status, 0);

  const testConfig = composeConfig("compose.test.yml", process.env);
  assert.equal(
    testConfig.services.seed.environment.INITIAL_ADMIN_USERNAME,
    "test.admin",
  );
  assert.equal(
    testConfig.services.seed.environment.INITIAL_ADMIN_PASSWORD,
    "Isolated test bootstrap phrase 123!",
  );
  assert.equal(testConfig.volumes, undefined);
  assert.match(
    JSON.stringify(testConfig.services.postgres.volumes),
    /\/var\/lib\/postgresql\/data/,
  );
  assert.match(
    testConfig.services.api.healthcheck.test.join(" "),
    /127\.0\.0\.1:3001/,
  );
  assert.match(
    testConfig.services.web.healthcheck.test.join(" "),
    /127\.0\.0\.1:3000/,
  );
  assert.doesNotMatch(JSON.stringify(testConfig.services), /otp|sms/i);
});

test("environment example contains non-usable password-auth placeholders and no OTP or SMS inputs", () => {
  const entries = Object.fromEntries(
    readFileSync(new URL("../.env.example", import.meta.url), "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.split("=", 2)),
  );
  assert.match(entries.POSTGRES_MIGRATOR_PASSWORD, /replace/i);
  assert.match(entries.POSTGRES_RUNTIME_PASSWORD, /replace/i);
  assert.match(entries.INITIAL_ADMIN_PASSWORD, /replace/i);
  assert.match(entries.AUTH_RATE_LIMIT_SECRET, /replace/i);
  assert.match(entries.JWT_ACCESS_SECRET, /replace/i);
  assert.equal(entries.INITIAL_ADMIN_USERNAME, "replace-with-initial-admin-username");
  assert.equal(
    new URL(entries.DATABASE_MIGRATION_URL).password,
    entries.POSTGRES_MIGRATOR_PASSWORD,
  );
  assert.equal(
    new URL(entries.DATABASE_URL).password,
    entries.POSTGRES_RUNTIME_PASSWORD,
  );
  assert.doesNotMatch(JSON.stringify(entries), /otp|sms/i);
});
