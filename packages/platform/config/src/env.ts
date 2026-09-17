import { z } from "zod";

const RawEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    API_PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.url(),
    WEB_ORIGIN: z.url(),
    INTERNAL_API_URL: z.url(),
    AUTH_RATE_LIMIT_SECRET: z.string().min(32),
    JWT_ACCESS_SECRET: z.string().min(32),
    COOKIE_SECURE: z.enum(["true", "false"]).optional(),
    REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== "development" && env.COOKIE_SECURE === "false") {
      context.addIssue({
        code: "custom",
        message: "COOKIE_SECURE must be true outside development.",
        path: ["COOKIE_SECURE"],
      });
    }
  });

export const AppEnvSchema = RawEnvSchema.transform((env) => ({
  ...env,
  COOKIE_SECURE: env.COOKIE_SECURE
    ? env.COOKIE_SECURE === "true"
    : env.NODE_ENV !== "development",
}));

export type AppEnv = z.infer<typeof AppEnvSchema>;

export const MigrationEnvSchema = z.object({
  DATABASE_MIGRATION_URL: z.url(),
});

export type MigrationEnv = z.infer<typeof MigrationEnvSchema>;

export function parseEnv(input: NodeJS.ProcessEnv): AppEnv {
  return AppEnvSchema.parse(input);
}

export function parseMigrationEnv(input: NodeJS.ProcessEnv): MigrationEnv {
  return MigrationEnvSchema.parse(input);
}
