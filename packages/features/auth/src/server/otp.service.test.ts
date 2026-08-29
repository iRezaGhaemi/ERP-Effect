import type { RequestContext } from "@effect-erp/contracts";
import { describe, expect, it, vi } from "vitest";

import { FakeSmsProvider } from "./sms/fake-sms.provider.js";
import { ConsoleSmsProvider } from "./sms/console-sms.provider.js";
import { HttpSmsProvider } from "./sms/http-sms.provider.js";
import { OtpService } from "./otp.service.js";
import { InProcessOtpBackgroundRunner } from "./otp-background-runner.js";
import { RateLimitService } from "./rate-limit.service.js";

const context: RequestContext = {
  requestId: "req_otp_unit",
  ipAddress: "127.0.0.1",
  userAgent: "vitest",
};

class ControlledBackgroundRunner {
  readonly tasks: Array<() => Promise<void>> = [];

  schedule(task: () => Promise<void>): void {
    this.tasks.push(task);
  }

  async runAll(): Promise<void> {
    const tasks = this.tasks.splice(0);
    await Promise.all(tasks.map(async (task) => task().catch(() => undefined)));
  }
}

describe("OtpService.request", () => {
  it.each([
    ["active", { id: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f" }],
    ["missing", null],
    ["suspended", null],
  ])("returns the same public shape for %s users", async (_kind, foundUser) => {
    const saved: unknown[] = [];
    const dataSource = {
      transaction: vi.fn(async (work: (manager: unknown) => unknown) =>
        work({
          getRepository: () => ({
            create: (value: unknown) => value,
            save: (value: unknown) => {
              saved.push(value);
              return value;
            },
            update: vi.fn(),
          }),
        }),
      ),
    };
    const users = { findActiveByPhone: vi.fn().mockResolvedValue(foundUser) };
    const rateLimiter = { consume: vi.fn().mockResolvedValue(undefined) };
    const sms = new FakeSmsProvider();
    const audit = { write: vi.fn().mockResolvedValue(undefined) };
    const background = new ControlledBackgroundRunner();
    const service = new OtpService(
      dataSource as never,
      users as never,
      rateLimiter as never,
      sms,
      audit as never,
      {
        pepper: "unit-test-otp-pepper-at-least-32-characters",
        ttlSeconds: 120,
        resendSeconds: 60,
      },
      background,
    );

    const result = await service.request({ phone: "09121234567" }, context);

    expect(result).toEqual({
      accepted: true,
      challengeId: expect.any(String),
      retryAfterSeconds: 60,
    });
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
    expect(rateLimiter.consume).toHaveBeenCalledWith(
      "otp:resend",
      "+989121234567",
      { limit: 1, windowSeconds: 60 },
    );
    expect(users.findActiveByPhone).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
    expect(sms.sent).toHaveLength(0);
    expect(background.tasks).toHaveLength(1);

    await background.runAll();

    expect(users.findActiveByPhone).toHaveBeenCalledTimes(1);
    expect(saved).toHaveLength(foundUser ? 1 : 0);
    expect(sms.sent).toHaveLength(foundUser ? 1 : 0);
  });

  it("keeps a challenge invalid when delivery fails and failure auditing is unavailable", async () => {
    let persisted: Record<string, unknown> | undefined;
    const repository = {
      create: (value: Record<string, unknown>) => value,
      save: (value: Record<string, unknown>) => {
        persisted = { ...value };
        return value;
      },
      update: (_criteria: unknown, value: Record<string, unknown>) => {
        persisted = { ...persisted, ...value };
      },
    };
    const dataSource = {
      transaction: vi.fn(async (work: (manager: unknown) => unknown) =>
        work({ getRepository: () => repository }),
      ),
    };
    const background = new ControlledBackgroundRunner();
    const service = new OtpService(
      dataSource as never,
      {
        findActiveByPhone: vi
          .fn()
          .mockResolvedValue({ id: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f" }),
      } as never,
      { consume: vi.fn().mockResolvedValue(undefined) } as never,
      {
        send: async () => {
          throw new Error("provider failure detail");
        },
      },
      {
        write: vi.fn().mockRejectedValue(new Error("audit unavailable")),
      } as never,
      {
        pepper: "unit-test-otp-pepper-at-least-32-characters",
        ttlSeconds: 120,
        resendSeconds: 60,
      },
      background,
    );

    const response = await service.request({ phone: "09121234567" }, context);
    expect(response).toEqual({
      accepted: true,
      challengeId: expect.any(String),
      retryAfterSeconds: 60,
    });
    expect(persisted).toBeUndefined();

    await background.runAll();

    expect(persisted).toMatchObject({
      id: response.challengeId,
      invalidatedAt: expect.any(Date),
    });
    expect(persisted?.invalidatedAt).not.toBeNull();
  });

  it("leaves the pending challenge invalid when activation fails after accepted delivery", async () => {
    let persisted: Record<string, unknown> | undefined;
    const repository = {
      create: (value: Record<string, unknown>) => value,
      save: (value: Record<string, unknown>) => {
        persisted = { ...value };
        return value;
      },
      update: (_criteria: unknown, value: Record<string, unknown>) => {
        if (value.invalidatedAt === null)
          throw new Error("database unavailable");
        persisted = { ...persisted, ...value };
      },
    };
    const background = new ControlledBackgroundRunner();
    const sms = new FakeSmsProvider();
    const service = new OtpService(
      {
        transaction: vi.fn(async (work: (manager: unknown) => unknown) =>
          work({ getRepository: () => repository }),
        ),
      } as never,
      {
        findActiveByPhone: vi
          .fn()
          .mockResolvedValue({ id: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f" }),
      } as never,
      { consume: vi.fn().mockResolvedValue(undefined) } as never,
      sms,
      { write: vi.fn() } as never,
      {
        pepper: "unit-test-otp-pepper-at-least-32-characters",
        ttlSeconds: 120,
        resendSeconds: 60,
      },
      background,
    );

    const response = await service.request({ phone: "09121234567" }, context);
    await background.runAll();

    expect(sms.sent).toHaveLength(1);
    expect(persisted).toMatchObject({
      id: response.challengeId,
      invalidatedAt: expect.any(Date),
    });
    expect(persisted?.invalidatedAt).not.toBeNull();
  });

  it("persists only a hash of the generated code", async () => {
    let persisted: Record<string, unknown> | undefined;
    const background = new ControlledBackgroundRunner();
    const dataSource = {
      transaction: vi.fn(async (work: (manager: unknown) => unknown) =>
        work({
          getRepository: () => ({
            create: (value: Record<string, unknown>) => value,
            save: (value: Record<string, unknown>) => {
              persisted = { ...value };
              return value;
            },
            update: (_criteria: unknown, value: Record<string, unknown>) => {
              persisted = { ...persisted, ...value };
            },
          }),
        }),
      ),
    };
    const sms = new FakeSmsProvider();
    const service = new OtpService(
      dataSource as never,
      {
        findActiveByPhone: vi
          .fn()
          .mockResolvedValue({ id: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f" }),
      } as never,
      { consume: vi.fn().mockResolvedValue(undefined) } as never,
      sms,
      { write: vi.fn() } as never,
      {
        pepper: "unit-test-otp-pepper-at-least-32-characters",
        ttlSeconds: 120,
        resendSeconds: 60,
      },
      background,
    );

    const response = await service.request({ phone: "09121234567" }, context);
    await background.runAll();
    const deliveredCode = sms.sent[0]?.message.match(/\d{6}/)?.[0];

    expect(deliveredCode).toMatch(/^\d{6}$/);
    expect(JSON.stringify(persisted)).not.toContain(deliveredCode);
    expect(persisted).toMatchObject({
      id: response.challengeId,
      attempts: 0,
      codeHash: expect.stringMatching(/^[a-f\d]{64}$/),
      invalidatedAt: null,
    });
  });

  it("keeps the pending challenge invalid and audits a delivery failure", async () => {
    let persisted: Record<string, unknown> | undefined;
    const audit = { write: vi.fn().mockResolvedValue(undefined) };
    const repository = {
      create: (value: Record<string, unknown>) => value,
      save: (value: Record<string, unknown>) => {
        persisted = { ...value };
        return value;
      },
      update: vi.fn(),
    };
    const dataSource = {
      transaction: vi.fn(async (work: (manager: unknown) => unknown) =>
        work({ getRepository: () => repository }),
      ),
    };
    const background = new ControlledBackgroundRunner();
    const service = new OtpService(
      dataSource as never,
      {
        findActiveByPhone: vi
          .fn()
          .mockResolvedValue({ id: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f" }),
      } as never,
      { consume: vi.fn().mockResolvedValue(undefined) } as never,
      {
        send: async () => {
          throw new Error("upstream body with bearer-secret");
        },
      },
      audit as never,
      {
        pepper: "unit-test-otp-pepper-at-least-32-characters",
        ttlSeconds: 120,
        resendSeconds: 60,
      },
      background,
    );

    const response = await service.request({ phone: "09121234567" }, context);
    expect(response).toEqual({
      accepted: true,
      challengeId: expect.any(String),
      retryAfterSeconds: 60,
    });
    expect(audit.write).not.toHaveBeenCalled();

    await background.runAll();

    expect(persisted).toMatchObject({ invalidatedAt: expect.any(Date) });
    expect(repository.update).not.toHaveBeenCalled();
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.otp_delivery_failed",
        metadata: {},
      }),
      expect.anything(),
    );
    expect(JSON.stringify(audit.write.mock.calls)).not.toContain(
      "bearer-secret",
    );
  });

  it("accounts every bucket when the resend bucket rejects", async () => {
    const rateLimiter = {
      consume: vi.fn().mockImplementation(async (scope: string) => {
        if (scope === "otp:resend") {
          throw Object.assign(new Error("limited"), { code: "RATE_LIMITED" });
        }
      }),
    };
    const background = new ControlledBackgroundRunner();
    const service = new OtpService(
      {} as never,
      { findActiveByPhone: vi.fn() } as never,
      rateLimiter as never,
      new FakeSmsProvider(),
      { write: vi.fn() } as never,
      {
        pepper: "unit-test-otp-pepper-at-least-32-characters",
        ttlSeconds: 120,
        resendSeconds: 60,
      },
      background,
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
    expect(background.tasks).toHaveLength(0);
  });
});

describe("InProcessOtpBackgroundRunner", () => {
  it("defers delivery work outside the request call stack", async () => {
    const task = vi.fn().mockResolvedValue(undefined);
    const runner = new InProcessOtpBackgroundRunner();

    runner.schedule(task);

    expect(task).not.toHaveBeenCalled();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(task).toHaveBeenCalledTimes(1);
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
    const rateLimiter = new RateLimitService(
      dataSource as never,
      "unit-test-otp-pepper-at-least-32-characters",
    );

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
    const rateLimiter = new RateLimitService(
      dataSource as never,
      "unit-test-otp-pepper-at-least-32-characters",
    );

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
