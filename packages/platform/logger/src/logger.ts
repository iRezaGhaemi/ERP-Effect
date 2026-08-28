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

export function createAppLogger(destination?: DestinationStream): Logger {
  return pino(
    {
      redact: {
        paths: [...redactedPaths],
        censor: '[Redacted]',
      },
    },
    destination,
  );
}
