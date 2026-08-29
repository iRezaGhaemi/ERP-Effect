import { DomainError, type RequestContext } from "@effect-erp/contracts";
import { describe, expect, it, vi } from "vitest";

import { OtpChallengeEntity, OtpDeliveryJobEntity } from "../entities/index.js";
import { OtpCodeSealer } from "./otp-code-sealer.js";
import { AuthController } from "./auth.controller.js";
import { OtpService } from "./otp.service.js";
import {
  OTP_RESPONSE_PADDING_MILLISECONDS,
  ShortOtpResponseEnvelope,
} from "./otp-response-envelope.js";
import { RateLimitService } from "./rate-limit.service.js";
import { ConsoleSmsProvider } from "./sms/console-sms.provider.js";
import { HttpSmsProvider } from "./sms/http-sms.provider.js";

const pepper = "unit-test-otp-pepper-at-least-32-characters";
const options = { pepper, ttlSeconds: 120, resendSeconds: 60 };
const context: RequestContext = {
  requestId: "req_otp_unit",
  ipAddress: "127.0.0.1",
  userAgent: "vitest",
};

class VirtualResponseTime {
  milliseconds = 0;
  readonly sleeps: number[] = [];
  nowMilliseconds(): number {
    return this.milliseconds;
  }
  async sleep(milliseconds: number): Promise<void> {
    this.sleeps.push(milliseconds);
    this.milliseconds += milliseconds;
  }
}

const immediateEnvelope = new ShortOtpResponseEnvelope(0);

function persistenceDouble() {
  const saved: Array<{ entity: unknown; value: Record<string, unknown> }> = [];
  const transaction = vi.fn(
    async (work: (manager: unknown) => Promise<unknown>) =>
      work({
        getRepository: (entity: unknown) => ({
          create: (value: Record<string, unknown>) => value,
          save: (value: Record<string, unknown>) => {
            saved.push({ entity, value: { ...value } });
            return value;
          },
        }),
      }),
  );
  return { dataSource: { transaction }, saved };
}

