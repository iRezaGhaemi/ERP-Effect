import { ApiError } from "@effect-erp/contracts";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const changedSession = {
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
  sessionId: "e8292771-e347-4f55-ad5f-ed813cfa42b5",
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

async function renderForm(props: Record<string, unknown> = {}) {
  const { ChangePasswordForm } = await import("./change-password-form.js");
  const client = {
    changePassword: vi.fn().mockResolvedValue(changedSession),
    logout: vi.fn().mockResolvedValue(undefined),
  };
  return { client, view: render(<ChangePasswordForm client={client} mustChangePassword={false} {...props} />) };
}

async function fillSecrets(user: ReturnType<typeof userEvent.setup>, values = {
  current: "Current secret phrase",
  next: "New secret phrase 123!",
  confirmation: "New secret phrase 123!",
}) {
  await user.type(screen.getByLabelText("گذرواژه فعلی"), values.current);
  await user.type(screen.getByLabelText("گذرواژه جدید"), values.next);
  await user.type(screen.getByLabelText("تکرار گذرواژه جدید"), values.confirmation);
}

describe("ChangePasswordForm", () => {
  it("uses current/new password autocomplete and provides a reveal control for each secret", async () => {
    await renderForm();

    expect(screen.getByLabelText("گذرواژه فعلی")).toHaveProperty("autocomplete", "current-password");
    expect(screen.getByLabelText("گذرواژه جدید")).toHaveProperty("autocomplete", "new-password");
    expect(screen.getByLabelText("تکرار گذرواژه جدید")).toHaveProperty("autocomplete", "new-password");
    expect(screen.getAllByRole("button", { name: /نمایش.*گذرواژه/ })).toHaveLength(3);

    await userEvent.click(screen.getByRole("button", { name: "نمایش گذرواژه جدید" }));
    expect(screen.getByLabelText("گذرواژه جدید")).toHaveProperty("type", "text");
    expect(screen.getByLabelText("گذرواژه جدید")).toHaveProperty("autocomplete", "new-password");
  });

  it("blocks a mismatched confirmation before any password reaches the request client", async () => {
    const { client } = await renderForm();
    const user = userEvent.setup();
    await fillSecrets(user, { current: "Current secret phrase", next: "New secret phrase 123!", confirmation: "Different secret phrase 123!" });

    await user.click(screen.getByRole("button", { name: "تغییر گذرواژه" }));

    expect(client.changePassword).not.toHaveBeenCalled();
    expect((await screen.findByRole("alert")).textContent).toContain("تکرار گذرواژه");
  });

  it("keeps an incorrect current password on the form with a local actionable error", async () => {
    const failure = new ApiError({ code: "INVALID_CREDENTIALS", message: "server detail", fields: {}, requestId: "request-1" });
    const { client } = await renderForm();
    client.changePassword.mockRejectedValue(failure);
    const user = userEvent.setup();
    await fillSecrets(user);

    await user.click(screen.getByRole("button", { name: "تغییر گذرواژه" }));

    expect((await screen.findByRole("alert")).textContent).toBe("گذرواژه فعلی صحیح نیست. دوباره تلاش کنید.");
    expect(screen.getByLabelText("گذرواژه فعلی")).toHaveProperty("value", "Current secret phrase");
  });

  it("disables every secret and action while the password change is pending", async () => {
    const { client } = await renderForm();
    client.changePassword.mockImplementation(() => new Promise(() => undefined));
    const user = userEvent.setup();
    await fillSecrets(user);

    await user.click(screen.getByRole("button", { name: "تغییر گذرواژه" }));

    expect(screen.getByRole("button", { name: "در حال ذخیره…" })).toHaveProperty("disabled", true);
    for (const label of ["گذرواژه فعلی", "گذرواژه جدید", "تکرار گذرواژه جدید"]) {
      expect(screen.getByLabelText(label)).toHaveProperty("disabled", true);
    }
  });

  it("clears all secrets and returns the complete new session after success without persisting them", async () => {
    const onChanged = vi.fn();
    const { client } = await renderForm({ onChanged });
    const user = userEvent.setup();
    await fillSecrets(user);

    await user.click(screen.getByRole("button", { name: "تغییر گذرواژه" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(changedSession));
    expect(client.changePassword).toHaveBeenCalledWith({ currentPassword: "Current secret phrase", newPassword: "New secret phrase 123!" });
    for (const label of ["گذرواژه فعلی", "گذرواژه جدید", "تکرار گذرواژه جدید"]) {
      expect(screen.getByLabelText(label)).toHaveProperty("value", "");
    }
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(window.location.href).not.toContain("secret");
  });

  it("shows the direct credential-state notice only for temporary-password sessions and preserves logout", async () => {
    const onLoggedOut = vi.fn();
    const { client } = await renderForm({ mustChangePassword: true, onLoggedOut });

    expect(screen.getByRole("status").textContent).toContain("گذرواژه موقت");
    await userEvent.click(screen.getByRole("button", { name: "خروج" }));
    await waitFor(() => expect(client.logout).toHaveBeenCalledOnce());
    expect(onLoggedOut).toHaveBeenCalledOnce();
  });

  it("remains available for voluntary changes without presenting a temporary-password warning", async () => {
    await renderForm({ mustChangePassword: false });

    expect(screen.getByRole("heading", { name: "تغییر گذرواژه" })).toBeTruthy();
    expect(screen.queryByText(/گذرواژه موقت/)).toBeNull();
  });

  it("clears every detached password input when the form unmounts", async () => {
    const { view } = await renderForm();
    const user = userEvent.setup();
    await fillSecrets(user);
    const fields = ["گذرواژه فعلی", "گذرواژه جدید", "تکرار گذرواژه جدید"].map((label) => screen.getByLabelText(label));

    view.unmount();

    expect(fields.map((field) => field.value)).toEqual(["", "", ""]);
  });
});
