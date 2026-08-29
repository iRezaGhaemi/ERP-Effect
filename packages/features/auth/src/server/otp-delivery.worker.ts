import { AuditWriter } from "@effect/audit/server";
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { DataSource } from "typeorm";

import { OTP_CODE_SEALER, OtpCodeSealer } from "./otp-code-sealer.js";
import { SMS_PROVIDER, type SmsProvider } from "./sms/sms-provider.js";

export type OtpDeliveryWorkerOptions = {
  enabled: boolean;
  pollMilliseconds: number;
  leaseSeconds: number;
  maxAttempts: number;
};

export const OTP_DELIVERY_WORKER_OPTIONS = Symbol(
  "OTP_DELIVERY_WORKER_OPTIONS",
);

type ClaimedOtpDeliveryJob = {
  id: string;
  challengeId: string;
  codeCiphertext: string;
  codeNonce: string;
  codeTag: string;
  requestId: string;
  attempts: number;
  recipient: string;
  requestIp: string;
};

@Injectable()
export class OtpDeliveryWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(OtpDeliveryWorker.name);
  private stopping = false;
  private loopPromise: Promise<void> | undefined;
  private pollTimer: NodeJS.Timeout | undefined;
  private wakePoll: (() => void) | undefined;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    private readonly auditWriter: AuditWriter,
    @Inject(OTP_CODE_SEALER) private readonly codeSealer: OtpCodeSealer,
    @Inject(OTP_DELIVERY_WORKER_OPTIONS)
    private readonly options: OtpDeliveryWorkerOptions,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.options.enabled || this.loopPromise) return;
    this.stopping = false;
    this.loopPromise = this.runLoop();
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopping = true;
    this.releasePollWait();
    await this.loopPromise;
    this.loopPromise = undefined;
  }

  async runOnce(): Promise<boolean> {
    const job = await this.claimNext();
    if (!job) return false;

    if (job.attempts > this.options.maxAttempts) {
      await this.markTerminal(job);
      return true;
    }

    let code: string;
    try {
      code = this.codeSealer.unseal(
        {
          ciphertext: job.codeCiphertext,
          nonce: job.codeNonce,
          tag: job.codeTag,
        },
        job.challengeId,
      );
    } catch {
      await this.markTerminal(job);
      return true;
    }

    try {
      await this.sms.send({
        recipient: job.recipient,
        message: `کد ورود شما: ${code}`,
        requestId: job.requestId,
      });
    } catch {
      if (job.attempts >= this.options.maxAttempts) {
        await this.markTerminal(job);
      } else {
        await this.scheduleRetry(job);
      }
      return true;
    }

    try {
      await this.activateAndComplete(job);
    } catch {
      await this.markTerminal(job);
    }
    return true;
  }

  private async runLoop(): Promise<void> {
    while (!this.stopping) {
      try {
        const worked = await this.runOnce();
        if (!worked) await this.waitForPoll();
      } catch {
        this.logger.error("OTP delivery worker cycle failed.");
        await this.waitForPoll();
      }
    }
  }

  private async claimNext(): Promise<ClaimedOtpDeliveryJob | null> {
    return this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `
          WITH candidate AS (
            SELECT "id"
            FROM "otp_delivery_jobs"
            WHERE
              ("status" = 'PENDING' AND "available_at" <= now())
              OR ("status" = 'PROCESSING' AND "lease_expires_at" <= now())
            ORDER BY "available_at", "created_at"
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE "otp_delivery_jobs" AS job
          SET
            "status" = 'PROCESSING',
            "attempts" = job."attempts" + 1,
            "lease_expires_at" = now() + ($1 * interval '1 second'),
            "updated_at" = now()
          FROM candidate
          WHERE job."id" = candidate."id"
          RETURNING
            job."id",
            job."challenge_id" AS "challengeId",
            job."code_ciphertext" AS "codeCiphertext",
            job."code_nonce" AS "codeNonce",
            job."code_tag" AS "codeTag",
            job."request_id" AS "requestId",
            job."attempts",
            (SELECT challenge."phone" FROM "otp_challenges" challenge WHERE challenge."id" = job."challenge_id") AS "recipient",
            (SELECT host(challenge."request_ip") FROM "otp_challenges" challenge WHERE challenge."id" = job."challenge_id") AS "requestIp"
        `,
        [this.options.leaseSeconds],
      )) as ClaimedOtpDeliveryJob[];
      return rows[0] ?? null;
    });
  }

  private async scheduleRetry(job: ClaimedOtpDeliveryJob): Promise<void> {
    const delaySeconds = Math.min(30, 2 ** Math.max(0, job.attempts - 1));
    await this.dataSource.query(
      `
        UPDATE "otp_delivery_jobs"
        SET
          "status" = 'PENDING',
          "available_at" = now() + ($2 * interval '1 second'),
          "lease_expires_at" = NULL,
          "updated_at" = now()
        WHERE "id" = $1 AND "challenge_id" = $3 AND "status" = 'PROCESSING'
      `,
      [job.id, delaySeconds, job.challengeId],
    );
  }

  private async activateAndComplete(job: ClaimedOtpDeliveryJob): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const activated = (await manager.query(
        `
          UPDATE "otp_challenges"
          SET "invalidated_at" = NULL
          WHERE
            "id" = $1
            AND "invalidated_at" IS NOT NULL
            AND "consumed_at" IS NULL
            AND "expires_at" > now()
          RETURNING "id"
        `,
        [job.challengeId],
      )) as Array<{ id: string }>;
      if (activated.length !== 1 || activated[0]?.id !== job.challengeId) {
        throw new Error("OTP challenge activation failed.");
      }
      const completed = (await manager.query(
        `
          UPDATE "otp_delivery_jobs"
          SET
            "status" = 'SUCCEEDED',
            "lease_expires_at" = NULL,
            "completed_at" = now(),
            "updated_at" = now()
          WHERE "id" = $1 AND "challenge_id" = $2 AND "status" = 'PROCESSING'
          RETURNING "id"
        `,
        [job.id, job.challengeId],
      )) as Array<{ id: string }>;
      if (completed.length !== 1) {
        throw new Error("OTP delivery completion failed.");
      }
    });
  }

  private async markTerminal(job: ClaimedOtpDeliveryJob): Promise<void> {
    await this.dataSource.query(
      `
        UPDATE "otp_delivery_jobs"
        SET
          "status" = 'FAILED',
          "lease_expires_at" = NULL,
          "completed_at" = now(),
          "updated_at" = now()
        WHERE "id" = $1 AND "challenge_id" = $2 AND "status" = 'PROCESSING'
      `,
      [job.id, job.challengeId],
    );
    try {
      await this.dataSource.transaction(async (manager) => {
        await this.auditWriter.write(
          {
            actorId: null,
            action: "auth.otp_delivery_failed",
            entityType: "otp_challenges",
            entityId: job.challengeId,
            metadata: {},
            ipAddress: job.requestIp,
            requestId: job.requestId,
          },
          manager,
        );
      });
    } catch {
      this.logger.warn("OTP terminal delivery audit could not be persisted.");
    }
  }

  private waitForPoll(): Promise<void> {
    if (this.stopping) return Promise.resolve();
    return new Promise((resolve) => {
      const finish = () => {
        if (this.pollTimer) clearTimeout(this.pollTimer);
        this.pollTimer = undefined;
        this.wakePoll = undefined;
        resolve();
      };
      this.wakePoll = finish;
      this.pollTimer = setTimeout(finish, this.options.pollMilliseconds);
    });
  }

  private releasePollWait(): void {
    this.wakePoll?.();
  }
}
