import { ApiError } from "@effect-erp/contracts";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SessionList } from "./session-list.js";

afterEach(cleanup);

describe("SessionList", () => {
  it("recovers when the initial session load reports an expired access cookie", async () => {
    const onUnauthenticated = vi.fn();
    render(
      <SessionList
        client={{
          listSessions: vi.fn().mockRejectedValue(new ApiError({
            code: "AUTHENTICATION_REQUIRED",
            message: "نشست شما منقضی شده است.",
            fields: {},
            requestId: "request-1",
          })),
          revokeSession: vi.fn(),
          logoutAll: vi.fn(),
        }}
        onUnauthenticated={onUnauthenticated}
      />,
    );

    await waitFor(() => expect(onUnauthenticated).toHaveBeenCalledOnce());
  });

  it("shows loading until session data arrives", async () => {
    let resolvePage: ((page: SessionPage) => void) | undefined;
    render(<SessionList client={client({ listSessions: vi.fn(() => new Promise((resolve) => { resolvePage = resolve; })) })} />);

    expect(screen.getByRole("status").textContent).toContain("در حال دریافت نشست‌ها");
    resolvePage?.(page());
    expect((await screen.findByText("Chrome در تهران")).textContent).toBe("Chrome در تهران نشست فعلی");
  });

  it("shows an API error and retries the session request", async () => {
    const listSessions = vi.fn()
      .mockRejectedValueOnce(apiError("RATE_LIMITED", "دریافت نشست‌ها محدود شده است."))
      .mockResolvedValueOnce(page());
    render(<SessionList client={client({ listSessions })} />);

    expect((await screen.findByRole("alert")).textContent).toContain("دریافت نشست‌ها محدود شده است.");
    fireEvent.click(screen.getByRole("button", { name: "تلاش دوباره" }));
    await screen.findByText("Chrome در تهران");
    expect(listSessions).toHaveBeenCalledTimes(2);
  });

  it("shows the empty state and allows a refresh", async () => {
    const listSessions = vi.fn().mockResolvedValue(emptyPage());
    render(<SessionList client={client({ listSessions })} />);

    expect(await screen.findByText("نشست فعالی برای نمایش وجود ندارد.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "تازه‌سازی" }));
    await waitFor(() => expect(listSessions).toHaveBeenCalledTimes(2));
  });

  it("marks the current session and confirms before revoking another one", async () => {
    render(<SessionList client={client()} />);

    await screen.findByText("Chrome در تهران");
    expect(screen.getByText("نشست فعلی")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "لغو نشست" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "لغو نشست" }));
    expect(screen.getByText("از لغو این نشست مطمئن هستید؟")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "انصراف" }));
    expect(screen.queryByText("از لغو این نشست مطمئن هستید؟")).toBeNull();
  });

  it("revokes a confirmed other session and refreshes the page", async () => {
    const revokeSession = vi.fn().mockResolvedValue(undefined);
    const listSessions = vi.fn().mockResolvedValue(page());
    render(<SessionList client={client({ listSessions, revokeSession })} />);

    await screen.findByText("Safari در شیراز");
    fireEvent.click(screen.getByRole("button", { name: "لغو نشست" }));
    fireEvent.click(screen.getByRole("button", { name: "بله، لغو کن" }));
    await waitFor(() => expect(revokeSession).toHaveBeenCalledWith(otherSession.id));
    await waitFor(() => expect(listSessions).toHaveBeenCalledTimes(2));
  });

  it("paginates with the shared page shape", async () => {
    const listSessions = vi.fn()
      .mockResolvedValueOnce(page({ meta: { page: 1, pageSize: 20, total: 21, pageCount: 2 } }))
      .mockResolvedValueOnce(page({ items: [otherSession], meta: { page: 2, pageSize: 20, total: 21, pageCount: 2 } }));
    render(<SessionList client={client({ listSessions })} />);

    await screen.findByText("صفحه 1 از 2");
    fireEvent.click(screen.getByRole("button", { name: "بعدی" }));
    await screen.findByText("صفحه 2 از 2");
    expect(listSessions).toHaveBeenLastCalledWith({ page: 2 });
  });

  it("logs out every session and hands recovery to the route", async () => {
    const onUnauthenticated = vi.fn();
    const logoutAll = vi.fn().mockResolvedValue(undefined);
    render(<SessionList client={client({ logoutAll })} onUnauthenticated={onUnauthenticated} />);

    await screen.findByText("Chrome در تهران");
    fireEvent.click(screen.getByRole("button", { name: "خروج از همه نشست‌ها" }));
    await waitFor(() => expect(logoutAll).toHaveBeenCalledOnce());
    expect(onUnauthenticated).toHaveBeenCalledOnce();
  });

  it.each([
    ["revokeSession", "لغو نشست", "بله، لغو کن"],
    ["logoutAll", "خروج از همه نشست‌ها", undefined],
  ] as const)("recovers after an authentication failure from %s", async (operation, firstAction, confirmation) => {
    const onUnauthenticated = vi.fn();
    const failingClient = client({ [operation]: vi.fn().mockRejectedValue(apiError("AUTHENTICATION_REQUIRED", "نشست شما منقضی شده است.")) });
    render(<SessionList client={failingClient} onUnauthenticated={onUnauthenticated} />);

    await screen.findByText("Chrome در تهران");
    fireEvent.click(screen.getByRole("button", { name: firstAction }));
    if (confirmation) fireEvent.click(screen.getByRole("button", { name: confirmation }));
    await waitFor(() => expect(onUnauthenticated).toHaveBeenCalledOnce());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps a non-authentication revoke failure on the retryable error path", async () => {
    const onUnauthenticated = vi.fn();
    render(<SessionList client={client({ revokeSession: vi.fn().mockRejectedValue(apiError("SESSION_NOT_FOUND", "نشست پیدا نشد.")) })} onUnauthenticated={onUnauthenticated} />);

    await screen.findByText("Safari در شیراز");
    fireEvent.click(screen.getByRole("button", { name: "لغو نشست" }));
    fireEvent.click(screen.getByRole("button", { name: "بله، لغو کن" }));
    expect((await screen.findByRole("alert")).textContent).toContain("نشست پیدا نشد.");
    expect(onUnauthenticated).not.toHaveBeenCalled();
  });
});

