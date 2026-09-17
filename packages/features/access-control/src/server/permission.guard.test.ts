import { randomUUID } from "node:crypto";

import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import { PermissionGuard } from "./permission.guard.js";
import { PERMISSION_METADATA_KEY } from "./require-permission.decorator.js";

describe("permission guard", () => {
  it("denies by default when a protected request has no authenticated principal", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(["users:read"]),
    } as unknown as Reflector;
    const guard = new PermissionGuard(reflector, {
      hasPermission: vi.fn(),
    } as never);
    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => ({}) }),
    };
    await expect(guard.canActivate(context as never)).rejects.toMatchObject({
      status: 403,
      response: { error: { code: "PERMISSION_DENIED", requestId: "unknown" } },
    });
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      PERMISSION_METADATA_KEY,
      expect.any(Array),
    );
  });

  it("checks the shared principal userId against required metadata", async () => {
    const userId = randomUUID();
    const hasPermission = vi.fn().mockResolvedValue(true);
    const guard = new PermissionGuard(
      { getAllAndOverride: vi.fn().mockReturnValue(["users:read"]) } as never,
      { hasPermission } as never,
    );
    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { userId } }) }),
    };
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(hasPermission).toHaveBeenCalledWith(userId, "users:read");
  });
});
