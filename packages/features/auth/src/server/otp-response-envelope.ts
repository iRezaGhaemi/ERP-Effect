import { performance } from "node:perf_hooks";

export interface OtpResponseClock {
  nowMilliseconds(): number;
}

export interface OtpResponseSleeper {
  sleep(milliseconds: number): Promise<void>;
}

export interface OtpResponseEnvelope {
  run<T>(work: () => Promise<T>): Promise<T>;
}

export const OTP_RESPONSE_ENVELOPE = Symbol("OTP_RESPONSE_ENVELOPE");

/** Short padding masks normal active persistence without retaining provider sockets. */
export const OTP_RESPONSE_PADDING_MILLISECONDS = 75;

const systemClock: OtpResponseClock = {
  nowMilliseconds: () => performance.now(),
};

const systemSleeper: OtpResponseSleeper = {
  sleep: (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
};

export class ShortOtpResponseEnvelope implements OtpResponseEnvelope {
  constructor(
    private readonly paddingMilliseconds = OTP_RESPONSE_PADDING_MILLISECONDS,
    private readonly clock: OtpResponseClock = systemClock,
    private readonly sleeper: OtpResponseSleeper = systemSleeper,
  ) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    const startedAt = this.clock.nowMilliseconds();
    try {
      return await work();
    } finally {
      const elapsed = this.clock.nowMilliseconds() - startedAt;
      const remaining = Math.max(0, this.paddingMilliseconds - elapsed);
      if (remaining > 0) await this.sleeper.sleep(remaining);
    }
  }
}
