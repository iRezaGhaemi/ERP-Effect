import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOtpDeliveryOutbox202608280007 implements MigrationInterface {
  name = "CreateOtpDeliveryOutbox1787875200007";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "otp_delivery_jobs" (
        "id" uuid NOT NULL,
        "challenge_id" uuid NOT NULL,
        "code_ciphertext" text NOT NULL,
        "code_nonce" character varying(24) NOT NULL,
        "code_tag" character varying(24) NOT NULL,
        "request_id" character varying(128) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'PENDING',
        "attempts" smallint NOT NULL DEFAULT 0,
        "available_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "lease_expires_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otp_delivery_jobs_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_otp_delivery_jobs_challenge_id" UNIQUE ("challenge_id"),
        CONSTRAINT "FK_otp_delivery_jobs_challenge_id" FOREIGN KEY ("challenge_id") REFERENCES "otp_challenges"("id") ON DELETE CASCADE,
        CONSTRAINT "CK_otp_delivery_jobs_status" CHECK ("status" IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED')),
        CONSTRAINT "CK_otp_delivery_jobs_attempts" CHECK ("attempts" >= 0),
        CONSTRAINT "CK_otp_delivery_jobs_ciphertext" CHECK (length("code_ciphertext") > 0),
        CONSTRAINT "CK_otp_delivery_jobs_nonce" CHECK (octet_length(decode("code_nonce", 'base64')) = 12),
        CONSTRAINT "CK_otp_delivery_jobs_tag" CHECK (octet_length(decode("code_tag", 'base64')) = 16)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_otp_delivery_jobs_ready" ON "otp_delivery_jobs" ("status", "available_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_otp_delivery_jobs_lease_expires_at" ON "otp_delivery_jobs" ("lease_expires_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "otp_delivery_jobs"`);
  }
}
