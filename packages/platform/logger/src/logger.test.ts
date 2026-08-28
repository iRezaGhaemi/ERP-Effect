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
});
