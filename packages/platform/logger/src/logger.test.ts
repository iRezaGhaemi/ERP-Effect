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
        audit: [{ payload: { session: { refreshToken: 'deep-refresh-token' } } }],
      },
      'sending one-time password',
    );

    expect(output).toContain('[Redacted]');
    expect(output).not.toContain('nested-access-token');
    expect(output).not.toContain('654321');
    expect(output).not.toContain('nested-code');
    expect(output).not.toContain('deep-refresh-token');
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
    });

    logger.info({ delivery: new DeliveryMetadata(), err: error }, 'request failed');

    expect(output).toContain('[Redacted]');
    expect(output).toContain('delivery');
    expect(output).toContain('database unavailable');
    for (const secret of [
      'instance-access-token',
      'instance-otp',
      'error-refresh-token',
      'error-code',
      'error-sms-token',
      'error-otp-pepper',
      'error-jwt-secret',
    ]) {
      expect(output).not.toContain(secret);
    }
  });
});
