// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const temporaryMe = {
  user: {
    id: "013a40c7-82e7-4435-a5d6-988b03fdce37",
    phone: "+989121234567",
    firstName: "سارا",
    lastName: "رضایی",
    status: "ACTIVE",
    username: "sara.rezaei",
    credentialsReady: true,
    mustChangePassword: true,
    lastLoginAt: "2026-09-01T10:00:00.000Z",
    createdAt: "2026-08-28T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  },
  permissions: [],
};

afterEach(() => {
  cleanup();
  replace.mockReset();
  vi.unstubAllGlobals();
  document.cookie = "effect_csrf=; Max-Age=0; path=/";
});

describe("ChangePasswordPage", () => {
  it("verifies temporary state through me and navigates to dashboard after a successful change", async () => {
    document.cookie = "effect_csrf=csrf-token; path=/";
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith("/api/v1/me")) return response(temporaryMe);
      if (url.endsWith("/api/v1/auth/password/change")) return response({ ...temporaryMe, user: { ...temporaryMe.user, mustChangePassword: false }, sessionId: "35cce04f-5ac1-497c-9798-951e935cdcf0" });
      throw new Error(`Unexpected fetch: ${url}`);
    }));
    const { default: ChangePasswordPage } = await import("./page.js");
    render(<ChangePasswordPage />);

    expect(await screen.findByText("گذرواژه موقت است")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("گذرواژه فعلی"), { target: { value: "Current secret phrase" } });
    fireEvent.change(screen.getByLabelText("گذرواژه جدید"), { target: { value: "New secret phrase 123!" } });
    fireEvent.change(screen.getByLabelText("تکرار گذرواژه جدید"), { target: { value: "New secret phrase 123!" } });
    fireEvent.click(screen.getByRole("button", { name: "تغییر گذرواژه" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("recovers a stale cookie at login when both me and refresh reject it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: { code: "SESSION_INVALID", message: "نشست نامعتبر است.", fields: {}, requestId: "request-1" } }, 401)));
    const { default: ChangePasswordPage } = await import("./page.js");
    render(<ChangePasswordPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login?recovery=1"));
    expect(screen.queryByLabelText("گذرواژه فعلی")).toBeNull();
  });
});

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
