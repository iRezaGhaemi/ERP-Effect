import { describe, expect, it } from "vitest";

import { AuditLogDtoSchema, AuditLogPageSchema } from "./index.js";

const auditLog = {
  id: "daa30c30-1b0f-4d48-b254-cfccfe08426a",
  actorId: null,
  action: "users.updated",
  entityType: "users",
  entityId: "013a40c7-82e7-4435-a5d6-988b03fdce37",
  metadata: {},
  ipAddress: null,
  requestId: "req_1",
  createdAt: "2026-08-28T00:00:00.000Z",
};

describe("audit response contracts", () => {
  it("accepts ISO JSON dates and rejects Date objects", () => {
    expect(AuditLogDtoSchema.safeParse(auditLog).success).toBe(true);
    expect(
      AuditLogPageSchema.safeParse({
        items: [auditLog],
        meta: { page: 1, pageSize: 20, total: 1, pageCount: 1 },
      }).success,
    ).toBe(true);
    expect(
      AuditLogDtoSchema.safeParse({
        ...auditLog,
        createdAt: new Date(auditLog.createdAt),
      }).success,
    ).toBe(false);
  });
});
