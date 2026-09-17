import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UserForm } from "./user-form.js";
import { UsersTable, type UsersTableClient } from "./users-table.js";

afterEach(cleanup);

const principal = {
  userId: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f",
  sessionId: "35cce04f-5ac1-497c-9798-951e935cdcf0",
  phone: "+989121234567",
  permissions: ["users:read", "users:create", "users:credentials:manage", "users:update", "users:suspend"],
};

const row = {
  id: "013a40c7-82e7-4435-a5d6-988b03fdce37",
  phone: "+989121234567",
  firstName: "سارا",
  lastName: "رضایی",
  status: "SUSPENDED" as const,
  username: "sara.rezaei",
  credentialsReady: true,
  mustChangePassword: false,
  lastLoginAt: null,
  createdAt: "2026-08-28T10:00:00.000Z",
  updatedAt: "2026-08-28T10:00:00.000Z",
};

describe("UsersTable", () => {
  it("hides user creation without users:create", async () => {
    const client = { list: vi.fn().mockResolvedValue(emptyPage()) } satisfies UsersTableClient;
    render(<UsersTable principal={{ ...principal, permissions: ["users:read"] }} client={client} />);

    await screen.findByText("کاربری برای نمایش وجود ندارد.");
    expect(screen.queryByRole("button", { name: "کاربر جدید" })).toBeNull();
  });

  it("marks suspended users with a visible status badge", async () => {
    render(<UsersTable principal={principal} client={{ list: vi.fn().mockResolvedValue(page()) }} />);

    expect(await screen.findByText("تعلیق‌شده")).toBeTruthy();
    expect(screen.getByText("sara.rezaei")).toBeTruthy();
  });

  it("shows user creation only when both creation and credential-management permissions are effective", async () => {
    const client = { list: vi.fn().mockResolvedValue(emptyPage()) } satisfies UsersTableClient;
    const view = render(<UsersTable principal={{ ...principal, permissions: ["users:read", "users:create"] }} client={client} />);
    await screen.findByText("کاربری برای نمایش وجود ندارد.");
    expect(screen.queryByRole("button", { name: "کاربر جدید" })).toBeNull();

    view.rerender(<UsersTable principal={{ ...principal, permissions: ["users:read", "users:create", "users:credentials:manage"] }} client={client} />);
    expect(await screen.findByRole("button", { name: "کاربر جدید" })).toBeTruthy();
  });

  it("moves to the next page without expanding beyond the list contract", async () => {
    const list = vi.fn()
      .mockResolvedValueOnce(page({ meta: { page: 1, pageSize: 20, total: 21, pageCount: 2 } }))
      .mockResolvedValueOnce(page({ meta: { page: 2, pageSize: 20, total: 21, pageCount: 2 } }));
    render(<UsersTable principal={principal} client={{ list }} />);

    await screen.findByText("صفحه 1 از 2");
    fireEvent.click(screen.getByRole("button", { name: "بعدی" }));
    await screen.findByText("صفحه 2 از 2");
    expect(list).toHaveBeenLastCalledWith({ page: 2 });
  });

  it("shows a permission-denied state before requesting protected data", () => {
    const client = { list: vi.fn() } satisfies UsersTableClient;
    render(<UsersTable principal={{ ...principal, permissions: [] }} client={client} />);

    expect(screen.getByText("اجازه مشاهده کاربران را ندارید.")).toBeTruthy();
    expect(client.list).not.toHaveBeenCalled();
  });
});

describe("UserForm", () => {
  it("requires profile, username, and confirmed initial password for user creation", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<UserForm onSave={onSave} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("نام کاربری")).toHaveProperty("autocomplete", "username");
    expect(screen.getByLabelText("گذرواژه اولیه")).toHaveProperty("autocomplete", "new-password");
    expect(screen.getByLabelText("تکرار گذرواژه اولیه")).toHaveProperty("autocomplete", "new-password");
    await user.type(screen.getByLabelText("نام"), "سارا");
    await user.type(screen.getByLabelText("نام خانوادگی"), "رضایی");
    await user.type(screen.getByLabelText("شماره موبایل"), "09121234567");
    await user.type(screen.getByLabelText("نام کاربری"), "sara.rezaei");
    await user.type(screen.getByLabelText("گذرواژه اولیه"), "Initial secret phrase 123!");
    await user.type(screen.getByLabelText("تکرار گذرواژه اولیه"), "Initial secret phrase 123!");
    await user.click(screen.getByRole("button", { name: "ذخیره کاربر" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      firstName: "سارا",
      lastName: "رضایی",
      phone: "09121234567",
      username: "sara.rezaei",
      initialPassword: "Initial secret phrase 123!",
    }));
    expect(screen.getByLabelText("گذرواژه اولیه")).toHaveProperty("value", "");
    expect(screen.getByLabelText("تکرار گذرواژه اولیه")).toHaveProperty("value", "");
  });

  it("blocks mismatched initial-password confirmation and keeps errors inside the create form", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<UserForm onSave={onSave} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText("گذرواژه اولیه"), "Initial secret phrase 123!");
    await user.type(screen.getByLabelText("تکرار گذرواژه اولیه"), "Different secret phrase 123!");

    await user.click(screen.getByRole("button", { name: "ذخیره کاربر" }));

    expect(onSave).not.toHaveBeenCalled();
    expect((await screen.findByRole("alert")).textContent).toContain("تکرار گذرواژه");
  });

  it("keeps existing profile editing free of credential inputs", () => {
    render(<UserForm initial={row} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByLabelText("نام کاربری")).toBeNull();
    expect(screen.queryByLabelText("گذرواژه اولیه")).toBeNull();
    expect(screen.getByLabelText("نام")).toHaveProperty("value", "سارا");
  });
});

function page(overrides: Partial<{ items: typeof row[]; meta: { page: number; pageSize: number; total: number; pageCount: number } }> = {}) {
  return { items: [row], meta: { page: 1, pageSize: 20, total: 1, pageCount: 1 }, ...overrides };
}

function emptyPage() {
  return { items: [], meta: { page: 1, pageSize: 20, total: 0, pageCount: 0 } };
}
