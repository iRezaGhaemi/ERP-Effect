import { DomainError } from "@effect-erp/contracts";

import type { SmsMessage, SmsProvider } from "./sms-provider.js";

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export const HTTP_SMS_PROVIDER_TIMEOUT_MILLISECONDS = 5_000;

function deliveryFailed(): DomainError {
  return new DomainError("SMS_DELIVERY_FAILED", "ارسال پیامک ناموفق بود.");
}

export class HttpSmsProvider implements SmsProvider {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMilliseconds = HTTP_SMS_PROVIDER_TIMEOUT_MILLISECONDS,
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
