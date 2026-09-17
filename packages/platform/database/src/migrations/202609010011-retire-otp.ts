import type { MigrationInterface, QueryRunner } from "typeorm";

export class RetireOtp202609010011 implements MigrationInterface {
  name = "RetireOtp1788220800011";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sessions"
        ADD COLUMN "credential_version" integer NOT NULL DEFAULT 0,
        ADD CONSTRAINT "CK_sessions_credential_version_nonnegative"
          CHECK ("credential_version" >= 0)
    `);
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "CK_sessions_revocation_reason"`,
    );
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD CONSTRAINT "CK_sessions_revocation_reason"
      CHECK (
        "revoked_reason" IS NULL OR "revoked_reason" IN (
          'LOGOUT', 'LOGOUT_ALL', 'ADMIN_REVOKED', 'REFRESH_REUSE',
          'SESSION_EXPIRED', 'USER_SUSPENDED', 'AUTH_METHOD_CHANGED',
          'PASSWORD_CHANGED', 'PASSWORD_RESET'
        )
      )
    `);
    await queryRunner.query(`
      UPDATE "sessions"
      SET "revoked_at" = now(),
          "revoked_reason" = 'AUTH_METHOD_CHANGED'
      WHERE "revoked_at" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "refresh_tokens"
      SET "revoked_at" = now()
      WHERE "revoked_at" IS NULL
    `);
    await queryRunner.query(
      `DELETE FROM "rate_limit_buckets" WHERE "scope" LIKE 'otp:%'`,
    );
    await queryRunner.query(`DROP TABLE "otp_delivery_jobs"`);
    await queryRunner.query(`DROP TABLE "otp_challenges"`);
  }

  down(): Promise<void> {
    return Promise.reject(
      new Error(
        "RetireOtp202609010011 is irreversible; restore the controlled database backup.",
      ),
    );
  }
}
