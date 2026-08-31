import { ApiError, ErrorEnvelopeSchema } from "@effect-erp/contracts";
import { z } from "zod";

import { AuditLogPageSchema, AuditQuerySchema, type AuditQuery } from "../contracts/index.js";

function toApiError(body: unknown): ApiError { const parsed = ErrorEnvelopeSchema.safeParse(body); return parsed.success ? ApiError.fromEnvelope(parsed.data) : new ApiError({ code: "REQUEST_FAILED", message: "ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.", fields: {}, requestId: "unknown" }); }

export class AuditClient {
  async list(query: Partial<AuditQuery> = {}) {
    const parsed = AuditQuerySchema.parse(query);
    const response = await fetch(`/api/v1/audit-logs?page=${parsed.page}&pageSize=${parsed.pageSize}`, { credentials: "include" });
    const body = await response.json().catch(() => undefined);
    if (!response.ok) throw toApiError(body);
    return AuditLogPageSchema.parse(body);
  }
}
