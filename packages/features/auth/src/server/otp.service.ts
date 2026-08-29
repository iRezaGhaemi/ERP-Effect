import { createHmac, randomInt, randomUUID } from "node:crypto";

import { DomainError, type RequestContext } from "@effect-erp/contracts";
import { UsersFacade, normalizeIranianMobile } from "@effect/users/server";
import { Inject, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

import {
  RequestOtpSchema,
  type RequestOtpInput,
  type RequestOtpResponse,
} from "../contracts/index.js";
import { OtpChallengeEntity, OtpDeliveryJobEntity } from "../entities/index.js";
import { AUTH_OPTIONS, type AuthOptions } from "./auth.options.js";
import { OTP_CODE_SEALER, OtpCodeSealer } from "./otp-code-sealer.js";
import {
  OTP_RESPONSE_ENVELOPE,
  type OtpResponseEnvelope,
} from "./otp-response-envelope.js";
import { RateLimitService } from "./rate-limit.service.js";

function requestUnavailable(): DomainError {
  return new DomainError(
    "OTP_REQUEST_UNAVAILABLE",
    "درخواست کد ورود موقتاً در دسترس نیست.",
  );
}

const DECOY_PHONE = "+980000000000";
const DECOY_REQUEST_IP = "0.0.0.0";

@Injectable()
export class OtpService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly users: UsersFacade,
    private readonly rateLimiter: RateLimitService,
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
    @Inject(OTP_CODE_SEALER) private readonly codeSealer: OtpCodeSealer,
    @Inject(OTP_RESPONSE_ENVELOPE)
    private readonly responseEnvelope: OtpResponseEnvelope,
  ) {}

  async request(
    input: RequestOtpInput,
    context: RequestContext,
  ): Promise<RequestOtpResponse> {
    const values = RequestOtpSchema.parse(input);
    const phone = normalizeIranianMobile(values.phone);
    const rateLimitResults = await Promise.allSettled([
      this.rateLimiter.consume("otp:phone", phone, {
        limit: 5,
        windowSeconds: 600,
      }),
      this.rateLimiter.consume("otp:ip", context.ipAddress, {
        limit: 20,
        windowSeconds: 600,
      }),
      this.rateLimiter.consume("otp:resend", phone, {
        limit: 1,
        windowSeconds: this.options.resendSeconds,
      }),
    ]);
    const rejected = rateLimitResults.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (rejected) throw rejected.reason;

    return this.responseEnvelope.run(async () => {
      try {
        const challengeId = await this.persistDeliveryRecord(phone, context);
        return this.accepted(challengeId);
      } catch {
        throw requestUnavailable();
      }
    });
  }

  private async persistDeliveryRecord(
    phone: string,
    context: RequestContext,
  ): Promise<string> {
    const user = await this.users.findActiveByPhone(phone);
    const isDecoy = !user;
    const challengeId = randomUUID();
    const responseChallengeId = isDecoy ? randomUUID() : challengeId;
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = createHmac("sha256", this.options.pepper)
      .update(`${challengeId}:${code}`)
      .digest("hex");
    const expiresAt = new Date(Date.now() + this.options.ttlSeconds * 1_000);
    const sealed = this.codeSealer.seal(code, challengeId);
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      const challenges = manager.getRepository(OtpChallengeEntity);
      await challenges.save(
        challenges.create({
          id: challengeId,
          userId: user?.id ?? null,
          isDecoy,
          phone: isDecoy ? DECOY_PHONE : phone,
          codeHash,
          attempts: 0,
          expiresAt,
          consumedAt: null,
          invalidatedAt: now,
          requestIp: isDecoy ? DECOY_REQUEST_IP : context.ipAddress,
        }),
      );
      const jobs = manager.getRepository(OtpDeliveryJobEntity);
      await jobs.save(
        jobs.create({
          id: randomUUID(),
          challengeId,
          codeCiphertext: isDecoy ? null : sealed.ciphertext,
          codeNonce: isDecoy ? null : sealed.nonce,
          codeTag: isDecoy ? null : sealed.tag,
          requestId: context.requestId.slice(0, 128) || "unknown",
          status: isDecoy ? "DISCARDED" : "PENDING",
          attempts: 0,
          availableAt: now,
          leaseExpiresAt: null,
          leaseToken: null,
          claimVersion: 0,
          completedAt: isDecoy ? now : null,
        }),
      );
    });
    return responseChallengeId;
  }

  private accepted(challengeId: string): RequestOtpResponse {
    return {
      accepted: true,
      challengeId,
      retryAfterSeconds: this.options.resendSeconds,
    };
  }
}
