import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordCredentials202609010010
  implements MigrationInterface
{
  name = "AddPasswordCredentials1788220800010";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "username" character varying(64),
        ADD COLUMN "password_hash" character varying(255),
        ADD COLUMN "must_change_password" boolean NOT NULL DEFAULT true,
        ADD COLUMN "temporary_password_expires_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN "password_changed_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN "credential_version" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_username" ON "users" ("username")`,
    );
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "CK_users_username_canonical"
      CHECK (
        "username" IS NULL OR (
          "username" = lower(btrim("username"))
          AND "username" ~ '^[a-z][a-z0-9._-]{2,63}$'
        )
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "CK_users_credentials_paired"
      CHECK (
        ("username" IS NULL AND "password_hash" IS NULL)
        OR ("username" IS NOT NULL AND "password_hash" IS NOT NULL)
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "CK_users_credential_version_nonnegative"
      CHECK ("credential_version" >= 0)
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "CK_users_password_state_dates"
      CHECK (
        (
          "username" IS NULL
          AND "must_change_password" = true
          AND "temporary_password_expires_at" IS NULL
          AND "password_changed_at" IS NULL
        )
        OR (
          "username" IS NOT NULL
          AND "password_changed_at" IS NOT NULL
          AND (
            (
              "must_change_password" = true
              AND "temporary_password_expires_at" IS NOT NULL
              AND "temporary_password_expires_at" > "password_changed_at"
            )
            OR (
              "must_change_password" = false
              AND "temporary_password_expires_at" IS NULL
            )
          )
        )
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "CK_users_password_state_dates"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "CK_users_credential_version_nonnegative"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "CK_users_credentials_paired"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "CK_users_username_canonical"`,
    );
    await queryRunner.query(`DROP INDEX "uq_users_username"`);
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "credential_version",
        DROP COLUMN "password_changed_at",
        DROP COLUMN "temporary_password_expires_at",
        DROP COLUMN "must_change_password",
        DROP COLUMN "password_hash",
        DROP COLUMN "username"
    `);
  }
}
