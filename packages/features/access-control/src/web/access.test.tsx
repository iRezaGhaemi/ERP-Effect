import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PermissionOverrides, type PermissionOverridesClient } from "./permission-overrides.js";
import { RolesEditor } from "./roles-editor.js";

afterEach(cleanup);

const user = {
  id: "013a40c7-82e7-4435-a5d6-988b03fdce37",
  roleIds: [],
  overrides: [{ permissionId: "ca693405-a3ce-4c01-a88e-2c0e3d32e4b5", effect: "DENY" as const }],
};

const catalog = [{ id: "ca693405-a3ce-4c01-a88e-2c0e3d32e4b5", key: "users:update", resource: "users", action: "update", createdAt: "2026-08-28T10:00:00.000Z" }];

describe("PermissionOverrides", () => {
  it("shows explicit deny separately from role defaults", () => {
    const client = { replaceOverrides: vi.fn().mockResolvedValue(undefined) } satisfies PermissionOverridesClient;
    render(<PermissionOverrides user={user} permissions={catalog} client={client} />);

    expect(screen.getByText("عدم دسترسی اختصاصی")).toBeTruthy();
    expect(screen.getByText("users:update")).toBeTruthy();
  });

  it("saves an explicit allow and announces the affected-user update", async () => {
    const replaceOverrides = vi.fn().mockResolvedValue(undefined);
    render(<PermissionOverrides user={{ ...user, overrides: [] }} permissions={catalog} client={{ replaceOverrides }} />);

    fireEvent.click(screen.getByRole("button", { name: "دسترسی اختصاصی" }));
    await waitFor(() => expect(replaceOverrides).toHaveBeenCalledWith(user.id, { overrides: [{ permissionId: catalog[0]!.id, effect: "ALLOW" }] }));
    expect(screen.getByRole("status").textContent).toContain("دسترسی‌های اختصاصی به‌روزرسانی شد.");
  });
});

describe("RolesEditor", () => {
  it("edits a role using permission IDs mapped from its displayed keys", async () => {
    const updateRole = vi.fn().mockResolvedValue({ id: "a53f8cb7-bb32-4adc-a835-6c1df8bd18ad", name: "عملیات", slug: "operations", isSystem: false, permissionKeys: ["users:update"], createdAt: "2026-08-28T10:00:00.000Z", updatedAt: "2026-08-28T10:00:00.000Z" });
    render(<RolesEditor client={{ listRoles: vi.fn().mockResolvedValue({ items: [{ id: "a53f8cb7-bb32-4adc-a835-6c1df8bd18ad", name: "عملیات", slug: "operations", isSystem: false, permissionKeys: [], createdAt: "2026-08-28T10:00:00.000Z", updatedAt: "2026-08-28T10:00:00.000Z" }], meta: { page: 1, pageSize: 20, total: 1, pageCount: 1 } }), listPermissions: vi.fn().mockResolvedValue({ items: catalog, meta: { page: 1, pageSize: 20, total: 1, pageCount: 1 } }), updateRole }} />);

    fireEvent.click(await screen.findByRole("button", { name: "ویرایش عملیات" }));
    fireEvent.click(screen.getByLabelText("users:update"));
    fireEvent.click(screen.getByRole("button", { name: "ذخیره نقش" }));
    await waitFor(() => expect(updateRole).toHaveBeenCalledWith("a53f8cb7-bb32-4adc-a835-6c1df8bd18ad", { name: "عملیات", slug: "operations", permissionIds: [catalog[0]!.id] }));
    expect((await screen.findByRole("status")).textContent).toContain("نقش به‌روزرسانی شد.");
  });

});
