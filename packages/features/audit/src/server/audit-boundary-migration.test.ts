import type { QueryRunner } from "typeorm";
import { describe, expect, it } from "vitest";

import { HardenAuditLogBoundary202608280004 } from "../../../../platform/database/src/migrations/202608280004-harden-audit-log-boundary.js";

describe("audit database boundary migration", () => {
  it("authorizes actor cleanup by protected role rather than trigger depth", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: async (query: string) => {
        queries.push(query);
      },
    } as unknown as QueryRunner;
    const migration = new HardenAuditLogBoundary202608280004();

    await migration.up(queryRunner);

    const up = queries.join("\n");
    expect(up).not.toContain("pg_trigger_depth");
    expect(up).toContain("CREATE ROLE effect_audit_owner NOLOGIN NOINHERIT");
    expect(up).toContain(
      "GRANT USAGE, CREATE ON SCHEMA public TO effect_audit_owner",
    );
    expect(up).toContain(
      'ALTER TABLE "audit_logs" OWNER TO effect_audit_owner',
    );
    expect(up).toContain("SECURITY DEFINER");
    expect(up).toContain(
      "REVOKE ALL ON FUNCTION audit_logs_null_actor_on_user_delete() FROM PUBLIC",
    );
    expect(up).toContain("current_user <> 'effect_audit_owner'");
    expect(up).toContain("OLD.id IS DISTINCT FROM NEW.id");
    expect(up).toContain("OLD.created_at IS DISTINCT FROM NEW.created_at");
    expect(up).toContain("SET actor_id = NULL");
    expect(up).toContain("WHERE actor_id = OLD.id");
    expect(up).toContain(
      "CREATE TRIGGER audit_logs_null_actor_before_user_delete",
    );
    expect(up).toContain("CREATE TRIGGER audit_logs_reject_update");
    expect(up).toContain("CREATE TRIGGER audit_logs_reject_delete");

    const upQueryCount = queries.length;
    await migration.down(queryRunner);

    const down = queries.slice(upQueryCount).join("\n");
    expect(down).toContain(
      'DROP TRIGGER "audit_logs_null_actor_before_user_delete" ON "users"',
    );
    expect(down).toContain(
      'DROP TRIGGER "audit_logs_reject_update" ON "audit_logs"',
    );
    expect(down).toContain(
      'DROP TRIGGER "audit_logs_reject_delete" ON "audit_logs"',
    );
    expect(down).toContain("ON DELETE SET NULL");
    expect(down).toContain('ALTER TABLE "audit_logs" OWNER TO CURRENT_USER');
    expect(down).toContain("DROP ROLE effect_audit_owner");
  });
});
