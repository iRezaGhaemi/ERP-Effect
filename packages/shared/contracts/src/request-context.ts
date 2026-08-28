import { z } from 'zod';

export const RequestContextSchema = z.object({
  requestId: z.string().min(1),
  ipAddress: z.string().min(1),
  userAgent: z.string().min(1),
});

export type RequestContext = z.infer<typeof RequestContextSchema>;
