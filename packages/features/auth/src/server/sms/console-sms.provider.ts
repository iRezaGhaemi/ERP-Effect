import type { SmsMessage, SmsProvider } from "./sms-provider.js";

export type ConsoleSmsLogger = {
  log(event: Record<string, unknown>): void;
};

export class ConsoleSmsProvider implements SmsProvider {
  constructor(
    environment: string,
    private readonly logger: ConsoleSmsLogger,
    private readonly writeDevelopmentLine: (line: string) => void,
  ) {
    if (environment !== "development") {
      throw new Error("ConsoleSmsProvider is development-only.");
    }
  }

  async send(input: SmsMessage): Promise<void> {
    this.logger.log({
      event: "sms.development_delivery",
      requestId: input.requestId,
      recipient: "[Redacted]",
    });
    this.writeDevelopmentLine(`[DEV OTP] ${input.recipient} ${input.message}`);
  }
}
