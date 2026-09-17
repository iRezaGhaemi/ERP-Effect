import { createHmac } from "node:crypto";

import { DomainError } from "@effect-erp/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

import { AUTH_OPTIONS, type AuthOptions } from "./auth.options.js";

export type RateLimitScope =
  | "auth:username"
  | "auth:ip"
  | "auth:actor";
export type RateLimitPolicy = { limit: number; windowSeconds: number };

type RateLimitResult = {
  requestCount: number;
  blockedUntil: Date | string | null;
};

export class RateLimitError extends DomainError {
  constructor(readonly retryAfterSeconds: number) {
    super("RATE_LIMITED", "درخواست‌های بیش از حد مجاز ارسال شده است.");
  }
}

@Injectable()
export class RateLimitService {
  private readonly pepper: string;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(AUTH_OPTIONS) options: AuthOptions | string,
  ) {
    this.pepper =
      typeof options === "string" ? options : options.rateLimitSecret;
  }

  async consume(
    scope: RateLimitScope,
    rawKey: string,
    policy: RateLimitPolicy,
  ): Promise<void> {
    const keyHash = createHmac("sha256", this.pepper)
      .update(`${scope}:${rawKey}`)
      .digest("hex");
    const result = await this.dataSource.transaction(async (manager) => {
      const rows = await manager.query<RateLimitResult[]>(
        `INSERT INTO rate_limit_buckets
          (scope, key_hash, window_started_at, request_count, blocked_until, updated_at)
         VALUES ($1, $2, now(), 1, NULL, now())
         ON CONFLICT (scope, key_hash) DO UPDATE SET
           window_started_at = CASE
             WHEN rate_limit_buckets.window_started_at <= now() - ($3 * interval '1 second')
               THEN now()
             ELSE rate_limit_buckets.window_started_at
           END,
           request_count = CASE
             WHEN rate_limit_buckets.window_started_at <= now() - ($3 * interval '1 second')
               THEN 1
             ELSE rate_limit_buckets.request_count + 1
           END,
           blocked_until = CASE
             WHEN rate_limit_buckets.window_started_at <= now() - ($3 * interval '1 second')
               THEN NULL
             WHEN rate_limit_buckets.request_count + 1 > $4
               THEN rate_limit_buckets.window_started_at + ($3 * interval '1 second')
             ELSE rate_limit_buckets.blocked_until
           END,
           updated_at = now()
         RETURNING request_count AS "requestCount", blocked_until AS "blockedUntil"`,
        [scope, keyHash, policy.windowSeconds, policy.limit],
      );
      const row = rows[0];
      if (!row) throw new Error("Rate limit update returned no row.");
      return row;
    });

    if (result.requestCount > policy.limit) {
      const blockedUntil = new Date(result.blockedUntil ?? Date.now());
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((blockedUntil.getTime() - Date.now()) / 1_000),
      );
      throw new RateLimitError(retryAfterSeconds);
    }
  }
}