describe("OtpService.request", () => {
  it.each([
    ["active", { id: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f" }],
    ["missing", null],
    ["suspended", null],
  ])(
    "returns the same public shape after durable work for %s users",
    async (_kind, foundUser) => {
      const persistence = persistenceDouble();
      const users = { findActiveByPhone: vi.fn().mockResolvedValue(foundUser) };
      const rateLimiter = { consume: vi.fn().mockResolvedValue(undefined) };
      const service = new OtpService(
        persistence.dataSource as never,
        users as never,
        rateLimiter as never,
        options,
        new OtpCodeSealer(pepper),
        immediateEnvelope,
      );

      const result = await service.request({ phone: "09121234567" }, context);

      expect(result).toEqual({
        accepted: true,
        challengeId: expect.any(String),
        retryAfterSeconds: 60,
      });
      expect(rateLimiter.consume).toHaveBeenCalledTimes(3);
      expect(rateLimiter.consume).toHaveBeenCalledWith(
        "otp:resend",
        "+989121234567",
        { limit: 1, windowSeconds: 60 },
      );
      expect(users.findActiveByPhone).toHaveBeenCalledTimes(1);
      expect(persistence.saved).toHaveLength(foundUser ? 2 : 0);
      if (foundUser) {
        expect(persistence.saved.map(({ entity }) => entity)).toEqual([
          OtpChallengeEntity,
          OtpDeliveryJobEntity,
        ]);
        expect(persistence.saved[0]?.value).toMatchObject({
          id: result.challengeId,
          invalidatedAt: expect.any(Date),
        });
        expect(persistence.saved[1]?.value).toMatchObject({
          challengeId: result.challengeId,
          status: "PENDING",
          attempts: 0,
        });
      }
    },
  );

  it("stores only an authenticated ciphertext and challenge hash", async () => {
    const persistence = persistenceDouble();
    const sealer = new OtpCodeSealer(pepper);
    const service = new OtpService(
      persistence.dataSource as never,
      {
        findActiveByPhone: vi
          .fn()
          .mockResolvedValue({ id: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f" }),
      } as never,
      { consume: vi.fn().mockResolvedValue(undefined) } as never,
      options,
      sealer,
      immediateEnvelope,
    );

    const response = await service.request({ phone: "09121234567" }, context);
    const challenge = persistence.saved[0]?.value;
    const job = persistence.saved[1]?.value;
    const code = sealer.unseal(
      {
        ciphertext: String(job?.codeCiphertext),
        nonce: String(job?.codeNonce),
        tag: String(job?.codeTag),
      },
      response.challengeId,
    );

    expect(code).toMatch(/^\d{6}$/);
    expect(challenge).toMatchObject({
      id: response.challengeId,
      codeHash: expect.stringMatching(/^[a-f\d]{64}$/),
      invalidatedAt: expect.any(Date),
    });
    expect(JSON.stringify(persistence.saved)).not.toContain(code);
  });

  it("propagates lookup failure as a generic service failure", async () => {
    const persistence = persistenceDouble();
    const service = new OtpService(
      persistence.dataSource as never,
      {
        findActiveByPhone: vi
          .fn()
          .mockRejectedValue(new Error("database host detail")),
      } as never,
      { consume: vi.fn().mockResolvedValue(undefined) } as never,
      options,
      new OtpCodeSealer(pepper),
      immediateEnvelope,
    );
    await expect(
      service.request({ phone: "09121234567" }, context),
    ).rejects.toMatchObject({ code: "OTP_REQUEST_UNAVAILABLE" });
    expect(persistence.saved).toHaveLength(0);
  });

  it("does not accept when the atomic challenge and delivery job transaction fails", async () => {
    const service = new OtpService(
      {
        transaction: vi.fn().mockRejectedValue(new Error("database detail")),
      } as never,
      {
        findActiveByPhone: vi
          .fn()
          .mockResolvedValue({ id: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f" }),
      } as never,
      { consume: vi.fn().mockResolvedValue(undefined) } as never,
      options,
      new OtpCodeSealer(pepper),
      immediateEnvelope,
    );
    await expect(
      service.request({ phone: "09121234567" }, context),
    ).rejects.toMatchObject({
      code: "OTP_REQUEST_UNAVAILABLE",
      message: "درخواست کد ورود موقتاً در دسترس نیست.",
    });
  });

  it("accounts every bucket when the resend bucket rejects", async () => {
    const rateLimiter = {
      consume: vi.fn().mockImplementation(async (scope: string) => {
        if (scope === "otp:resend")
          throw Object.assign(new Error("limited"), { code: "RATE_LIMITED" });
      }),
    };
    const service = new OtpService(
      {} as never,
      { findActiveByPhone: vi.fn() } as never,
      rateLimiter as never,
      options,
      new OtpCodeSealer(pepper),
      immediateEnvelope,
    );
    await expect(
      service.request({ phone: "09121234567" }, context),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(rateLimiter.consume).toHaveBeenCalledTimes(3);
    expect(rateLimiter.consume).toHaveBeenCalledWith(
      "otp:phone",
      "+989121234567",
      { limit: 5, windowSeconds: 600 },
    );
    expect(rateLimiter.consume).toHaveBeenCalledWith("otp:ip", "127.0.0.1", {
      limit: 20,
      windowSeconds: 600,
    });
  });
});

describe("ShortOtpResponseEnvelope", () => {
  it("uses an injected monotonic clock to add only short padding", async () => {
    const time = new VirtualResponseTime();
    const envelope = new ShortOtpResponseEnvelope(
      OTP_RESPONSE_PADDING_MILLISECONDS,
      time,
      time,
    );
    const result = await envelope.run(async () => {
      time.milliseconds += 25;
      return "accepted";
    });
    expect(result).toBe("accepted");
    expect(time.sleeps).toEqual([50]);
    expect(time.milliseconds).toBe(75);
  });

  it("never adds padding after work exceeds the short mask", async () => {
    const time = new VirtualResponseTime();
    const envelope = new ShortOtpResponseEnvelope(75, time, time);
    await envelope.run(async () => {
      time.milliseconds += 100;
    });
    expect(time.sleeps).toEqual([]);
    expect(time.milliseconds).toBe(100);
  });
});

describe("AuthController", () => {
  it("maps durable persistence failure to a generic 503 envelope", async () => {
    const controller = new AuthController({
      request: vi
        .fn()
        .mockRejectedValue(
          new DomainError(
            "OTP_REQUEST_UNAVAILABLE",
            "درخواست کد ورود موقتاً در دسترس نیست.",
          ),
        ),
    } as never);

    await expect(
      controller.requestOtp(
        { phone: "09121234567" },
        {
          headers: { "x-request-id": "req_failure" },
          ip: "127.0.0.1",
        },
      ),
    ).rejects.toMatchObject({
      status: 503,
      response: {
        error: {
          code: "OTP_REQUEST_UNAVAILABLE",
          requestId: "req_failure",
        },
      },
    });
  });
});

describe("RateLimitService", () => {
  it("blocks the sixth request in the phone window", async () => {
    let requestCount = 0;
    let lastParameters: unknown[] = [];
    const dataSource = {
      transaction: vi.fn(async (work: (manager: unknown) => unknown) =>
        work({
          query: vi.fn().mockImplementation((_sql, parameters: unknown[]) => {
            lastParameters = parameters;
            requestCount += 1;
            return [
              {
                requestCount,
                blockedUntil:
                  requestCount > 5 ? new Date(Date.now() + 600_000) : null,
              },
            ];
          }),
        }),
      ),
    };
    const rateLimiter = new RateLimitService(dataSource as never, pepper);
    for (let count = 0; count < 5; count += 1) {
      await rateLimiter.consume("otp:phone", "+989121234567", {
        limit: 5,
        windowSeconds: 600,
      });
    }
    await expect(
      rateLimiter.consume("otp:phone", "+989121234567", {
        limit: 5,
        windowSeconds: 600,
      }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(lastParameters[0]).toBe("otp:phone");
    expect(lastParameters[1]).toMatch(/^[a-f\d]{64}$/);
    expect(JSON.stringify(lastParameters)).not.toContain("+989121234567");
  });

  it("blocks the second request in the resend window", async () => {
    let requestCount = 0;
    const dataSource = {
      transaction: vi.fn(async (work: (manager: unknown) => unknown) =>
        work({
          query: vi.fn().mockImplementation(() => {
            requestCount += 1;
            return [
              {
                requestCount,
                blockedUntil:
                  requestCount > 1 ? new Date(Date.now() + 60_000) : null,
              },
            ];
          }),
        }),
      ),
    };
    const rateLimiter = new RateLimitService(dataSource as never, pepper);
    await rateLimiter.consume("otp:resend", "+989121234567", {
      limit: 1,
      windowSeconds: 60,
    });
    await expect(
      rateLimiter.consume("otp:resend", "+989121234567", {
        limit: 1,
        windowSeconds: 60,
      }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});

describe("SMS providers", () => {
  it("keeps the OTP out of structured console events and writes it only to the development line", async () => {
    const structured: unknown[] = [];
    const localLines: string[] = [];
    const provider = new ConsoleSmsProvider(
      "development",
      { log: (event: unknown) => structured.push(event) },
      (line) => localLines.push(line),
    );
    await provider.send({
      recipient: "+989121234567",
      message: "کد ورود شما: 123456",
      requestId: "req_console",
    });
    expect(JSON.stringify(structured)).not.toContain("123456");
    expect(localLines).toEqual(["[DEV OTP] +989121234567 کد ورود شما: 123456"]);
  });

  it("refuses to print through the console provider outside development", () => {
    expect(
      () => new ConsoleSmsProvider("production", { log: vi.fn() }, vi.fn()),
    ).toThrow("ConsoleSmsProvider is development-only.");
  });

  it("maps HTTP response details to a stable delivery error", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response("upstream leaked secret detail", { status: 503 }),
      );
    const provider = new HttpSmsProvider(
      "https://sms.example.test/send",
      "bearer-secret",
      fetcher,
    );
    await expect(
      provider.send({
        recipient: "+989121234567",
        message: "کد ورود شما: 123456",
        requestId: "req_http",
      }),
    ).rejects.toMatchObject({
      code: "SMS_DELIVERY_FAILED",
      message: "ارسال پیامک ناموفق بود.",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://sms.example.test/send",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer bearer-secret",
        }),
        body: JSON.stringify({
          recipient: "+989121234567",
          message: "کد ورود شما: 123456",
          requestId: "req_http",
        }),
      }),
    );
  });
});
