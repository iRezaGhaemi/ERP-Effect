import { describe, expect, it } from 'vitest';

import { AuthenticatedPrincipalSchema, ErrorEnvelopeSchema } from './index.js';

describe('shared contracts', () => {
  it('accepts the stable error envelope', () => {
    const parsed = ErrorEnvelopeSchema.parse({
      error: {
        code: 'OTP_EXPIRED',
        message: 'کد تأیید منقضی شده است.',
        fields: {},
        requestId: 'req_1',
      },
    });

    expect(parsed.error.code).toBe('OTP_EXPIRED');
  });

  it('accepts an authenticated principal with UUID user and session IDs', () => {
    const principal = AuthenticatedPrincipalSchema.parse({
      userId: '2cd555ac-bbad-4cc8-834d-445b4d038919',
      sessionId: 'a28f3e79-1f62-443b-9b02-95d3918558b1',
      phone: '09121234567',
      permissions: ['users:read'],
    });

    expect(principal.sessionId).toBe('a28f3e79-1f62-443b-9b02-95d3918558b1');
  });
});
