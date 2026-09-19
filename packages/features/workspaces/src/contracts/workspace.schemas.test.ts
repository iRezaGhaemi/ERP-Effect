import { describe, expect, it } from "vitest";

import {
  CreateWorkspaceSchema,
  ReplaceWorkspaceMembersSchema,
  WorkspaceMemberRoleSchema,
  WorkspacePageQuerySchema,
} from "./index.js";

const customerId = "143a40c7-82e7-4435-a5d6-988b03fdce37";
const userId = "013a40c7-82e7-4435-a5d6-988b03fdce37";

describe("workspace contracts", () => {
  it("trims workspace names", () => {
    expect(CreateWorkspaceSchema.parse({ customerId, name: "  پشتیبانی  " })).toEqual({
      customerId,
      name: "پشتیبانی",
    });
  });

  it("caps list pages at one hundred rows", () => {
    expect(() => WorkspacePageQuerySchema.parse({ pageSize: 101 })).toThrow();
  });

  it("accepts only workspace member roles", () => {
    expect(WorkspaceMemberRoleSchema.safeParse("MANAGER").success).toBe(true);
    expect(WorkspaceMemberRoleSchema.safeParse("OWNER").success).toBe(false);
  });

  it("requires UUID workspace member IDs", () => {
    expect(() =>
      ReplaceWorkspaceMembersSchema.parse({
        version: 1,
        members: [{ userId: "not-a-uuid", role: "MEMBER" }],
      }),
    ).toThrow();
    expect(
      ReplaceWorkspaceMembersSchema.safeParse({
        version: 1,
        members: [{ userId, role: "MEMBER" }],
      }).success,
    ).toBe(true);
  });
});
