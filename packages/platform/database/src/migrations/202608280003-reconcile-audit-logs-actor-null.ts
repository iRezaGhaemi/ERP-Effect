import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReconcileAuditLogsActorNull202608280003 implements MigrationInterface {
  name = 'ReconcileAuditLogsActorNull1787875200003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER "audit_logs_append_only" ON "audit_logs"`);
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

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER "audit_logs_reject_update" ON "audit_logs"`);
    await queryRunner.query(`DROP TRIGGER "audit_logs_reject_delete" ON "audit_logs"`);
    await queryRunner.query(`
      CREATE TRIGGER audit_logs_append_only
      BEFORE UPDATE OR DELETE ON "audit_logs"
      FOR EACH ROW
      EXECUTE FUNCTION audit_logs_prevent_mutation()
    `);
  }
}
