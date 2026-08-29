import { createHmac, randomInt, randomUUID } from "node:crypto";

import { AuditWriter } from "@effect/audit/server";
import type { RequestContext } from "@effect-erp/contracts";
import { UsersFacade, normalizeIranianMobile } from "@effect/users/server";
import { Inject, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

import {
  RequestOtpSchema,
  type RequestOtpInput,
  type RequestOtpResponse,
} from "../contracts/index.js";
import { OtpChallengeEntity } from "../entities/index.js";
import { AUTH_OPTIONS, type AuthOptions } from "./auth.options.js";
import {
  OTP_RESPONSE_ENVELOPE,
  type OtpResponseEnvelope,
} from "./otp-response-envelope.js";
import { RateLimitService } from "./rate-limit.service.js";
import { SMS_PROVIDER, type SmsProvider } from "./sms/sms-provider.js";

@Injectable()
export class OtpService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly users: UsersFacade,
    private readonly rateLimiter: RateLimitService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    private readonly auditWriter: AuditWriter,
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
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

    const challengeId = randomUUID();
    return this.responseEnvelope.run(async () => {
      try {
        await this.deliverActiveChallenge(challengeId, phone, context);
      } catch {
        // Accepted responses deliberately conceal membership and infrastructure state.
        // A failure before the pending save sends no SMS; a later failure leaves the
        // already committed challenge invalid.
      }
      return this.accepted(challengeId);
    });
  }

  private async deliverActiveChallenge(
    challengeId: string,
    phone: string,
    context: RequestContext,
  ): Promise<void> {
    const user = await this.users.findActiveByPhone(phone);
    if (!user) return;

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = createHmac("sha256", this.options.pepper)
      .update(`${challengeId}:${code}`)
      .digest("hex");
    const expiresAt = new Date(Date.now() + this.options.ttlSeconds * 1_000);

    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(OtpChallengeEntity);
      await repository.save(
        repository.create({
          id: challengeId,
          userId: user.id,
          phone,
          codeHash,
          attempts: 0,
          expiresAt,
          consumedAt: null,
          invalidatedAt: new Date(),
          requestIp: context.ipAddress,
        }),
      );
    });

    try {
      await this.sms.send({
        recipient: phone,
        message: `کد ورود شما: ${code}`,
        requestId: context.requestId,
      });
    } catch {
      await this.auditDeliveryFailureBestEffort(challengeId, context);
      return;
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager
          .getRepository(OtpChallengeEntity)
          .update({ id: challengeId }, { invalidatedAt: null });
      });
    } catch {
      // Delivery may have been accepted, but an unconfirmed activation must fail closed.
    }
  }

  private accepted(challengeId: string): RequestOtpResponse {
    return {
      accepted: true,
      challengeId,
      retryAfterSeconds: this.options.resendSeconds,
    };
  }

  private async auditDeliveryFailureBestEffort(
    challengeId: string,
    context: RequestContext,
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await this.auditWriter.write(
          {
            actorId: null,
            action: "auth.otp_delivery_failed",
            entityType: "otp_challenges",
            entityId: challengeId,
            metadata: {},
            ipAddress: context.ipAddress,
            requestId: context.requestId,
          },
          manager,
        );
      });
    } catch {
      // The challenge was committed invalid before delivery; audit failure cannot activate it.
    }
  }
}
