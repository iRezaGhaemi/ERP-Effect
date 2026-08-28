import { z } from 'zod';

const RawEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.url(),
    WEB_ORIGIN: z.url(),
    INTERNAL_API_URL: z.url(),
    OTP_PEPPER: z.string().min(32),
    JWT_ACCESS_SECRET: z.string().min(32),
    SMS_PROVIDER: z.enum(['console', 'fake', 'http']).default('console'),
    SMS_HTTP_URL: z.preprocess((value) => (value === '' ? undefined : value), z.url().optional()),
    SMS_HTTP_TOKEN: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(1).optional(),
    ),
    INITIAL_ADMIN_PHONE: z.string().min(1),
    COOKIE_SECURE: z.enum(['true', 'false']).optional(),
    OTP_TTL_SECONDS: z.coerce.number().int().positive().default(120),
    OTP_RESEND_SECONDS: z.coerce.number().int().positive().default(60),
    REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV === 'production' && env.SMS_PROVIDER !== 'http') {
      context.addIssue({
        code: 'custom',
        message: 'SMS_PROVIDER must be http in production.',
        path: ['SMS_PROVIDER'],
      });
    }

    if (env.NODE_ENV !== 'development' && env.COOKIE_SECURE === 'false') {
      context.addIssue({
        code: 'custom',
        message: 'COOKIE_SECURE must be true outside development.',
        path: ['COOKIE_SECURE'],
      });
    }

    if (env.SMS_PROVIDER === 'http' && !env.SMS_HTTP_URL) {
      context.addIssue({
        code: 'custom',
        message: 'SMS_HTTP_URL is required when SMS_PROVIDER is http.',
        path: ['SMS_HTTP_URL'],
      });
    }

    if (env.SMS_PROVIDER === 'http' && !env.SMS_HTTP_TOKEN) {
      context.addIssue({
        code: 'custom',
        message: 'SMS_HTTP_TOKEN is required when SMS_PROVIDER is http.',
        path: ['SMS_HTTP_TOKEN'],
      });
    }
  });

export const AppEnvSchema = RawEnvSchema.transform((env) => ({
  ...env,
  COOKIE_SECURE: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : env.NODE_ENV !== 'development',
}));

export type AppEnv = z.infer<typeof AppEnvSchema>;

export function parseEnv(input: NodeJS.ProcessEnv): AppEnv {
  return AppEnvSchema.parse(input);
}
