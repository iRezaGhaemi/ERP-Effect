import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSessions202608280009 implements MigrationInterface {
  name = "CreateSessions1787875200009";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "user_agent" character varying(512) NOT NULL,
        "ip_address" inet NOT NULL,
        "csrf_hash" character(64) NOT NULL,
        "last_used_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "revoked_reason" character varying(40),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CK_sessions_csrf_hash" CHECK ("csrf_hash" ~ '^[a-f0-9]{64}$'),
        CONSTRAINT "CK_sessions_revocation_reason" CHECK ("revoked_reason" IS NULL OR "revoked_reason" IN ('LOGOUT', 'LOGOUT_ALL', 'ADMIN_REVOKED', 'REFRESH_REUSE', 'SESSION_EXPIRED', 'USER_SUSPENDED'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_sessions_user_active" ON "sessions" ("user_id") WHERE "revoked_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_sessions_user_last_used_at" ON "sessions" ("user_id", "last_used_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_sessions_expires_at" ON "sessions" ("expires_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL,
        "session_id" uuid NOT NULL,
        "token_hash" character(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "consumed_at" TIMESTAMP WITH TIME ZONE,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "replaced_by_token_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_session_id" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_refresh_tokens_replaced_by_token_id" FOREIGN KEY ("replaced_by_token_id") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL,
        CONSTRAINT "CK_refresh_tokens_token_hash" CHECK ("token_hash" ~ '^[a-f0-9]{64}$')
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_refresh_tokens_token_hash" ON "refresh_tokens" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_refresh_tokens_session_active" ON "refresh_tokens" ("session_id", "revoked_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "ix_refresh_tokens_expires_at"`);
    await queryRunner.query(`DROP INDEX "ix_refresh_tokens_session_active"`);
    await queryRunner.query(`DROP INDEX "uq_refresh_tokens_token_hash"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP INDEX "ix_sessions_user_last_used_at"`);
    await queryRunner.query(`DROP INDEX "ix_sessions_expires_at"`);
    await queryRunner.query(`DROP INDEX "ix_sessions_user_active"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
  }
}
