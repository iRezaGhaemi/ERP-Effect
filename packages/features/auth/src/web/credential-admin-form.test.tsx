import { ApiError } from "@effect-erp/contracts";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

const pendingUser = { id: "013a40c7-82e7-4435-a5d6-988b03fdce37", username: null, credentialsReady: false, mustChangePassword: true };
const preparedUser = { ...pendingUser, username: "sara.rezaei", credentialsReady: true };

async function renderForm(target = pendingUser, props: Record<string, unknown> = {}) {
  const { CredentialAdminForm } = await import("./credential-admin-form.js");
  const client = { setupCredentials: vi.fn().mockResolvedValue(undefined), resetPassword: vi.fn().mockResolvedValue(undefined) };
  return { client, view: render(<CredentialAdminForm target={target} client={client} {...props} />) };
}

describe("CredentialAdminForm", () => {
  it("shows setup for an unprepared account and submits actor password plus confirmed initial secret", async () => {
    const onSaved = vi.fn();
    const { client } = await renderForm(pendingUser, { onSaved });
    const user = userEvent.setup();
    expect(screen.getByRole("heading", { name: "تنظیم اطلاعات ورود" })).toBeTruthy();
    await user.type(screen.getByLabelText("نام کاربری"), "sara.rezaei");
    await user.type(screen.getByLabelText("گذرواژه اولیه"), "Initial secret phrase 123!");
    await user.type(screen.getByLabelText("تکرار گذرواژه اولیه"), "Initial secret phrase 123!");
    await user.type(screen.getByLabelText("گذرواژه مدیر"), "Administrator secret");

    await user.click(screen.getByRole("button", { name: "تنظیم اطلاعات ورود" }));

    await waitFor(() => expect(client.setupCredentials).toHaveBeenCalledWith(pendingUser.id, { username: "sara.rezaei", initialPassword: "Initial secret phrase 123!", actorPassword: "Administrator secret" }));
    expect(onSaved).toHaveBeenCalledWith({ username: "sara.rezaei", credentialsReady: true, mustChangePassword: true });
    for (const label of ["گذرواژه اولیه", "تکرار گذرواژه اولیه", "گذرواژه مدیر"]) expect(screen.getByLabelText(label)).toHaveProperty("value", "");
  });

  it("shows reset for a prepared account and requires confirmed new secret plus actor password", async () => {
    const { client } = await renderForm(preparedUser);
    const user = userEvent.setup();
    expect(screen.getByRole("heading", { name: "بازنشانی گذرواژه" })).toBeTruthy();
    expect(screen.queryByLabelText("نام کاربری")).toBeNull();
    await user.type(screen.getByLabelText("گذرواژه جدید"), "Replacement secret 123!");
    await user.type(screen.getByLabelText("تکرار گذرواژه جدید"), "Replacement secret 123!");
    await user.type(screen.getByLabelText("گذرواژه مدیر"), "Administrator secret");

    await user.click(screen.getByRole("button", { name: "بازنشانی گذرواژه" }));

    await waitFor(() => expect(client.resetPassword).toHaveBeenCalledWith(preparedUser.id, { newPassword: "Replacement secret 123!", actorPassword: "Administrator secret" }));
  });

  it("blocks setup/reset mismatches before a request and keeps failure messages local without rendering secrets", async () => {
    const { client, view } = await renderForm(preparedUser);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("گذرواژه جدید"), "Replacement secret 123!");
    await user.type(screen.getByLabelText("تکرار گذرواژه جدید"), "Different replacement 123!");
    await user.type(screen.getByLabelText("گذرواژه مدیر"), "Administrator secret");
    await user.click(screen.getByRole("button", { name: "بازنشانی گذرواژه" }));
    expect(client.resetPassword).not.toHaveBeenCalled();
    expect((await screen.findByRole("alert")).textContent).toContain("تکرار گذرواژه");

    client.resetPassword.mockRejectedValue(new ApiError({ code: "INVALID_CREDENTIALS", message: "گذرواژه مدیر صحیح نیست.", fields: {}, requestId: "request-1" }));
    await user.clear(screen.getByLabelText("تکرار گذرواژه جدید"));
    await user.type(screen.getByLabelText("تکرار گذرواژه جدید"), "Replacement secret 123!");
    await user.click(screen.getByRole("button", { name: "بازنشانی گذرواژه" }));
    expect((await screen.findByRole("alert")).textContent).toBe("گذرواژه مدیر صحیح نیست.");
    expect(view.container.textContent).not.toContain("Administrator secret");
    expect(view.container.textContent).not.toContain("Replacement secret 123!");
  });

  it("disables credential controls while saving", async () => {
    const { client } = await renderForm(preparedUser);
    client.resetPassword.mockImplementation(() => new Promise(() => undefined));
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("گذرواژه جدید"), "Replacement secret 123!");
    await user.type(screen.getByLabelText("تکرار گذرواژه جدید"), "Replacement secret 123!");
    await user.type(screen.getByLabelText("گذرواژه مدیر"), "Administrator secret");
    await user.click(screen.getByRole("button", { name: "بازنشانی گذرواژه" }));

    expect(screen.getByRole("button", { name: "در حال ذخیره…" })).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("گذرواژه مدیر")).toHaveProperty("disabled", true);
  });
});
