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

function redactNestedSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactNestedSecrets);
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveKeys.has(key) ? '[Redacted]' : redactNestedSecrets(nestedValue),
    ]),
  );
}

function redactLogObject(object: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [key, redactNestedSecrets(value)]),
  );
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
