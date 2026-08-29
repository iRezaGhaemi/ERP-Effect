import { describe, expect, it } from "vitest";

import { PermissionDtoSchema, RoleDtoSchema } from "./index.js";

const role = {
  id: "8be4f7bd-ce15-4679-a721-ca557fac79e9",
  name: "اپراتور",
  slug: "operator",
  isSystem: false,
  permissionKeys: ["users:read"],
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T02:00:00.000Z",
};

describe("access-control response contracts", () => {
  it("accepts JSON-wire role and permission responses but rejects Date objects", () => {
    expect(RoleDtoSchema.safeParse(role).success).toBe(true);
    expect(
      PermissionDtoSchema.safeParse({
        id: "0f4ee796-6148-42c0-802a-55409f226f50",
        resource: "users",
        action: "read",
        key: "users:read",
        createdAt: "2026-08-28T00:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      RoleDtoSchema.safeParse({
        ...role,
        createdAt: new Date(role.createdAt),
      }).success,
    ).toBe(false);
  });
});
