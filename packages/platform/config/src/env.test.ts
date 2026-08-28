import { describe, expect, it } from 'vitest';

import { parseEnv } from './index.js';

const baseEnv = {
  NODE_ENV: 'development',
  API_PORT: '3001',
  DATABASE_URL: 'postgres://effect:effect@localhost:5432/effect_erp',
  WEB_ORIGIN: 'http://localhost:3000',
  INTERNAL_API_URL: 'http://localhost:3001',
  OTP_PEPPER: 'o'.repeat(32),
  JWT_ACCESS_SECRET: 'j'.repeat(32),
  SMS_PROVIDER: 'console',
  INITIAL_ADMIN_PHONE: '09121234567',
};

describe('parseEnv', () => {
  it('rejects an unsafe production SMS provider', () => {
    expect(() => parseEnv({ ...baseEnv, NODE_ENV: 'production', SMS_PROVIDER: 'console' }))
      .toThrow(/SMS_PROVIDER/);
  });

  it.each(['OTP_PEPPER', 'JWT_ACCESS_SECRET'] as const)(
    'rejects a %s shorter than 32 characters',
    (key) => {
      expect(() => parseEnv({ ...baseEnv, [key]: 'x'.repeat(31) })).toThrow(key);
    },
  );

  it('rejects a missing DATABASE_URL', () => {
    const { DATABASE_URL: _databaseUrl, ...withoutDatabaseUrl } = baseEnv;

    expect(() => parseEnv(withoutDatabaseUrl)).toThrow(/DATABASE_URL/);
  });

  it.each(['console', 'fake'] as const)(
    'rejects the %s provider in production',
    (SMS_PROVIDER) => {
      expect(() => parseEnv({ ...baseEnv, NODE_ENV: 'production', SMS_PROVIDER })).toThrow(
        /SMS_PROVIDER/,
      );
    },
  );

  it('accepts the http provider in production when its credentials are configured', () => {
    const env = parseEnv({
      ...baseEnv,
      NODE_ENV: 'production',
      SMS_PROVIDER: 'http',
      SMS_HTTP_URL: 'https://sms.example.com/send',
      SMS_HTTP_TOKEN: 'sms-token',
    });

    expect(env.SMS_PROVIDER).toBe('http');
  });

  it('accepts empty optional HTTP settings for the console provider', () => {
    const env = parseEnv({ ...baseEnv, SMS_HTTP_URL: '', SMS_HTTP_TOKEN: '' });

    expect(env.SMS_HTTP_URL).toBeUndefined();
    expect(env.SMS_HTTP_TOKEN).toBeUndefined();
  });

  it('rejects production configuration that disables secure cookies', () => {
    expect(() =>
      parseEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        SMS_PROVIDER: 'http',
        SMS_HTTP_URL: 'https://sms.example.com/send',
        SMS_HTTP_TOKEN: 'sms-token',
        COOKIE_SECURE: 'false',
      }),
    ).toThrow(/COOKIE_SECURE/);
  });
});
