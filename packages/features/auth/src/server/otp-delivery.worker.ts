import { randomUUID } from "node:crypto";

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
  providerTimeoutSeconds: number;
  activationMarginSeconds: number;
  maxAttempts: number;
  terminalRetentionSeconds: number;
  cleanupBatchSize: number;
  cleanupIntervalMilliseconds: number;
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
  leaseToken: string;
  claimVersion: number;
  expiresAt: Date | string;
  recipient: string;
  requestIp: string;
};

type ClaimedOtpAuditJob = {
  id: string;
  challengeId: string;
  requestId: string;
  attempts: number;
  leaseToken: string;
  claimVersion: number;
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
  private nextCleanupAtMilliseconds = 0;

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
    this.nextCleanupAtMilliseconds = 0;
    this.loopPromise = this.runLoop();
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopping = true;
    this.releasePollWait();
    await this.loopPromise;
    this.loopPromise = undefined;
  }

  async runOnce(): Promise<boolean> {
    const deliveryJob = await this.claimNextDelivery();
    if (deliveryJob) {
      await this.processDelivery(deliveryJob);
      return true;
    }

    const auditJob = await this.claimNextAuditPending();
    if (auditJob) {
      await this.finalizeAuditPending(auditJob);
      return true;
    }

    return false;
  }

  async cleanupTerminalRows(): Promise<number> {
    const rows = await this.dataSource.query<Array<{ deletedCount: string }>>(
      `
        WITH expired AS (
          SELECT challenge."id"
          FROM "otp_challenges" challenge
          JOIN "otp_delivery_jobs" job ON job."challenge_id" = challenge."id"
          WHERE
            job."status" IN ('SUCCEEDED', 'FAILED', 'DISCARDED')
            AND challenge."expires_at" <= now()
            AND COALESCE(job."completed_at", job."updated_at") <= now() - ($1 * interval '1 second')
          ORDER BY COALESCE(job."completed_at", job."updated_at"), challenge."id"
          LIMIT $2
        ),
        deleted AS (
          DELETE FROM "otp_challenges"
          WHERE "id" IN (SELECT "id" FROM expired)
          RETURNING "id"
        )
        SELECT COUNT(*)::text AS "deletedCount" FROM deleted
      `,
      [this.options.terminalRetentionSeconds, this.options.cleanupBatchSize],
    );
    return Number(rows[0]?.deletedCount ?? 0);
  }

  private async processDelivery(job: ClaimedOtpDeliveryJob): Promise<void> {
    if (
      job.attempts > this.options.maxAttempts ||
      this.expiresBeforeProviderCanFinish(job)
    ) {
      await this.markAuditPendingAndFinalize(job);
      return;
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
      await this.markAuditPendingAndFinalize(job);
      return;
    }

    try {
      await this.sms.send({
        recipient: job.recipient,
        message: `کد ورود شما: ${code}`,
        requestId: job.id,
      });
    } catch {
      if (job.attempts >= this.options.maxAttempts) {
        await this.markAuditPendingAndFinalize(job);
      } else {
        await this.scheduleRetry(job);
      }
      return;
    }

    try {
      await this.activateAndComplete(job);
    } catch {
      await this.markAuditPendingAndFinalize(job);
    }
  }

  private async runLoop(): Promise<void> {
    while (!this.stopping) {
      let worked = false;
      try {
        worked = await this.runOnce();
      } catch {
        this.logger.error("OTP delivery worker cycle failed.");
      }
      if (!this.stopping) await this.cleanupIfDue();
      if (!worked) await this.waitForPoll();
    }
  }

  private async cleanupIfDue(): Promise<void> {
    const now = Date.now();
    if (now < this.nextCleanupAtMilliseconds) return;
    this.nextCleanupAtMilliseconds =
      now + this.options.cleanupIntervalMilliseconds;
    try {
      await this.cleanupTerminalRows();
    } catch {
      this.logger.error("OTP terminal cleanup failed.");
    }
  }

  private async claimNextDelivery(): Promise<ClaimedOtpDeliveryJob | null> {
    const leaseToken = randomUUID();
    return this.dataSource.transaction(async (manager) => {
      const [rows] = await manager.query<[ClaimedOtpDeliveryJob[], number]>(
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
            "lease_token" = $2,
            "claim_version" = job."claim_version" + 1,
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
            job."lease_token" AS "leaseToken",
            job."claim_version" AS "claimVersion",
            (SELECT challenge."expires_at" FROM "otp_challenges" challenge WHERE challenge."id" = job."challenge_id") AS "expiresAt",
            (SELECT challenge."phone" FROM "otp_challenges" challenge WHERE challenge."id" = job."challenge_id") AS "recipient",
            (SELECT host(challenge."request_ip") FROM "otp_challenges" challenge WHERE challenge."id" = job."challenge_id") AS "requestIp"
        `,
        [this.options.leaseSeconds, leaseToken],
      );
      return rows[0] ?? null;
    });
  }

  private async claimNextAuditPending(): Promise<ClaimedOtpAuditJob | null> {
    const leaseToken = randomUUID();
    return this.dataSource.transaction(async (manager) => {
      const [rows] = await manager.query<[ClaimedOtpAuditJob[], number]>(
        `
          WITH candidate AS (
            SELECT "id"
            FROM "otp_delivery_jobs"
            WHERE
              "status" = 'AUDIT_PENDING'
              AND ("lease_expires_at" IS NULL OR "lease_expires_at" <= now())
            ORDER BY "updated_at", "created_at"
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE "otp_delivery_jobs" AS job
          SET
            "lease_token" = $2,
            "claim_version" = job."claim_version" + 1,
            "lease_expires_at" = now() + ($1 * interval '1 second'),
            "updated_at" = now()
          FROM candidate
          WHERE job."id" = candidate."id"
          RETURNING
            job."id",
            job."challenge_id" AS "challengeId",
            job."request_id" AS "requestId",
            job."attempts",
            job."lease_token" AS "leaseToken",
            job."claim_version" AS "claimVersion",
            (SELECT host(challenge."request_ip") FROM "otp_challenges" challenge WHERE challenge."id" = job."challenge_id") AS "requestIp"
        `,
        [this.options.leaseSeconds, leaseToken],
      );
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
          "lease_token" = NULL,
          "lease_expires_at" = NULL,
          "updated_at" = now()
        WHERE
          "id" = $1
          AND "challenge_id" = $3
          AND "lease_token" = $4
          AND "claim_version" = $5
          AND "status" = 'PROCESSING'
      `,
      [job.id, delaySeconds, job.challengeId, job.leaseToken, job.claimVersion],
    );
  }

  private async activateAndComplete(job: ClaimedOtpDeliveryJob): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const [activated] = await manager.query<[Array<{ id: string }>, number]>(
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
      );
      if (activated.length !== 1 || activated[0]?.id !== job.challengeId) {
        throw new Error("OTP challenge activation failed.");
      }
      const [completed] = await manager.query<[Array<{ id: string }>, number]>(
        `
          UPDATE "otp_delivery_jobs"
          SET
            "status" = 'SUCCEEDED',
            "code_ciphertext" = NULL,
            "code_nonce" = NULL,
            "code_tag" = NULL,
            "lease_token" = NULL,
            "lease_expires_at" = NULL,
            "completed_at" = now(),
            "updated_at" = now()
          WHERE
            "id" = $1
            AND "challenge_id" = $2
            AND "lease_token" = $3
            AND "claim_version" = $4
            AND "status" = 'PROCESSING'
          RETURNING "id"
        `,
        [job.id, job.challengeId, job.leaseToken, job.claimVersion],
      );
      if (completed.length !== 1) {
        throw new Error("OTP delivery completion failed.");
      }
    });
  }

  private async markAuditPendingAndFinalize(
    job: ClaimedOtpDeliveryJob,
  ): Promise<void> {
    const moved = await this.moveToAuditPending(job);
    if (!moved) return;
    await this.finalizeAuditPending(job);
  }

  private async moveToAuditPending(
    job: ClaimedOtpDeliveryJob,
  ): Promise<boolean> {
    const [rows] = await this.dataSource.query<[Array<{ id: string }>, number]>(
      `
        UPDATE "otp_delivery_jobs"
        SET
          "status" = 'AUDIT_PENDING',
          "code_ciphertext" = NULL,
          "code_nonce" = NULL,
          "code_tag" = NULL,
          "lease_expires_at" = NULL,
          "updated_at" = now()
        WHERE
          "id" = $1
          AND "challenge_id" = $2
          AND "lease_token" = $3
          AND "claim_version" = $4
          AND "status" = 'PROCESSING'
        RETURNING "id"
      `,
      [job.id, job.challengeId, job.leaseToken, job.claimVersion],
    );
    return rows.length === 1;
  }

  private async finalizeAuditPending(job: ClaimedOtpAuditJob): Promise<void> {
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
        const [finalized] = await manager.query<
          [Array<{ id: string }>, number]
        >(
          `
            UPDATE "otp_delivery_jobs"
            SET
              "status" = 'FAILED',
              "code_ciphertext" = NULL,
              "code_nonce" = NULL,
              "code_tag" = NULL,
              "lease_token" = NULL,
              "lease_expires_at" = NULL,
              "completed_at" = now(),
              "updated_at" = now()
            WHERE
              "id" = $1
              AND "challenge_id" = $2
              AND "lease_token" = $3
              AND "claim_version" = $4
              AND "status" = 'AUDIT_PENDING'
            RETURNING "id"
          `,
          [job.id, job.challengeId, job.leaseToken, job.claimVersion],
        );
        if (finalized.length !== 1) {
          throw new Error("OTP delivery terminalization failed.");
        }
      });
    } catch {
      this.logger.warn("OTP terminal delivery audit could not be persisted.");
    }
  }

  private expiresBeforeProviderCanFinish(job: ClaimedOtpDeliveryJob): boolean {
    const expiresAt =
      job.expiresAt instanceof Date ? job.expiresAt : new Date(job.expiresAt);
    const remainingMilliseconds = expiresAt.getTime() - Date.now();
    return (
      remainingMilliseconds <=
      (this.options.providerTimeoutSeconds +
        this.options.activationMarginSeconds) *
        1_000
    );
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
