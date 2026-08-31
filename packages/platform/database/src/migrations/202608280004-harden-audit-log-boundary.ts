import type { MigrationInterface, QueryRunner } from "typeorm";

export class HardenAuditLogBoundary202608280004 implements MigrationInterface {
  name = "HardenAuditLogBoundary1787875200004";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER "audit_logs_reject_update" ON "audit_logs"`,
    );
    await queryRunner.query(
      `DROP TRIGGER "audit_logs_reject_delete" ON "audit_logs"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_actor_id"`,
    );
    await queryRunner.query(`
      DO $audit_owner$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'effect_audit_owner') THEN
          CREATE ROLE effect_audit_owner NOLOGIN NOINHERIT;
        ELSIF EXISTS (
          SELECT 1
          FROM pg_roles
          WHERE rolname = 'effect_audit_owner'
            AND (rolcanlogin OR rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls)
        ) OR EXISTS (
          SELECT 1
          FROM pg_auth_members
          WHERE roleid = 'effect_audit_owner'::regrole
        ) THEN
          RAISE EXCEPTION 'effect_audit_owner is not a protected no-login role';
        END IF;
      END
      $audit_owner$
    `);
    await queryRunner.query(
      `GRANT USAGE, CREATE ON SCHEMA public TO effect_audit_owner`,
    );
    await queryRunner.query(`
      CREATE FUNCTION audit_logs_enforce_boundary()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF TG_OP = 'DELETE' OR current_user <> 'effect_audit_owner' THEN
          RAISE EXCEPTION 'audit_logs are append-only';
        END IF;

        IF OLD.actor_id IS NULL
          OR NEW.actor_id IS NOT NULL
          OR OLD.id IS DISTINCT FROM NEW.id
          OR OLD.action IS DISTINCT FROM NEW.action
          OR OLD.entity_type IS DISTINCT FROM NEW.entity_type
          OR OLD.entity_id IS DISTINCT FROM NEW.entity_id
          OR OLD.metadata IS DISTINCT FROM NEW.metadata
          OR OLD.ip_address IS DISTINCT FROM NEW.ip_address
          OR OLD.request_id IS DISTINCT FROM NEW.request_id
          OR OLD.created_at IS DISTINCT FROM NEW.created_at
        THEN
          RAISE EXCEPTION 'audit_logs are append-only';
        END IF;

        RETURN NEW;
      END;
      $$
    `);
    await queryRunner.query(
      `ALTER FUNCTION audit_logs_enforce_boundary() OWNER TO effect_audit_owner`,
    );
    await queryRunner.query(
      `REVOKE ALL ON FUNCTION audit_logs_enforce_boundary() FROM PUBLIC`,
    );
    await queryRunner.query(`
      CREATE FUNCTION audit_logs_null_actor_on_user_delete()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = pg_catalog, public
      AS $$
      BEGIN
        UPDATE public.audit_logs
        SET actor_id = NULL
        WHERE actor_id = OLD.id;
        RETURN OLD;
      END;
      $$
    `);
    await queryRunner.query(
      `ALTER FUNCTION audit_logs_null_actor_on_user_delete() OWNER TO effect_audit_owner`,
    );
    await queryRunner.query(
      `REVOKE ALL ON FUNCTION audit_logs_null_actor_on_user_delete() FROM PUBLIC`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" OWNER TO effect_audit_owner`,
    );
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "audit_logs" TO CURRENT_USER`,
    );
    await queryRunner.query(
      `REVOKE TRUNCATE, TRIGGER ON TABLE "audit_logs" FROM PUBLIC`,
    );
    await queryRunner.query(`
      CREATE TRIGGER audit_logs_reject_update
      BEFORE UPDATE ON "audit_logs"
      FOR EACH ROW
      EXECUTE FUNCTION audit_logs_enforce_boundary()
    `);
    await queryRunner.query(`
      CREATE TRIGGER audit_logs_reject_delete
      BEFORE DELETE ON "audit_logs"
      FOR EACH ROW
      EXECUTE FUNCTION audit_logs_enforce_boundary()
    `);
    await queryRunner.query(`
      CREATE TRIGGER audit_logs_null_actor_before_user_delete
      BEFORE DELETE ON "users"
      FOR EACH ROW
      EXECUTE FUNCTION audit_logs_null_actor_on_user_delete()
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD CONSTRAINT "FK_audit_logs_actor_id"
      FOREIGN KEY ("actor_id") REFERENCES "users"("id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER "audit_logs_null_actor_before_user_delete" ON "users"`,
    );
    await queryRunner.query(
      `DROP TRIGGER "audit_logs_reject_update" ON "audit_logs"`,
    );
    await queryRunner.query(
      `DROP TRIGGER "audit_logs_reject_delete" ON "audit_logs"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_actor_id"`,
    );
    await queryRunner.query(
      `DROP FUNCTION audit_logs_null_actor_on_user_delete()`,
    );
    await queryRunner.query(`DROP FUNCTION audit_logs_enforce_boundary()`);
    await queryRunner.query(`ALTER TABLE "audit_logs" OWNER TO CURRENT_USER`);
    await queryRunner.query(
      `REVOKE USAGE, CREATE ON SCHEMA public FROM effect_audit_owner`,
    );
    await queryRunner.query(`DROP ROLE effect_audit_owner`);
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD CONSTRAINT "FK_audit_logs_actor_id"
      FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE TRIGGER audit_logs_reject_update
      BEFORE UPDATE ON "audit_logs"
      FOR EACH ROW
      WHEN (
        pg_trigger_depth() = 0
        OR OLD.actor_id IS NULL
        OR NEW.actor_id IS NOT NULL
        OR OLD.action IS DISTINCT FROM NEW.action
        OR OLD.entity_type IS DISTINCT FROM NEW.entity_type
        OR OLD.entity_id IS DISTINCT FROM NEW.entity_id
        OR OLD.metadata IS DISTINCT FROM NEW.metadata
        OR OLD.ip_address IS DISTINCT FROM NEW.ip_address
        OR OLD.request_id IS DISTINCT FROM NEW.request_id
        OR OLD.created_at IS DISTINCT FROM NEW.created_at
      )
      EXECUTE FUNCTION audit_logs_prevent_mutation()
    `);
    await queryRunner.query(`
      CREATE TRIGGER audit_logs_reject_delete
      BEFORE DELETE ON "audit_logs"
      FOR EACH ROW
      EXECUTE FUNCTION audit_logs_prevent_mutation()
    `);
  }
}
