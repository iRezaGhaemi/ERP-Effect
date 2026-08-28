import { z } from 'zod';

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().regex(/^[A-Z0-9_]+$/),
    message: z.string().min(1),
    fields: z.record(z.string(), z.array(z.string())).default({}),
    requestId: z.string().min(1),
  }),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
export type ErrorDetails = ErrorEnvelope['error'];

export class ApiError extends Error {
  readonly code: string;
  readonly fields: Record<string, string[]>;
  readonly requestId: string;

  constructor(error: ErrorDetails) {
    super(error.message);
    this.name = 'ApiError';
    this.code = error.code;
    this.fields = error.fields;
    this.requestId = error.requestId;
  }

  static fromEnvelope(envelope: ErrorEnvelope): ApiError {
    return new ApiError(envelope.error);
  }
}
