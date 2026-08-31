// @vitest-environment jsdom

import { ApiError } from "@effect-erp/contracts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { UsersClient } from "@effect/users/web";
import { afterEach, describe, expect, it, vi } from "vitest";

import UsersPage from "./page.js";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const user = {
  id: "013a40c7-82e7-4435-a5d6-988b03fdce37",
  phone: "+989121234567",
  firstName: "سارا",
  lastName: "رضایی",
  status: "ACTIVE",
  lastLoginAt: null,
  createdAt: "2026-08-28T10:00:00.000Z",
  updatedAt: "2026-08-28T10:00:00.000Z",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("UsersPage", () => {
  it("shows the last-super-admin error when suspension is rejected by the user administration drawer", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/api/v1/me")) return response({ user, permissions: ["users:read", "users:suspend", "roles:manage"] });
      if (url.includes("/api/v1/users?") ) return response({ items: [user], meta: { page: 1, pageSize: 20, total: 1, pageCount: 1 } });
      if (url.endsWith(`/api/v1/users/${user.id}`)) return response({ ...user, roleIds: ["a53f8cb7-bb32-4adc-a835-6c1df8bd18ad"], permissionOverrides: [] });
      if (url.includes("/api/v1/roles?")) return response({ items: [], meta: { page: 1, pageSize: 20, total: 0, pageCount: 0 } });
      if (url.includes("/api/v1/permissions?")) return response({ items: [], meta: { page: 1, pageSize: 20, total: 0, pageCount: 0 } });
      throw new Error(`Unexpected fetch: ${url}`);
    }));
    vi.spyOn(UsersClient.prototype, "suspend").mockRejectedValue(new ApiError({ code: "LAST_ACTIVE_SUPER_ADMIN", message: "آخرین مدیر ارشد فعال قابل تعلیق نیست.", fields: {}, requestId: "request-1" }));

    render(<UsersPage />);

    fireEvent.click(await screen.findByRole("button", { name: "جزئیات سارا رضایی" }));
    await screen.findByRole("dialog", { name: "سارا رضایی" });
    fireEvent.click(screen.getByRole("button", { name: "تعلیق کاربر" }));

    expect((await screen.findByRole("alert")).textContent).toContain("آخرین مدیر ارشد فعال قابل تعلیق نیست.");
  });
});

function response(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
}
