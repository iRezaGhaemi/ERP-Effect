// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxy } from "../../proxy.js";
import LoginPage from "./page.js";

const replace = vi.fn();
let mustChangePassword = false;

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@effect/auth/web", () => ({
  LoginForm: ({ onAuthenticated }: { onAuthenticated: (response: { user: { mustChangePassword: boolean } }) => void }) => (
    <button onClick={() => onAuthenticated({ user: { mustChangePassword } })}>ورود آزمایشی</button>
  ),
}));

afterEach(() => {
  cleanup();
  replace.mockReset();
  mustChangePassword = false;
  window.history.replaceState({}, "", "/login");
});

describe("LoginPage", () => {
  it("sends a temporary-password session directly to password change", async () => {
    mustChangePassword = true;
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "ورود آزمایشی" }));

    expect(replace).toHaveBeenCalledWith("/change-password");
  });

  it("continues a normal session to a normalized internal destination", async () => {
    window.history.replaceState({}, "", "/login?next=%2Fsettings%2Fusers%3Fpage%3D2");
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "ورود آزمایشی" }));

    expect(replace).toHaveBeenCalledWith("/settings/users?page=2");
  });

  it("accepts the exact password-change destination emitted by the real proxy", async () => {
    const redirect = proxy(new NextRequest("https://effect.example/change-password")).headers.get("location");
    expect(redirect).not.toBeNull();
    const login = new URL(redirect!);
    window.history.replaceState({}, "", `${login.pathname}${login.search}`);
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "ورود آزمایشی" }));

    expect(replace).toHaveBeenCalledWith("/change-password");
  });

  it("lets a temporary-password response override a safe requested destination", async () => {
    mustChangePassword = true;
    window.history.replaceState({}, "", "/login?next=%2Fsettings%2Fusers%3Fpage%3D2");
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "ورود آزمایشی" }));

    expect(replace).toHaveBeenCalledWith("/change-password");
  });

  it.each(["https://attacker.example", "//attacker.example", "/login", "/change-password/../login"])(
    "rejects unsafe or looping next destination %s",
    async (next) => {
      window.history.replaceState({}, "", `/login?next=${encodeURIComponent(next)}`);
      render(<LoginPage />);

      fireEvent.click(screen.getByRole("button", { name: "ورود آزمایشی" }));

      expect(replace).toHaveBeenCalledWith("/dashboard");
    },
  );
});
