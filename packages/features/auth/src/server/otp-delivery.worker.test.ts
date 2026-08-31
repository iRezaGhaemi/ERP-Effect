import { randomUUID } from "node:crypto";

import { Logger } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { OtpCodeSealer } from "./otp-code-sealer.js";
import {
  OtpDeliveryWorker,
  type OtpDeliveryWorkerOptions,
} from "./otp-delivery.worker.js";

const pepper = "unit-test-otp-pepper-at-least-32-characters";
const challengeId = "a879495d-0ac8-4490-9f1c-5535671b9acf";
const jobId = "22fc14a5-14a9-4ace-97b5-363aa2d69091";
const leaseToken = "bb99bb08-0c46-4c81-81e2-fce0056e21a1";
const claimVersion = 7;
const options: OtpDeliveryWorkerOptions = {
  enabled: false,
  pollMilliseconds: 10_000,
  leaseSeconds: 30,
  providerTimeoutSeconds: 5,
  activationMarginSeconds: 5,
  maxAttempts: 3,
  terminalRetentionSeconds: 86_400,
  cleanupBatchSize: 500,
  cleanupIntervalMilliseconds: 60_000,
};

function claimedJob(attempts = 1) {
  const sealed = new OtpCodeSealer(pepper).seal("123456", challengeId);
  return {
    id: jobId,
    challengeId,
    codeCiphertext: sealed.ciphertext,
    codeNonce: sealed.nonce,
    codeTag: sealed.tag,
    requestId: "req_worker",
    attempts,
    leaseToken,
    claimVersion,
    expiresAt: new Date(Date.now() + 120_000),
    recipient: "+989121234567",
    requestIp: "127.0.0.1",
  };
}

function auditPendingJob() {
  return {
    ...claimedJob(3),
    status: "AUDIT_PENDING",
    codeCiphertext: null,
    codeNonce: null,
    codeTag: null,
  };
}

function successfulDataSource(job = claimedJob()) {
  const claimQuery = vi.fn().mockResolvedValue([[job], 1]);
  const completionQuery = vi
    .fn()
    .mockResolvedValueOnce([[{ id: challengeId }], 1])
    .mockResolvedValueOnce([[{ id: jobId }], 1]);
  const transaction = vi
    .fn()
    .mockImplementationOnce(async (work) => work({ query: claimQuery }))
    .mockImplementationOnce(async (work) => work({ query: completionQuery }));
  return {
    source: { transaction, query: vi.fn() },
    claimQuery,
    completionQuery,
  };
}

describe("OtpCodeSealer", () => {
  it("authenticates the challenge-bound encrypted code", () => {
    const sealer = new OtpCodeSealer(pepper);
    const sealed = sealer.seal("123456", challengeId);

    expect(sealer.unseal(sealed, challengeId)).toBe("123456");
    expect(JSON.stringify(sealed)).not.toContain("123456");
    expect(() =>
      sealer.unseal(
        { ...sealed, tag: Buffer.alloc(16, 1).toString("base64") },
        challengeId,
      ),
    ).toThrow();
    expect(() => sealer.unseal(sealed, randomUUID())).toThrow();
  });
});

