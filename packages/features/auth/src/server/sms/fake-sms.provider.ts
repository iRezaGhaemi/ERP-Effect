import type { SmsMessage, SmsProvider } from "./sms-provider.js";

export class FakeSmsProvider implements SmsProvider {
  readonly sent: SmsMessage[] = [];

  async send(input: SmsMessage): Promise<void> {
    this.sent.push({ ...input });
    return Promise.resolve();
  }
}
