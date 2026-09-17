import pino from 'pino';
import type { DestinationStream, Logger } from 'pino';

const redactedPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'otp',
  'code',
  'accessToken',
  'refreshToken',
  'SMS_HTTP_TOKEN',
  'OTP_PEPPER',
  'JWT_ACCESS_SECRET',
  'password',
  'currentPassword',
  'newPassword',
  'initialPassword',
  'actorPassword',
  'passwordHash',
  'INITIAL_ADMIN_PASSWORD',
  'AUTH_RATE_LIMIT_SECRET',
] as const;

const sensitiveKeys = new Set([
  'authorization',
  'cookie',
  'otp',
  'code',
  'accessToken',
  'refreshToken',
  'SMS_HTTP_TOKEN',
  'OTP_PEPPER',
  'JWT_ACCESS_SECRET',
  'password',
  'currentPassword',
  'newPassword',
  'initialPassword',
  'actorPassword',
  'passwordHash',
  'INITIAL_ADMIN_PASSWORD',
  'AUTH_RATE_LIMIT_SECRET',
]);

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function redactNestedSecrets(value: unknown, seen = new WeakMap<object, unknown>()): unknown {
  if (Array.isArray(value)) {
    const existing = seen.get(value);
    if (existing) {
      return existing;
    }

    const redacted: unknown[] = [];
    seen.set(value, redacted);
    redacted.push(...value.map((item) => redactNestedSecrets(item, seen)));
    return redacted;
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  const existing = seen.get(value);
  if (existing) {
    return existing;
  }

  if (!isPlainObject(value)) {
    const redacted = new Proxy(value, {
      get(target, property) {
        if (typeof property === 'string' && sensitiveKeys.has(property)) {
          return '[Redacted]';
        }

        const nestedValue: unknown = Reflect.get(target, property, target);
        if (target instanceof Date && typeof nestedValue === 'function') {
          return (nestedValue as (...args: unknown[]) => unknown).bind(target);
        }

        return redactNestedSecrets(nestedValue, seen);
      },
    });
    seen.set(value, redacted);
    return redacted;
  }

  const redacted: Record<string, unknown> = {};
  seen.set(value, redacted);
  for (const [key, nestedValue] of Object.entries(value)) {
    redacted[key] = sensitiveKeys.has(key) ? '[Redacted]' : redactNestedSecrets(nestedValue, seen);
  }

  return redacted;
}

function redactLogObject(object: Record<string, unknown>): Record<string, unknown> {
  return redactNestedSecrets(object) as Record<string, unknown>;
}

export function createAppLogger(destination?: DestinationStream): Logger {
  return pino(
    {
      redact: {
        paths: [...redactedPaths],
        censor: '[Redacted]',
      },
      formatters: {
        log: redactLogObject,
      },
    },
    destination,
  );
}
