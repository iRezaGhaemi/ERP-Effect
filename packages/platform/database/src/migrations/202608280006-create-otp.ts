import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOtp202608280006 implements MigrationInterface {
  name = "CreateOtp202608280006";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "otp_challenges" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "phone" character varying(13) NOT NULL,
        "code_hash" character(64) NOT NULL,
        "attempts" smallint NOT NULL DEFAULT 0,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "consumed_at" TIMESTAMP WITH TIME ZONE,
        "invalidated_at" TIMESTAMP WITH TIME ZONE,
        "request_ip" inet NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otp_challenges_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_otp_challenges_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_otp_challenges_phone_created_at" ON "otp_challenges" ("phone", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_otp_challenges_expires_at" ON "otp_challenges" ("expires_at")`,
    );
    await queryRunner.query(`
      CREATE TABLE "rate_limit_buckets" (
        "scope" character varying(32) NOT NULL,
        "key_hash" character(64) NOT NULL,
        "window_started_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "request_count" integer NOT NULL,
        "blocked_until" TIMESTAMP WITH TIME ZONE,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rate_limit_buckets_scope_key_hash" PRIMARY KEY ("scope", "key_hash")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_rate_limit_buckets_blocked_until" ON "rate_limit_buckets" ("blocked_until")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "rate_limit_buckets"`);
    await queryRunner.query(`DROP TABLE "otp_challenges"`);
  }
}
