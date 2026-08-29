export type OtpBackgroundTask = () => Promise<void>;

export interface OtpBackgroundRunner {
  schedule(task: OtpBackgroundTask): void;
}

export const OTP_BACKGROUND_RUNNER = Symbol("OTP_BACKGROUND_RUNNER");

export class InProcessOtpBackgroundRunner implements OtpBackgroundRunner {
  schedule(task: OtpBackgroundTask): void {
    queueMicrotask(() => {
      void task().catch(() => undefined);
    });
  }
}
