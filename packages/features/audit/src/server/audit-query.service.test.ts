import type { EntityManager } from "typeorm";
import { describe, expect, it } from "vitest";

import { AuditLogEntity } from "../entities/index.js";
import { AuditQueryService } from "./audit-query.service.js";
import { AuditWriter } from "./audit-writer.js";

function createAuditLog(): AuditLogEntity {
  return Object.assign(new AuditLogEntity(), {
    id: "daa30c30-1b0f-4d48-b254-cfccfe08426a",
    actorId: null,
    action: "auth.otp_rejected",
    entityType: "auth",
    entityId: null,
    metadata: {},
    ipAddress: "127.0.0.1",
    requestId: "req_1",
    createdAt: new Date("2026-08-28T00:00:00.000Z"),
  });
}

describe("audit services", () => {
  it("uses the caller transaction manager when writing", async () => {
    const saved: AuditLogEntity[] = [];
    const transactionManager = {
      getRepository: () => ({
        create: (values: Partial<AuditLogEntity>) =>
          Object.assign(new AuditLogEntity(), values),
        save: async (log: AuditLogEntity) => {
          saved.push(log);
          return log;
        },
      }),
    } as unknown as EntityManager;
    const writer = new AuditWriter({
      manager: {
        getRepository: () => {
          throw new Error("wrong manager");
        },
      },
    } as never);

    await writer.write(
      {
        actorId: null,
        action: "auth.otp_rejected",
        entityType: "auth",
        entityId: null,
        metadata: {},
        ipAddress: "127.0.0.1",
        requestId: "req_1",
      },
      transactionManager,
    );

    expect(saved).toHaveLength(1);
    expect(saved[0]?.action).toBe("auth.otp_rejected");
  });

  it("rejects sensitive metadata keys recursively before persistence", async () => {
    const saved: AuditLogEntity[] = [];
    const writer = new AuditWriter({
      manager: {
        getRepository: () => ({
          create: (values: Partial<AuditLogEntity>) =>
            Object.assign(new AuditLogEntity(), values),
          save: async (log: AuditLogEntity) => {
            saved.push(log);
            return log;
          },
        }),
      },
    } as never);

    const sensitiveMetadata = [
      { OTP: "one-time-password" },
      { context: { Access_Token: "access-token" } },
      { attempts: [{ detail: { refreshToken: "refresh-token" } }] },
      { transport: [{ Cookie: "session-cookie" }] },
      { delivery: { SMS_Credentials: "sms-credential" } },
      { nested: [{ SeCrEt: "secret" }] },
    ];

    for (const metadata of sensitiveMetadata) {
      await expect(
        writer.write({
          actorId: null,
          action: "auth.otp_rejected",
          entityType: "auth",
          entityId: null,
          metadata,
          ipAddress: "127.0.0.1",
          requestId: "req_2",
        }),
      ).rejects.toThrow(/sensitive audit metadata key/i);
    }

    expect(saved).toHaveLength(0);
  });

  it("persists useful non-sensitive nested metadata", async () => {
    const saved: AuditLogEntity[] = [];
    const writer = new AuditWriter({
      manager: {
        getRepository: () => ({
          create: (values: Partial<AuditLogEntity>) =>
            Object.assign(new AuditLogEntity(), values),
          save: async (log: AuditLogEntity) => {
            saved.push(log);
            return log;
          },
        }),
      },
    } as never);
    const metadata = { channel: "sms", outcomes: [{ retryable: true, reason: "expired" }] };

    await writer.write({
      actorId: null,
      action: "auth.otp_rejected",
      entityType: "auth",
      entityId: null,
      metadata,
      ipAddress: "127.0.0.1",
      requestId: "req_4",
    });

    expect(saved[0]?.metadata).toEqual(metadata);
  });

  it("sorts audit logs deterministically and caps page size at 100", async () => {
    const findAndCount = async (options: unknown) => {
      expect(options).toMatchObject({
        order: { createdAt: "DESC", id: "DESC" },
        skip: 100,
        take: 100,
      });
      return [[createAuditLog()], 201] as [AuditLogEntity[], number];
    };
    const service = new AuditQueryService({
      manager: { getRepository: () => ({ findAndCount }) },
    } as never);

    const page = await service.list({ page: 2, pageSize: 250 });

    expect(page.items[0]?.createdAt).toEqual(
      new Date("2026-08-28T00:00:00.000Z"),
    );
    expect(page.meta).toEqual({
      page: 2,
      pageSize: 100,
      total: 201,
      pageCount: 3,
    });
  });
});
