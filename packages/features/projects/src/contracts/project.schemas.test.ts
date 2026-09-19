import { describe, expect, it } from "vitest";

import {
  CreateProjectSchema,
  ProjectMemberRoleSchema,
  ProjectPageQuerySchema,
  ReplaceProjectMembersSchema,
} from "./index.js";

const workspaceId = "143a40c7-82e7-4435-a5d6-988b03fdce37";
const userId = "013a40c7-82e7-4435-a5d6-988b03fdce37";

describe("project contracts", () => {
  it("rejects a project due date before its start date", () => {
    expect(() =>
      CreateProjectSchema.parse({
        workspaceId,
        name: "کمپین پاییز",
        startDate: "2026-09-20",
        dueDate: "2026-09-19",
      }),
    ).toThrow();
  });

  it("caps list pages at one hundred rows", () => {
    expect(() => ProjectPageQuerySchema.parse({ pageSize: 101 })).toThrow();
  });

  it("accepts only project member roles", () => {
    expect(ProjectMemberRoleSchema.safeParse("VIEWER").success).toBe(true);
    expect(ProjectMemberRoleSchema.safeParse("ADMIN").success).toBe(false);
  });

  it("requires UUID project member IDs", () => {
    expect(() =>
      ReplaceProjectMembersSchema.parse({
        version: 1,
        members: [{ userId: "not-a-uuid", role: "MEMBER" }],
      }),
    ).toThrow();
    expect(
      ReplaceProjectMembersSchema.safeParse({
        version: 1,
        members: [{ userId, role: "MEMBER" }],
      }).success,
    ).toBe(true);
  });
});
