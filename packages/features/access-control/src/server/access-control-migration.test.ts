import type { QueryRunner } from "typeorm";
import { describe, expect, it } from "vitest";

import { CreateAccessControl202608280005 } from "../../../../platform/database/src/migrations/202608280005-create-access-control.js";

describe("access-control migration 005", () => {
  it("creates unique catalogs, composite joins, and the unique user override boundary", async () => {
    const queries: string[] = [];
    const runner = {
      query: async (sql: string) => {
        queries.push(sql);
      },
    } as unknown as QueryRunner;
    const migration = new CreateAccessControl202608280005();
    await migration.up(runner);
    const sql = queries.join("\n");
    expect(sql).toContain('"uq_roles_slug"');
    expect(sql).toContain('"uq_permissions_key"');
    expect(sql).toContain(
      'CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id")',
    );
    expect(sql).toContain(
      'CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id")',
    );
    expect(sql).toContain('"uq_user_permission_overrides_user_permission"');
  });
});
