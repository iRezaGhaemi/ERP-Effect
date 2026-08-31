import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuditLogs202608280002 implements MigrationInterface {
  name = "CreateAuditLogs1787875200002";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actor_id" uuid,
        "action" character varying(120) NOT NULL,
        "entity_type" character varying(120) NOT NULL,
        "entity_id" uuid,
        "metadata" jsonb NOT NULL,
        "ip_address" inet,
        "request_id" character varying(120) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_actor_id" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_audit_logs_created_at_id" ON "audit_logs" ("created_at", "id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_audit_logs_actor_id" ON "audit_logs" ("actor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_audit_logs_action" ON "audit_logs" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_audit_logs_entity_type_entity_id" ON "audit_logs" ("entity_type", "entity_id")`,
    );
    await queryRunner.query(`
      CREATE FUNCTION audit_logs_prevent_mutation()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RAISE EXCEPTION 'audit_logs are append-only';
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER audit_logs_append_only
      BEFORE UPDATE OR DELETE ON "audit_logs"
      FOR EACH ROW
      EXECUTE FUNCTION audit_logs_prevent_mutation()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER "audit_logs_append_only" ON "audit_logs"`,
    );
    await queryRunner.query(`DROP FUNCTION audit_logs_prevent_mutation()`);
    await queryRunner.query(
      `DROP INDEX "public"."ix_audit_logs_entity_type_entity_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."ix_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "public"."ix_audit_logs_actor_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."ix_audit_logs_created_at_id"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
