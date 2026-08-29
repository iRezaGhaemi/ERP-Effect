import { createPageSchema } from "@effect-erp/contracts";
import { z } from "zod";

export const AuditEventSchema = z.object({
  actorId: z.uuid().nullable(),
  action: z.string().trim().min(1).max(120),
  entityType: z.string().trim().min(1).max(120),
  entityId: z.uuid().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  ipAddress: z.string().trim().min(1).max(45).nullable(),
  requestId: z.string().trim().min(1).max(120),
});

export const AuditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(20),
});

export const AuditLogDtoSchema = AuditEventSchema.extend({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
});
export const AuditLogPageSchema = createPageSchema(AuditLogDtoSchema);

export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type AuditQuery = z.infer<typeof AuditQuerySchema>;
export type AuditLogDto = z.infer<typeof AuditLogDtoSchema>;
