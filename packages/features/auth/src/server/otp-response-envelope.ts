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

/**
 * The SMS adapter is bounded to five seconds. The additional second normally
 * absorbs membership and challenge database work so accepted branches expose
 * the same minimum response duration.
 */
export const OTP_RESPONSE_FLOOR_MILLISECONDS = 6_000;

const systemClock: OtpResponseClock = {
  nowMilliseconds: () => Date.now(),
};

const systemSleeper: OtpResponseSleeper = {
  sleep: (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
};

export class MinimumDurationOtpResponseEnvelope implements OtpResponseEnvelope {
  constructor(
    private readonly floorMilliseconds = OTP_RESPONSE_FLOOR_MILLISECONDS,
    private readonly clock: OtpResponseClock = systemClock,
    private readonly sleeper: OtpResponseSleeper = systemSleeper,
  ) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    const startedAt = this.clock.nowMilliseconds();
    try {
      return await work();
    } finally {
      const elapsed = this.clock.nowMilliseconds() - startedAt;
      const remaining = Math.max(0, this.floorMilliseconds - elapsed);
      if (remaining > 0) await this.sleeper.sleep(remaining);
    }
  }
}
