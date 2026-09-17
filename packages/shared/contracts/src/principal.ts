import { z } from 'zod';

export const AuthenticatedPrincipalSchema = z.object({
  userId: z.uuid(),
  sessionId: z.uuid(),
  phone: z.string().min(1),
  permissions: z.array(z.string()),
  credentialVersion: z.number().int().nonnegative(),
  mustChangePassword: z.boolean(),
});

export type AuthenticatedPrincipal = z.infer<typeof AuthenticatedPrincipalSchema>;
