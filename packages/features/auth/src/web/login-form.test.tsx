import { ApiError } from "@effect-erp/contracts";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginForm, type LoginAuthClient } from "./login-form.js";

const authSession = {
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
  sessionId: "35cce04f-5ac1-497c-9798-951e935cdcf0",
};

afterEach(cleanup);

function client(login = vi.fn().mockResolvedValue(authSession)): LoginAuthClient {
  return { login };
}

describe("LoginForm", () => {
  it("renders labeled username/password controls with stable autocomplete and no OTP UI", () => {
    render(<LoginForm client={client()} />);

    expect(screen.getByLabelText("نام کاربری")).toHaveProperty("autocomplete", "username");
    expect(screen.getByLabelText("گذرواژه")).toHaveProperty("autocomplete", "current-password");
    expect(screen.getByLabelText("گذرواژه")).toHaveProperty("type", "password");
    expect(screen.queryByText(/کد تأیید|شماره موبایل|ارسال مجدد/)).toBeNull();
  });

  it("reveals and hides the password without changing its autocomplete meaning", async () => {
    const user = userEvent.setup();
    render(<LoginForm client={client()} />);
    const password = screen.getByLabelText("گذرواژه");

    await user.click(screen.getByRole("button", { name: "نمایش گذرواژه" }));
    expect(password).toHaveProperty("type", "text");
    expect(password).toHaveProperty("autocomplete", "current-password");
    await user.click(screen.getByRole("button", { name: "پنهان کردن گذرواژه" }));
    expect(password).toHaveProperty("type", "password");
  });

  it("submits username/password and disables all credential controls while pending", async () => {
    let resolveLogin: ((value: typeof authSession) => void) | undefined;
    const login = vi.fn().mockImplementation(() => new Promise((resolve) => { resolveLogin = resolve; }));
    const user = userEvent.setup();
    render(<LoginForm client={client(login)} />);

    await user.type(screen.getByLabelText("نام کاربری"), "sara.rezaei");
    await user.type(screen.getByLabelText("گذرواژه"), "Login secret");
    await user.click(screen.getByRole("button", { name: "ورود" }));

    expect(login).toHaveBeenCalledWith({ username: "sara.rezaei", password: "Login secret" });
    expect(screen.getByRole("button", { name: "در حال ورود…" })).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("نام کاربری")).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("گذرواژه")).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "نمایش گذرواژه" })).toHaveProperty("disabled", true);
    resolveLogin?.(authSession);
  });

  it("passes the complete authenticated session to navigation and clears the password", async () => {
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm client={client()} onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText("نام کاربری"), "sara.rezaei");
    await user.type(screen.getByLabelText("گذرواژه"), "Login secret");
    await user.click(screen.getByRole("button", { name: "ورود" }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(authSession));
    expect(screen.getByLabelText("گذرواژه")).toHaveProperty("value", "");
  });

  it("shows the same generic Persian error for account and transport failures without rendering secrets", async () => {
    const failures = [
      new ApiError({ code: "INVALID_CREDENTIALS", message: "account-specific server copy", fields: {}, requestId: "request-1" }),
      new Error("transport included secret: Login secret"),
    ];

    for (const failure of failures) {
      const user = userEvent.setup();
      const view = render(<LoginForm client={client(vi.fn().mockRejectedValue(failure))} />);
      await user.type(screen.getByLabelText("نام کاربری"), "sara.rezaei");
      await user.type(screen.getByLabelText("گذرواژه"), "Login secret");
      await user.click(screen.getByRole("button", { name: "ورود" }));

      expect((await screen.findByRole("alert")).textContent).toBe("نام کاربری یا گذرواژه صحیح نیست. دوباره تلاش کنید.");
      expect(view.container.textContent).not.toContain("Login secret");
      expect(view.container.textContent).not.toContain("account-specific");
      view.unmount();
    }
  });

  it("clears a typed password when the form unmounts", async () => {
    const user = userEvent.setup();
    const view = render(<LoginForm client={client()} />);
    const password = screen.getByLabelText("گذرواژه");
    await user.type(password, "Login secret");

    view.unmount();

    expect(password.value).toBe("");
  });
});
