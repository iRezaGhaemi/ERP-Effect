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
const options: OtpDeliveryWorkerOptions = {
  enabled: false,
  pollMilliseconds: 10_000,
  leaseSeconds: 30,
  maxAttempts: 3,
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
    recipient: "+989121234567",
    requestIp: "127.0.0.1",
  };
}

function successfulDataSource(job = claimedJob()) {
  const claimQuery = vi.fn().mockResolvedValue([job]);
  const completionQuery = vi
    .fn()
    .mockResolvedValueOnce([{ id: challengeId }])
    .mockResolvedValueOnce([{ id: jobId }]);
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
      requestId: "req_worker",
    });
    expect(database.claimQuery.mock.calls[0]?.[0]).toContain(
      "FOR UPDATE SKIP LOCKED",
    );
    expect(database.claimQuery.mock.calls[0]?.[0]).toContain(
      `"status" = 'PROCESSING' AND "lease_expires_at" <= now()`,
    );
    expect(database.completionQuery.mock.calls[0]?.[1]).toEqual([challengeId]);
    expect(database.completionQuery.mock.calls[1]?.[1]).toEqual([
      jobId,
      challengeId,
    ]);
  });

  it("schedules a bounded retry after a transient provider failure", async () => {
    const job = claimedJob(1);
    const transaction = vi.fn(async (work) =>
      work({ query: vi.fn().mockResolvedValue([job]) }),
    );
    const query = vi.fn().mockResolvedValue([]);
    const worker = new OtpDeliveryWorker(
      { transaction, query } as never,
      { send: vi.fn().mockRejectedValue(new Error("provider secret")) },
      { write: vi.fn() } as never,
      new OtpCodeSealer(pepper),
      options,
    );

    await worker.runOnce();

    expect(query.mock.calls[0]?.[0]).toContain(`"status" = 'PENDING'`);
    expect(query.mock.calls[0]?.[1]).toEqual([jobId, 1, challengeId]);
  });

  it("leaves the challenge invalid and audits safe metadata on terminal failure", async () => {
    const job = claimedJob(3);
    const audit = { write: vi.fn().mockResolvedValue(undefined) };
    const claimQuery = vi.fn().mockResolvedValue([job]);
    const transaction = vi
      .fn()
      .mockImplementationOnce(async (work) => work({ query: claimQuery }))
      .mockImplementationOnce(async (work) =>
        work({ marker: "audit-manager" }),
      );
    const query = vi.fn().mockResolvedValue([]);
    const worker = new OtpDeliveryWorker(
      { transaction, query } as never,
      { send: vi.fn().mockRejectedValue(new Error("provider secret")) },
      audit as never,
      new OtpCodeSealer(pepper),
      options,
    );

    await worker.runOnce();

    expect(query.mock.calls[0]?.[0]).toContain(`"status" = 'FAILED'`);
    expect(query.mock.calls[0]?.[0]).not.toContain("otp_challenges");
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.otp_delivery_failed",
        entityId: challengeId,
        metadata: {},
      }),
      { marker: "audit-manager" },
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
        work({ query: vi.fn().mockResolvedValue([job]) }),
      )
      .mockImplementationOnce(async (work) => work({}));
    const query = vi.fn().mockResolvedValue([]);
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
    expect(query.mock.calls[0]?.[0]).toContain(`"status" = 'FAILED'`);
  });

  it("does not activate a mismatched challenge after accepted delivery", async () => {
    const job = claimedJob();
    const audit = { write: vi.fn().mockResolvedValue(undefined) };
    const transaction = vi
      .fn()
      .mockImplementationOnce(async (work) =>
        work({ query: vi.fn().mockResolvedValue([job]) }),
      )
      .mockImplementationOnce(async (work) =>
        work({ query: vi.fn().mockResolvedValue([]) }),
      )
      .mockImplementationOnce(async (work) => work({}));
    const query = vi.fn().mockResolvedValue([]);
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
    expect(query.mock.calls[0]?.[0]).toContain(`"status" = 'FAILED'`);
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
        work({ query: vi.fn().mockResolvedValue([job]) }),
      )
      .mockImplementationOnce(async (work) => work({}));
    const query = vi.fn().mockResolvedValue([]);
    const worker = new OtpDeliveryWorker(
      { transaction, query } as never,
      { send: vi.fn().mockRejectedValue(new Error("provider secret")) },
      { write: vi.fn().mockRejectedValue(new Error("audit secret")) } as never,
      new OtpCodeSealer(pepper),
      options,
    );

    await expect(worker.runOnce()).resolves.toBe(true);
    expect(query.mock.calls[0]?.[0]).toContain(`"status" = 'FAILED'`);
    expect(warning).toHaveBeenCalledWith(
      "OTP terminal delivery audit could not be persisted.",
    );
    warning.mockRestore();
  });

  it("allows only a claimed job to be delivered across concurrent workers", async () => {
    const job = claimedJob();
    const claims = [job, null];
    const claim = vi.fn(async () => claims.shift());
    const makeSource = () => ({
      transaction: vi.fn(async (work) => {
        const candidate = await claim();
        if (!candidate) return work({ query: vi.fn().mockResolvedValue([]) });
        let queryCount = 0;
        return work({
          query: vi.fn().mockImplementation(() => {
            queryCount += 1;
            if (queryCount === 1) return [candidate];
            return [{ id: queryCount === 2 ? challengeId : jobId }];
          }),
        });
      }),
      query: vi.fn(),
    });
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
});
