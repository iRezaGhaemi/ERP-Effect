import { describe, expect, it, vi } from "vitest";

import { assertAuditDatabaseBoundary } from "./audit-database-boundary.js";

const safeRole = {
  roleName: "effect",
  isSuperuser: false,
  canCreateRoles: false,
  bypassesRowSecurity: false,
  isAuditOwnerMember: false,
  ownsAuditLogs: false,
  canCreateInPublic: false,
  canCreateAuditTriggers: false,
};

describe("audit application database boundary", () => {
  it("accepts a non-owner runtime role without DDL authority", async () => {
    const query = vi.fn().mockResolvedValue([safeRole]);

    await expect(
      assertAuditDatabaseBoundary({ query } as never),
    ).resolves.toBeUndefined();
  });

  it.each([
    ["superuser", { isSuperuser: true }],
    ["role creator", { canCreateRoles: true }],
    ["row-security bypass", { bypassesRowSecurity: true }],
    ["audit owner member", { isAuditOwnerMember: true }],
    ["audit table owner", { ownsAuditLogs: true }],
    ["public schema creator", { canCreateInPublic: true }],
    ["audit trigger creator", { canCreateAuditTriggers: true }],
  ])(
    "rejects an unsafe %s application role without reflecting its name",
    async (_label, unsafe) => {
      const roleName = "attacker-controlled-role";
      const query = vi
        .fn()
        .mockResolvedValue([{ ...safeRole, roleName, ...unsafe }]);

      await expect(
        assertAuditDatabaseBoundary({ query } as never),
      ).rejects.toThrow("Unsafe audit database role.");

      try {
        await assertAuditDatabaseBoundary({ query } as never);
      } catch (error) {
        expect((error as Error).message).not.toContain(roleName);
      }
    },
  );
});
