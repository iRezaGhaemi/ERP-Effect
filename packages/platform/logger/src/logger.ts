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
]);

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
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

  if (value === null || typeof value !== 'object' || !isPlainObject(value)) {
    return value;
  }

  const existing = seen.get(value);
  if (existing) {
    return existing;
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
