import { createPageSchema } from "@effect-erp/contracts";
import { z } from "zod";

export const CSRF_TOKEN_BYTES = 32;
export const CSRF_TOKEN_LENGTH = Math.ceil((CSRF_TOKEN_BYTES * 8) / 6);
const csrfTokenPattern = new RegExp(`^[A-Za-z0-9_-]{${CSRF_TOKEN_LENGTH}}$`);
export const CsrfTokenSchema = z
  .string()
  .length(CSRF_TOKEN_LENGTH)
  .regex(csrfTokenPattern);

export const AuthUserSummarySchema = z.object({
  id: z.uuid(),
  phone: z.string().min(1),
  firstName: z.string(),
  lastName: z.string(),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  username: z.string().nullable(),
  credentialsReady: z.boolean(),
  mustChangePassword: z.boolean(),
  lastLoginAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const AuthSessionResponseSchema = z.object({
  user: AuthUserSummarySchema,
  sessionId: z.uuid(),
});

export const AuthSessionItemSchema = z.object({
  id: z.uuid(),
  device: z.string(),
  ipAddress: z.string(),
  createdAt: z.iso.datetime(),
  lastUsedAt: z.iso.datetime(),
  current: z.boolean(),
});

export const AuthSessionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(10_000).default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const AuthSessionPageSchema = createPageSchema(AuthSessionItemSchema);

export const MeResponseSchema = z.object({
  user: AuthUserSummarySchema,
  permissions: z.array(z.string()),
});

export type AuthUserSummary = z.infer<typeof AuthUserSummarySchema>;
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>;
export type AuthSessionItem = z.infer<typeof AuthSessionItemSchema>;
export type AuthSessionListQuery = z.infer<typeof AuthSessionListQuerySchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
