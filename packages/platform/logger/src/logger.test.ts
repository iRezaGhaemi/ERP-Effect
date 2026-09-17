import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { createAppLogger } from './index.js';

describe('createAppLogger', () => {
  it('redacts OTPs from structured logs', () => {
    let output = '';
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    const logger = createAppLogger(destination);

    logger.info({ otp: '123456' }, 'sending one-time password');

    expect(output).toContain('[Redacted]');
    expect(output).not.toContain('123456');
  });

  it('redacts nested secrets from structured logs', () => {
    let output = '';
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    const logger = createAppLogger(destination);

    logger.info(
      {
        auth: { accessToken: 'nested-access-token' },
        delivery: { otp: '654321', code: 'nested-code' },
        credentials: {
          password: 'nested-password',
          currentPassword: 'nested-current-password',
          newPassword: 'nested-new-password',
          initialPassword: 'nested-initial-password',
          label: 'safe-credential-label',
        },
        audit: [
          {
            payload: {
              session: { refreshToken: 'deep-refresh-token' },
              passwordHash: 'array-password-hash',
            },
          },
        ],
      },
      'sending one-time password',
    );

    expect(output).toContain('[Redacted]');
    expect(output).toContain('safe-credential-label');
    expect(output).not.toContain('nested-access-token');
    expect(output).not.toContain('654321');
    expect(output).not.toContain('nested-code');
    expect(output).not.toContain('deep-refresh-token');
    expect(output).not.toContain('nested-password');
    expect(output).not.toContain('nested-current-password');
    expect(output).not.toContain('nested-new-password');
    expect(output).not.toContain('nested-initial-password');
    expect(output).not.toContain('array-password-hash');
  });

  it('handles circular payloads without corrupting non-plain values', () => {
    let output = '';
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    const logger = createAppLogger(destination);
    const circular: { otp: string; self?: unknown } = { otp: 'circular-otp' };
    circular.self = circular;
    const occurredAt = new Date('2026-08-28T12:00:00.000Z');
    const error = new Error('database unavailable');

    expect(() => logger.info({ circular, occurredAt, err: error }, 'request failed')).not.toThrow();
    expect(output).toContain('[Redacted]');
    expect(output).not.toContain('circular-otp');
    expect(output).toContain('2026-08-28T12:00:00.000Z');
    expect(output).toContain('database unavailable');
  });

  it('redacts enumerable secrets on custom instances and errors', () => {
    class DeliveryMetadata {
      readonly label = 'delivery';
      readonly accessToken = 'instance-access-token';
      readonly otp = 'instance-otp';
      readonly actorPassword = 'instance-actor-password';
      readonly passwordHash = 'instance-password-hash';
    }

    let output = '';
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    const logger = createAppLogger(destination);
    const error = Object.assign(new Error('database unavailable'), {
      refreshToken: 'error-refresh-token',
      code: 'error-code',
      SMS_HTTP_TOKEN: 'error-sms-token',
      OTP_PEPPER: 'error-otp-pepper',
      JWT_ACCESS_SECRET: 'error-jwt-secret',
      password: 'error-password',
      currentPassword: 'error-current-password',
      newPassword: 'error-new-password',
      initialPassword: 'error-initial-password',
      INITIAL_ADMIN_PASSWORD: 'error-bootstrap-password',
      AUTH_RATE_LIMIT_SECRET: 'error-rate-limit-secret',
      safeContext: 'safe-error-context',
    });

    logger.info({ delivery: new DeliveryMetadata(), err: error }, 'request failed');

    expect(output).toContain('[Redacted]');
    expect(output).toContain('delivery');
    expect(output).toContain('database unavailable');
    expect(output).toContain('safe-error-context');
    for (const secret of [
      'instance-access-token',
      'instance-otp',
      'instance-actor-password',
      'instance-password-hash',
      'error-refresh-token',
      'error-code',
      'error-sms-token',
      'error-otp-pepper',
      'error-jwt-secret',
      'error-password',
      'error-current-password',
      'error-new-password',
      'error-initial-password',
      'error-bootstrap-password',
      'error-rate-limit-secret',
    ]) {
      expect(output).not.toContain(secret);
    }
  });
});
