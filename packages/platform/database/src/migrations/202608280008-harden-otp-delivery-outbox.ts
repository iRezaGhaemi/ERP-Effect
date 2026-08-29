import type { MigrationInterface, QueryRunner } from "typeorm";

export class HardenOtpDeliveryOutbox202608280008 implements MigrationInterface {
  name = "HardenOtpDeliveryOutbox202608280008";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "otp_challenges" ADD "is_decoy" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_challenges" ALTER COLUMN "user_id" DROP NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "otp_challenges"
      ADD CONSTRAINT "CK_otp_challenges_decoy_user"
      CHECK (("is_decoy" = true AND "user_id" IS NULL) OR ("is_decoy" = false AND "user_id" IS NOT NULL))
    `);

    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" ADD "lease_token" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" ADD "claim_version" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" DROP CONSTRAINT "CK_otp_delivery_jobs_status"`,
    );
    await queryRunner.query(`
      ALTER TABLE "otp_delivery_jobs"
      ADD CONSTRAINT "CK_otp_delivery_jobs_status"
      CHECK ("status" IN ('PENDING', 'PROCESSING', 'AUDIT_PENDING', 'SUCCEEDED', 'FAILED', 'DISCARDED'))
    `);

    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" DROP CONSTRAINT "CK_otp_delivery_jobs_ciphertext"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" DROP CONSTRAINT "CK_otp_delivery_jobs_nonce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" DROP CONSTRAINT "CK_otp_delivery_jobs_tag"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" ALTER COLUMN "code_ciphertext" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" ALTER COLUMN "code_nonce" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" ALTER COLUMN "code_tag" DROP NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "otp_delivery_jobs"
      ADD CONSTRAINT "CK_otp_delivery_jobs_sealed_fields"
      CHECK (("code_ciphertext" IS NULL AND "code_nonce" IS NULL AND "code_tag" IS NULL) OR ("code_ciphertext" IS NOT NULL AND "code_nonce" IS NOT NULL AND "code_tag" IS NOT NULL))
    `);
    await queryRunner.query(`
      ALTER TABLE "otp_delivery_jobs"
      ADD CONSTRAINT "CK_otp_delivery_jobs_ciphertext_null_or_valid"
      CHECK ("code_ciphertext" IS NULL OR length("code_ciphertext") > 0)
    `);
    await queryRunner.query(`
      ALTER TABLE "otp_delivery_jobs"
      ADD CONSTRAINT "CK_otp_delivery_jobs_nonce_null_or_valid"
      CHECK ("code_nonce" IS NULL OR octet_length(decode("code_nonce", 'base64')) = 12)
    `);
    await queryRunner.query(`
      ALTER TABLE "otp_delivery_jobs"
      ADD CONSTRAINT "CK_otp_delivery_jobs_tag_null_or_valid"
      CHECK ("code_tag" IS NULL OR octet_length(decode("code_tag", 'base64')) = 16)
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_otp_delivery_jobs_cleanup" ON "otp_delivery_jobs" ("status", "completed_at", "updated_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_otp_delivery_jobs_lease_token" ON "otp_delivery_jobs" ("lease_token") WHERE "lease_token" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "ix_otp_delivery_jobs_lease_token"`);
    await queryRunner.query(`DROP INDEX "ix_otp_delivery_jobs_cleanup"`);
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" DROP CONSTRAINT "CK_otp_delivery_jobs_tag_null_or_valid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" DROP CONSTRAINT "CK_otp_delivery_jobs_nonce_null_or_valid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" DROP CONSTRAINT "CK_otp_delivery_jobs_ciphertext_null_or_valid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" DROP CONSTRAINT "CK_otp_delivery_jobs_sealed_fields"`,
    );
    await queryRunner.query(`
      DELETE FROM "otp_challenges"
      WHERE "is_decoy" = true OR "user_id" IS NULL
    `);
    await queryRunner.query(`
      DELETE FROM "otp_delivery_jobs"
      WHERE "status" IN ('AUDIT_PENDING', 'DISCARDED')
        OR "code_ciphertext" IS NULL
        OR "code_nonce" IS NULL
        OR "code_tag" IS NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" ALTER COLUMN "code_tag" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" ALTER COLUMN "code_nonce" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" ALTER COLUMN "code_ciphertext" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "otp_delivery_jobs"
      ADD CONSTRAINT "CK_otp_delivery_jobs_tag"
      CHECK (octet_length(decode("code_tag", 'base64')) = 16)
    `);
    await queryRunner.query(`
      ALTER TABLE "otp_delivery_jobs"
      ADD CONSTRAINT "CK_otp_delivery_jobs_nonce"
      CHECK (octet_length(decode("code_nonce", 'base64')) = 12)
    `);
    await queryRunner.query(`
      ALTER TABLE "otp_delivery_jobs"
      ADD CONSTRAINT "CK_otp_delivery_jobs_ciphertext"
      CHECK (length("code_ciphertext") > 0)
    `);
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" DROP CONSTRAINT "CK_otp_delivery_jobs_status"`,
    );
    await queryRunner.query(`
      ALTER TABLE "otp_delivery_jobs"
      ADD CONSTRAINT "CK_otp_delivery_jobs_status"
      CHECK ("status" IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED'))
    `);
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" DROP COLUMN "claim_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_delivery_jobs" DROP COLUMN "lease_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_challenges" DROP CONSTRAINT "CK_otp_challenges_decoy_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_challenges" ALTER COLUMN "user_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_challenges" DROP COLUMN "is_decoy"`,
    );
  }
}
