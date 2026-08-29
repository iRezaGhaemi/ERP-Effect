import { describe, expect, it } from "vitest";

const wireUser = {
  id: "013a40c7-82e7-4435-a5d6-988b03fdce37",
  phone: "+989121234567",
  firstName: "رضا",
  lastName: "قایمی",
  status: "ACTIVE",
  lastLoginAt: null,
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T02:00:00.000Z",
};

describe("user response contracts", () => {
  it("accepts JSON-wire summary and assignment-aware detail responses", async () => {
    const contracts = (await import("./index.js")) as Record<
      string,
      { safeParse: (value: unknown) => { success: boolean } } | undefined
    >;
    const detail = {
      ...wireUser,
      roleIds: ["8be4f7bd-ce15-4679-a721-ca557fac79e9"],
      permissionOverrides: [
        {
          permissionId: "0f4ee796-6148-42c0-802a-55409f226f50",
          effect: "DENY",
        },
      ],
    };

    expect(contracts.UserDtoSchema?.safeParse(wireUser).success).toBe(true);
    expect(contracts.UserDetailDtoSchema?.safeParse(detail).success).toBe(true);
    expect(
      contracts.UserDtoSchema?.safeParse({
        ...wireUser,
        createdAt: new Date(wireUser.createdAt),
      }).success,
    ).toBe(false);
  });
});
