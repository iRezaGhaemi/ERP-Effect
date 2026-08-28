import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  checks: z.record(z.string(), z.enum(['up', 'down'])).optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
