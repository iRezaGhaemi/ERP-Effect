// @vitest-environment jsdom

import { ApiError } from "@effect-erp/contracts";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedPageClient } from "./authenticated-page.js";

const replace = vi.fn();
const router = { replace };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const me = {
  user: {
    id: "013a40c7-82e7-4435-a5d6-988b03fdce37",
    phone: "+989121234567",
    firstName: "سارا",
    lastName: "رضایی",
    status: "ACTIVE" as const,
    username: "sara.rezaei",
    credentialsReady: true,
    mustChangePassword: false,
    lastLoginAt: "2026-09-01T10:00:00.000Z",
    createdAt: "2026-08-28T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  },
  permissions: ["users:read"],
};

afterEach(() => { cleanup(); replace.mockReset(); });

async function renderGuard(client: { me: ReturnType<typeof vi.fn>; refresh: ReturnType<typeof vi.fn> }) {
  const { AuthenticatedPage } = await import("./authenticated-page.js");
  return render(<AuthenticatedPage title="داشبورد" client={client as unknown as AuthenticatedPageClient}>{() => <p>محتوای عادی</p>}</AuthenticatedPage>);
}

describe("AuthenticatedPage", () => {
  it("does not render ordinary protected content while redirecting a temporary session", async () => {
    await renderGuard({ me: vi.fn().mockResolvedValue({ ...me, user: { ...me.user, mustChangePassword: true } }), refresh: vi.fn() });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/change-password"));
    expect(screen.queryByText("محتوای عادی")).toBeNull();
  });

  it("recovers an expired access cookie through refresh and rechecks authoritative me before rendering", async () => {
    const authenticationRequired = new ApiError({ code: "AUTHENTICATION_REQUIRED", message: "expired", fields: {}, requestId: "request-1" });
    const client = { me: vi.fn().mockRejectedValueOnce(authenticationRequired).mockResolvedValueOnce(me), refresh: vi.fn().mockResolvedValue({}) };
    await renderGuard(client);

    expect(await screen.findByText("محتوای عادی")).toBeTruthy();
    expect(screen.getByRole("link", { name: "تغییر گذرواژه" }).getAttribute("href")).toBe("/change-password");
    expect(client.refresh).toHaveBeenCalledOnce();
    expect(client.me).toHaveBeenCalledTimes(2);
  });

  it("uses the recovery login when refresh fails and never renders protected content", async () => {
    const authenticationRequired = new ApiError({ code: "SESSION_INVALID", message: "expired", fields: {}, requestId: "request-1" });
    await renderGuard({ me: vi.fn().mockRejectedValue(authenticationRequired), refresh: vi.fn().mockRejectedValue(authenticationRequired) });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login?recovery=1"));
    expect(screen.queryByText("محتوای عادی")).toBeNull();
  });

  it("cannot bypass restriction when refresh succeeds but the authoritative recheck is temporary", async () => {
    const authenticationRequired = new ApiError({ code: "SESSION_INVALID", message: "expired", fields: {}, requestId: "request-1" });
    const temporary = { ...me, user: { ...me.user, mustChangePassword: true } };
    await renderGuard({ me: vi.fn().mockRejectedValueOnce(authenticationRequired).mockResolvedValueOnce(temporary), refresh: vi.fn().mockResolvedValue({}) });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/change-password"));
    expect(screen.queryByText("محتوای عادی")).toBeNull();
  });

  it("renders a non-authentication me failure without exposing authenticated navigation", async () => {
    await renderGuard({ me: vi.fn().mockRejectedValue(new Error("service unavailable")), refresh: vi.fn() });

    expect((await screen.findByRole("alert")).textContent).toContain("بررسی نشست ممکن نشد");
    expect(screen.queryByRole("link", { name: "تغییر گذرواژه" })).toBeNull();
    expect(screen.queryByText("محتوای عادی")).toBeNull();
  });
});