type SessionPage = {
  items: typeof currentSession[];
  meta: { page: number; pageSize: number; total: number; pageCount: number };
};

const currentSession = {
  id: "e8292771-e347-4f55-ad5f-ed813cfa42b5",
  device: "Chrome در تهران",
  ipAddress: "192.0.2.10",
  createdAt: "2026-08-28T10:00:00.000Z",
  lastUsedAt: "2026-08-28T11:00:00.000Z",
  current: true,
};

const otherSession = {
  id: "23a65e42-2f76-4b75-a6b8-2688b4306c88",
  device: "Safari در شیراز",
  ipAddress: "192.0.2.11",
  createdAt: "2026-08-27T10:00:00.000Z",
  lastUsedAt: "2026-08-27T11:00:00.000Z",
  current: false,
};

function page(overrides: Partial<SessionPage> = {}): SessionPage {
  return { items: [currentSession, otherSession], meta: { page: 1, pageSize: 20, total: 2, pageCount: 1 }, ...overrides };
}

function emptyPage(): SessionPage {
  return { items: [], meta: { page: 1, pageSize: 20, total: 0, pageCount: 0 } };
}

function apiError(code: string, message: string) {
  return new ApiError({ code, message, fields: {}, requestId: "request-1" });
}

function client(overrides: Record<string, unknown> = {}) {
  return {
    listSessions: vi.fn().mockResolvedValue(page()),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    logoutAll: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