describe("OtpDeliveryWorker", () => {
  it("claims, decrypts, sends, and activates only the matching challenge", async () => {
    const database = successfulDataSource();
    const sms = { send: vi.fn().mockResolvedValue(undefined) };
    const worker = new OtpDeliveryWorker(
      database.source as never,
      sms,
      { write: vi.fn() } as never,
      new OtpCodeSealer(pepper),
      options,
    );

    await expect(worker.runOnce()).resolves.toBe(true);

    expect(sms.send).toHaveBeenCalledWith({
      recipient: "+989121234567",
      message: "کد ورود شما: 123456",
      requestId: jobId,
    });
    expect(database.claimQuery.mock.calls[0]?.[0]).toContain(
      "FOR UPDATE SKIP LOCKED",
    );
    expect(database.claimQuery.mock.calls[0]?.[0]).toContain(`"lease_token"`);
    expect(database.claimQuery.mock.calls[0]?.[0]).toContain(
      `"claim_version" = job."claim_version" + 1`,
    );
    expect(database.claimQuery.mock.calls[0]?.[0]).toContain(
      `"status" = 'PROCESSING' AND "lease_expires_at" <= now()`,
    );
    expect(database.claimQuery.mock.calls[0]?.[0]).toContain(
      `job."lease_token" AS "leaseToken"`,
    );
    expect(database.claimQuery.mock.calls[0]?.[0]).toContain(
      `job."claim_version" AS "claimVersion"`,
    );
    expect(database.completionQuery.mock.calls[0]?.[1]).toEqual([challengeId]);
    expect(database.completionQuery.mock.calls[1]?.[1]).toEqual([
      jobId,
      challengeId,
      leaseToken,
      claimVersion,
    ]);
    expect(database.completionQuery.mock.calls[1]?.[0]).toContain(
      `"code_ciphertext" = NULL`,
    );
  });

  it("schedules a bounded retry after a transient provider failure", async () => {
    const job = claimedJob(1);
    const transaction = vi.fn(async (work) =>
      work({ query: vi.fn().mockResolvedValue([[job], 1]) }),
    );
    const query = vi.fn().mockResolvedValue([[{ id: jobId }], 1]);
    const worker = new OtpDeliveryWorker(
      { transaction, query } as never,
      { send: vi.fn().mockRejectedValue(new Error("provider secret")) },
      { write: vi.fn() } as never,
      new OtpCodeSealer(pepper),
      options,
    );

    await worker.runOnce();

    expect(query.mock.calls[0]?.[0]).toContain(`"status" = 'PENDING'`);
    expect(query.mock.calls[0]?.[0]).toContain(`"lease_token" = $4`);
    expect(query.mock.calls[0]?.[0]).toContain(`"claim_version" = $5`);
    expect(query.mock.calls[0]?.[1]).toEqual([
      jobId,
      1,
      challengeId,
      leaseToken,
      claimVersion,
    ]);
  });

  it("leaves the challenge invalid and audits safe metadata on terminal failure", async () => {
    const job = claimedJob(3);
    const audit = { write: vi.fn().mockResolvedValue(undefined) };
    const claimQuery = vi.fn().mockResolvedValue([[job], 1]);
    const transaction = vi
      .fn()
      .mockImplementationOnce(async (work) => work({ query: claimQuery }))
      .mockImplementationOnce(async (work) =>
        work({
          marker: "audit-manager",
          query: vi.fn().mockResolvedValue([[{ id: jobId }], 1]),
        }),
      );
    const query = vi.fn().mockResolvedValue([[{ id: jobId }], 1]);
    const worker = new OtpDeliveryWorker(
      { transaction, query } as never,
      { send: vi.fn().mockRejectedValue(new Error("provider secret")) },
      audit as never,
      new OtpCodeSealer(pepper),
      options,
    );

    await worker.runOnce();

    expect(query.mock.calls[0]?.[0]).toContain(`"status" = 'AUDIT_PENDING'`);
    expect(query.mock.calls[0]?.[0]).toContain(`"code_ciphertext" = NULL`);
    expect(query.mock.calls[0]?.[0]).not.toContain("otp_challenges");
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.otp_delivery_failed",
        entityId: challengeId,
        metadata: {},
      }),
      expect.objectContaining({ marker: "audit-manager" }),
    );
    expect(JSON.stringify(audit.write.mock.calls)).not.toContain(
      "provider secret",
    );
  });

  it("terminally fails a tampered payload without invoking the provider", async () => {
    const job = {
      ...claimedJob(),
      codeTag: Buffer.alloc(16, 9).toString("base64"),
    };
    const transaction = vi
      .fn()
      .mockImplementationOnce(async (work) =>
        work({ query: vi.fn().mockResolvedValue([[job], 1]) }),
      )
      .mockImplementationOnce(async (work) =>
        work({ query: vi.fn().mockResolvedValue([[{ id: jobId }], 1]) }),
      );
    const query = vi.fn().mockResolvedValue([[{ id: jobId }], 1]);
    const sms = { send: vi.fn() };
    const worker = new OtpDeliveryWorker(
      { transaction, query } as never,
      sms,
      { write: vi.fn().mockResolvedValue(undefined) } as never,
      new OtpCodeSealer(pepper),
      options,
    );

    await worker.runOnce();

    expect(sms.send).not.toHaveBeenCalled();
    expect(query.mock.calls[0]?.[0]).toContain(`"status" = 'AUDIT_PENDING'`);
  });

  it("does not activate a mismatched challenge after accepted delivery", async () => {
    const job = claimedJob();
    const audit = { write: vi.fn().mockResolvedValue(undefined) };
    const transaction = vi
      .fn()
      .mockImplementationOnce(async (work) =>
        work({ query: vi.fn().mockResolvedValue([[job], 1]) }),
      )
      .mockImplementationOnce(async (work) =>
        work({ query: vi.fn().mockResolvedValue([[], 0]) }),
      )
      .mockImplementationOnce(async (work) =>
        work({ query: vi.fn().mockResolvedValue([[{ id: jobId }], 1]) }),
      );
    const query = vi.fn().mockResolvedValue([[{ id: jobId }], 1]);
    const sms = { send: vi.fn().mockResolvedValue(undefined) };
    const worker = new OtpDeliveryWorker(
      { transaction, query } as never,
      sms,
      audit as never,
      new OtpCodeSealer(pepper),
      options,
    );

    await worker.runOnce();

    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain(`"status" = 'AUDIT_PENDING'`);
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: challengeId, metadata: {} }),
      expect.anything(),
    );
  });

  it("keeps terminal state settled when failure auditing is unavailable", async () => {
    const warning = vi
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    const job = claimedJob(3);
    const transaction = vi
      .fn()
      .mockImplementationOnce(async (work) =>
        work({ query: vi.fn().mockResolvedValue([[job], 1]) }),
      )
      .mockImplementationOnce(async (work) => work({}));
    const query = vi.fn().mockResolvedValue([[{ id: jobId }], 1]);
    const worker = new OtpDeliveryWorker(
      { transaction, query } as never,
      { send: vi.fn().mockRejectedValue(new Error("provider secret")) },
      { write: vi.fn().mockRejectedValue(new Error("audit secret")) } as never,
      new OtpCodeSealer(pepper),
      options,
    );

    await expect(worker.runOnce()).resolves.toBe(true);
    expect(query.mock.calls[0]?.[0]).toContain(`"status" = 'AUDIT_PENDING'`);
    expect(query.mock.calls[0]?.[0]).toContain(`"code_ciphertext" = NULL`);
    expect(warning).toHaveBeenCalledWith(
      "OTP terminal delivery audit could not be persisted.",
    );
    warning.mockRestore();
  });

  it("retries audit-pending terminalization without invoking the provider", async () => {
    const job = auditPendingJob();
    const audit = { write: vi.fn().mockResolvedValue(undefined) };
    const finalizeQuery = vi.fn().mockResolvedValue([[{ id: jobId }], 1]);
    const transaction = vi
      .fn()
      .mockImplementationOnce(async (work) =>
        work({ query: vi.fn().mockResolvedValue([[], 0]) }),
      )
      .mockImplementationOnce(async (work) =>
        work({ query: vi.fn().mockResolvedValue([[job], 1]) }),
      )
      .mockImplementationOnce(async (work) => work({ query: finalizeQuery }));
    const sms = { send: vi.fn() };
    const worker = new OtpDeliveryWorker(
      { transaction, query: vi.fn() } as never,
      sms,
      audit as never,
      new OtpCodeSealer(pepper),
      options,
    );

    await expect(worker.runOnce()).resolves.toBe(true);

    expect(sms.send).not.toHaveBeenCalled();
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.otp_delivery_failed",
        entityId: challengeId,
        requestId: "req_worker",
      }),
      expect.anything(),
    );
    expect(finalizeQuery.mock.calls[0]?.[0]).toContain(`"status" = 'FAILED'`);
    expect(finalizeQuery.mock.calls[0]?.[0]).toContain(`"lease_token" = $3`);
    expect(finalizeQuery.mock.calls[0]?.[1]).toEqual([
      jobId,
      challengeId,
      leaseToken,
      claimVersion,
    ]);
  });

  it.each([5_001, 10_000])(
    "terminalizes a job with %i milliseconds remaining before provider delivery",
    async (remainingMilliseconds) => {
      const now = Date.now();
      const job = {
        ...claimedJob(),
        expiresAt: new Date(now + remainingMilliseconds),
      };
      const transaction = vi
        .fn()
        .mockImplementationOnce(async (work) =>
          work({ query: vi.fn().mockResolvedValue([[job], 1]) }),
        )
        .mockImplementationOnce(async (work) =>
          work({ query: vi.fn().mockResolvedValue([[{ id: jobId }], 1]) }),
        );
      const query = vi.fn().mockResolvedValue([[{ id: jobId }], 1]);
      const sms = { send: vi.fn() };
      const worker = new OtpDeliveryWorker(
        { transaction, query } as never,
        sms,
        { write: vi.fn().mockResolvedValue(undefined) } as never,
        new OtpCodeSealer(pepper),
        options,
      );

      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);
      try {
        await worker.runOnce();
      } finally {
        nowSpy.mockRestore();
      }

      expect(sms.send).not.toHaveBeenCalled();
      expect(query.mock.calls[0]?.[0]).toContain(`"status" = 'AUDIT_PENDING'`);
      expect(query.mock.calls[0]?.[0]).toContain(`"lease_token" = $3`);
      expect(query.mock.calls[0]?.[0]).toContain(`"claim_version" = $4`);
      expect(query.mock.calls[0]?.[1]).toEqual([
        jobId,
        challengeId,
        leaseToken,
        claimVersion,
      ]);
    },
  );

  it("delivers a job with just over the full expiry margin remaining", async () => {
    const now = Date.now();
    const database = successfulDataSource({
      ...claimedJob(),
      expiresAt: new Date(now + 10_001),
    });
    const sms = { send: vi.fn().mockResolvedValue(undefined) };
    const worker = new OtpDeliveryWorker(
      database.source as never,
      sms,
      { write: vi.fn() } as never,
      new OtpCodeSealer(pepper),
      options,
    );

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);
    try {
      await worker.runOnce();
    } finally {
      nowSpy.mockRestore();
    }

    expect(sms.send).toHaveBeenCalledTimes(1);
  });

  it("allows only a claimed job to be delivered across concurrent workers", async () => {
    const job = claimedJob();
    const claims = [job, null];
    const claim = vi.fn(async () => claims.shift());
    const makeSource = () => {
      let attemptedDeliveryClaim = false;
      let claimedDelivery = false;
      return {
        transaction: vi.fn(async (work) => {
          if (!attemptedDeliveryClaim) {
            attemptedDeliveryClaim = true;
            const candidate = await claim();
            claimedDelivery = Boolean(candidate);
            return work({
              query: vi
                .fn()
                .mockResolvedValue(candidate ? [[candidate], 1] : [[], 0]),
            });
          }
          if (!claimedDelivery) {
            return work({ query: vi.fn().mockResolvedValue([[], 0]) });
          }
          let queryCount = 0;
          return work({
            query: vi.fn().mockImplementation(() => {
              queryCount += 1;
              return [[{ id: queryCount === 1 ? challengeId : jobId }], 1];
            }),
          });
        }),
        query: vi.fn(),
      };
    };
    const sms = { send: vi.fn().mockResolvedValue(undefined) };
    const workers = [makeSource(), makeSource()].map(
      (source) =>
        new OtpDeliveryWorker(
          source as never,
          sms,
          { write: vi.fn() } as never,
          new OtpCodeSealer(pepper),
          options,
        ),
    );

    await Promise.all(workers.map((worker) => worker.runOnce()));

    expect(sms.send).toHaveBeenCalledTimes(1);
  });

  it("drains in-flight delivery before shutdown completes", async () => {
    const database = successfulDataSource();
    let releaseSend: (() => void) | undefined;
    const send = vi.fn(
      () => new Promise<void>((resolve) => (releaseSend = resolve)),
    );
    const worker = new OtpDeliveryWorker(
      database.source as never,
      { send },
      { write: vi.fn() } as never,
      new OtpCodeSealer(pepper),
      { ...options, enabled: true },
    );
    worker.onApplicationBootstrap();
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    let stopped = false;
    const shutdown = worker.onApplicationShutdown().then(() => {
      stopped = true;
    });
    await Promise.resolve();
    expect(stopped).toBe(false);
    releaseSend?.();
    await shutdown;
    expect(stopped).toBe(true);
    expect(database.source.transaction).toHaveBeenCalledTimes(2);
  });

  it("cleans up expired terminal challenges and jobs in bounded batches", async () => {
    const query = vi.fn().mockResolvedValue([{ deletedCount: "2" }]);
    const worker = new OtpDeliveryWorker(
      { transaction: vi.fn(), query } as never,
      { send: vi.fn() },
      { write: vi.fn() } as never,
      new OtpCodeSealer(pepper),
      options,
    );

    await expect(worker.cleanupTerminalRows()).resolves.toBe(2);

    expect(query.mock.calls[0]?.[0]).toContain(
      `"status" IN ('SUCCEEDED', 'FAILED', 'DISCARDED')`,
    );
    expect(query.mock.calls[0]?.[0]).toContain(`LIMIT $2`);
    expect(query.mock.calls[0]?.[1]).toEqual([86_400, 500]);
  });

  it("runs terminal cleanup from the lifecycle at a bounded cadence", async () => {
    vi.useFakeTimers();
    try {
      const transaction = vi.fn(async (work) =>
        work({ query: vi.fn().mockResolvedValue([[], 0]) }),
      );
      const query = vi.fn().mockResolvedValue([{ deletedCount: "0" }]);
      const worker = new OtpDeliveryWorker(
        { transaction, query } as never,
        { send: vi.fn() },
        { write: vi.fn() } as never,
        new OtpCodeSealer(pepper),
        {
          ...options,
          enabled: true,
          pollMilliseconds: 100,
          cleanupIntervalMilliseconds: 1_000,
        },
      );

      worker.onApplicationBootstrap();
      await vi.advanceTimersByTimeAsync(0);
      expect(query).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(999);
      expect(query).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(query).toHaveBeenCalledTimes(2);

      await worker.onApplicationShutdown();
    } finally {
      vi.useRealTimers();
    }
  });

  it("processes claimed delivery before due terminal cleanup", async () => {
    vi.useFakeTimers();
    try {
      const events: string[] = [];
      const job = claimedJob();
      let transactionCount = 0;
      const transaction = vi.fn(async (work) => {
        transactionCount += 1;
        if (transactionCount === 1) {
          return work({ query: vi.fn().mockResolvedValue([[job], 1]) });
        }
        if (transactionCount === 2) {
          const completed = vi
            .fn()
            .mockResolvedValueOnce([[{ id: challengeId }], 1])
            .mockResolvedValueOnce([[{ id: jobId }], 1]);
          return work({ query: completed });
        }
        return work({ query: vi.fn().mockResolvedValue([[], 0]) });
      });
      const worker = new OtpDeliveryWorker(
        {
          transaction,
          query: vi.fn().mockImplementation(async () => {
            events.push("cleanup");
            return [{ deletedCount: "0" }];
          }),
        } as never,
        {
          send: vi.fn().mockImplementation(async () => {
            events.push("delivery");
          }),
        },
        { write: vi.fn() } as never,
        new OtpCodeSealer(pepper),
        { ...options, enabled: true, pollMilliseconds: 100 },
      );

      worker.onApplicationBootstrap();
      await vi.advanceTimersByTimeAsync(0);

      expect(events).toEqual(["delivery", "cleanup"]);
      await worker.onApplicationShutdown();
    } finally {
      vi.useRealTimers();
    }
  });

  it("continues delivery after a cleanup failure without logging details", async () => {
    vi.useFakeTimers();
    const error = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    try {
      const job = claimedJob();
      let deliveryClaimCount = 0;
      const transaction = vi.fn(async (work) => {
        return work({
          query: vi.fn().mockImplementation((statement: string) => {
            if (statement.includes(`"status" = 'PENDING'`)) {
              deliveryClaimCount += 1;
              return deliveryClaimCount === 2 ? [[job], 1] : [[], 0];
            }
            if (statement.includes(`UPDATE "otp_challenges"`)) {
              return [[{ id: challengeId }], 1];
            }
            if (statement.includes(`"status" = 'SUCCEEDED'`)) {
              return [[{ id: jobId }], 1];
            }
            return [[], 0];
          }),
        });
      });
      const sms = { send: vi.fn().mockResolvedValue(undefined) };
      const worker = new OtpDeliveryWorker(
        {
          transaction,
          query: vi.fn().mockRejectedValue(new Error("cleanup secret")),
        } as never,
        sms,
        { write: vi.fn() } as never,
        new OtpCodeSealer(pepper),
        {
          ...options,
          enabled: true,
          pollMilliseconds: 100,
          cleanupIntervalMilliseconds: 1_000,
        },
      );

      worker.onApplicationBootstrap();
      await vi.advanceTimersByTimeAsync(100);

      expect(sms.send).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith("OTP terminal cleanup failed.");
      expect(JSON.stringify(error.mock.calls)).not.toContain("cleanup secret");
      await worker.onApplicationShutdown();
    } finally {
      error.mockRestore();
      vi.useRealTimers();
    }
  });
});
