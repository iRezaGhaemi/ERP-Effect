import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuditTable, type AuditTableClient } from "./audit-table.js";

afterEach(cleanup);

describe("AuditTable", () => {
  it("shows a useful empty audit state", async () => {
    const client = { list: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, pageSize: 20, total: 0, pageCount: 0 } }) } satisfies AuditTableClient;
    render(<AuditTable principal={{ permissions: ["audit:read"] }} client={client} />);

    expect(await screen.findByText("رویداد ثبت‌شده‌ای برای نمایش وجود ندارد.")).toBeTruthy();
  });

  it("renders unknown audit metadata without breaking the history", async () => {
    const client = { list: vi.fn().mockResolvedValue({ items: [{ id: "eb78f4c1-6500-44db-9c1c-0d653e3ced97", actorId: null, action: "user.updated", entityType: "user", entityId: null, metadata: { futureField: { status: "kept" } }, ipAddress: null, requestId: "request-1", createdAt: "2026-08-28T10:00:00.000Z" }], meta: { page: 1, pageSize: 20, total: 1, pageCount: 1 } }) } satisfies AuditTableClient;
    render(<AuditTable principal={{ permissions: ["audit:read"] }} client={client} />);

    expect(await screen.findByText("user.updated")).toBeTruthy();
    expect(screen.getByText(/futureField/)).toBeTruthy();
    expect(screen.getByText(/"status": "kept"/)).toBeTruthy();
  });
});
