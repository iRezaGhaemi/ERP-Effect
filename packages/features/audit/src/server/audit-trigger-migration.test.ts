import type { QueryRunner } from "typeorm";
import { describe, expect, it } from "vitest";

import { ReconcileAuditLogsActorNull202608280003 } from "../../../../platform/database/src/migrations/202608280003-reconcile-audit-logs-actor-null.js";

describe("audit actor-null trigger migration", () => {
  it("allows only a nested FK actor null transition and restores the prior trigger on down", async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: async (query: string) => {
        queries.push(query);
      },
    } as unknown as QueryRunner;
    const migration = new ReconcileAuditLogsActorNull202608280003();

    await migration.up(queryRunner);

    const up = queries.join("\n");
    expect(up).toContain('DROP TRIGGER "audit_logs_append_only" ON "audit_logs"');
    expect(up).toContain("pg_trigger_depth() = 0");
    expect(up).toContain("OLD.actor_id IS NULL");
    expect(up).toContain("NEW.actor_id IS NOT NULL");
    expect(up).toContain("OLD.action IS DISTINCT FROM NEW.action");
    expect(up).toContain("OLD.metadata IS DISTINCT FROM NEW.metadata");
    expect(up).toContain("CREATE TRIGGER audit_logs_reject_delete");

    const upQueryCount = queries.length;
    await migration.down(queryRunner);

    const down = queries.slice(upQueryCount).join("\n");
    expect(down).toContain('DROP TRIGGER "audit_logs_reject_update" ON "audit_logs"');
    expect(down).toContain('DROP TRIGGER "audit_logs_reject_delete" ON "audit_logs"');
    expect(down).toContain("CREATE TRIGGER audit_logs_append_only");
  });
});
