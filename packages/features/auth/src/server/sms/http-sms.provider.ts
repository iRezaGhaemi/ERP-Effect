import { DomainError } from "@effect-erp/contracts";

import type { SmsMessage, SmsProvider } from "./sms-provider.js";

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function deliveryFailed(): DomainError {
  return new DomainError("SMS_DELIVERY_FAILED", "ارسال پیامک ناموفق بود.");
}

export class HttpSmsProvider implements SmsProvider {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMilliseconds = 5_000,
  ) {}

  async send(input: SmsMessage): Promise<void> {
    try {
      const response = await this.fetcher(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(this.timeoutMilliseconds),
      });
      if (!response.ok) throw deliveryFailed();
    } catch {
      throw deliveryFailed();
    }
  }
}
