import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import { SessionEntity } from "../entities/index.js";
import { AuthenticationGuard } from "./authentication.guard.js";
import { PUBLIC_ROUTE_METADATA_KEY } from "./public.decorator.js";
import { TokenService } from "./token.service.js";

const options = {
  pepper: "guard-otp-pepper-at-least-32-characters",
  ttlSeconds: 120,
  resendSeconds: 60,
  jwtAccessSecret: "guard-jwt-secret-at-least-32-characters",
  accessTtlSeconds: 900,
  refreshTtlDays: 30,
  cookieSecure: false,
};

const user = {
  id: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f",
  phone: "+989121234567",
  status: "ACTIVE",
};
const session = Object.assign(new SessionEntity(), {
  id: "7f29f0a6-ecae-4f46-afec-c6fe306502bd",
  userId: user.id,
  revokedAt: null,
});

function executionContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

function createGuard({
  activeSession = session,
  activeUser = user,
  isPublic = false,
}: {
  activeSession?: SessionEntity | null;
  activeUser?: typeof user | null;
  isPublic?: boolean;
} = {}) {
  const tokens = new TokenService(options);
  const reflector = {
    getAllAndOverride: vi.fn((key: string) =>
      key === PUBLIC_ROUTE_METADATA_KEY && isPublic ? true : undefined,
    ),
  } as unknown as Reflector;
  const sessionRepository = {
    findOneBy: vi.fn().mockResolvedValue(activeSession),
    save: vi.fn().mockImplementation(async (saved: SessionEntity) => saved),
  };
  const dataSource = {
    manager: {
      getRepository(Entity: unknown) {
        if (Entity === SessionEntity) {
          return sessionRepository;
        }
        return {
          findOneBy: vi.fn().mockResolvedValue(activeUser),
        };
      },
    },
  };
  const access = {
    listEffectivePermissions: vi
      .fn()
      .mockResolvedValue(["audit:read", "sessions:revoke"]),
  };
  return {
    access,
    guard: new AuthenticationGuard(
      reflector,
      dataSource as never,
      tokens,
      access as never,
    ),
    sessionRepository,
    tokens,
  };
}

describe("AuthenticationGuard", () => {
  it("skips authentication for public routes", async () => {
    const { guard } = createGuard({ isPublic: true, activeSession: null });

    await expect(
      guard.canActivate(executionContext({ headers: {} })),
    ).resolves.toBe(true);
  });

  it("loads the active session, active user, and effective permissions", async () => {
    const { access, guard, tokens } = createGuard();
    const accessToken = tokens.signAccessToken({
      userId: user.id,
      sessionId: session.id,
      phone: user.phone,
    });
    const request = {
      headers: { cookie: `effect_access=${accessToken}` },
    };

    await expect(guard.canActivate(executionContext(request))).resolves.toBe(
      true,
    );

    expect(request).toMatchObject({
      user: {
        userId: user.id,
        sessionId: session.id,
        phone: user.phone,
        permissions: ["audit:read", "sessions:revoke"],
      },
    });
    expect(access.listEffectivePermissions).toHaveBeenCalledWith(user.id);
  });

  it("does not write an unlocked session while authenticating", async () => {
    const { guard, sessionRepository, tokens } = createGuard();
    const accessToken = tokens.signAccessToken({
      userId: user.id,
      sessionId: session.id,
      phone: user.phone,
    });

    await expect(
      guard.canActivate(
        executionContext({
          headers: { cookie: `effect_access=${accessToken}` },
        }),
      ),
    ).resolves.toBe(true);
    expect(sessionRepository.save).not.toHaveBeenCalled();
  });

  it("rejects a revoked session immediately", async () => {
    const { guard, tokens } = createGuard({
      activeSession: Object.assign(new SessionEntity(), session, {
        revokedAt: new Date(),
      }),
    });
    const accessToken = tokens.signAccessToken({
      userId: user.id,
      sessionId: session.id,
      phone: user.phone,
    });

    await expect(
      guard.canActivate(
        executionContext({
          headers: { cookie: `effect_access=${accessToken}` },
        }),
      ),
    ).rejects.toMatchObject({
      response: { error: { code: "SESSION_REVOKED" } },
    });
  });

  it("rejects a malformed access cookie as unauthenticated", async () => {
    const { guard } = createGuard();

    await expect(
      guard.canActivate(
        executionContext({ headers: { cookie: "effect_access=%" } }),
      ),
    ).rejects.toMatchObject({
      response: { error: { code: "AUTHENTICATION_REQUIRED" } },
    });
  });

  it("rejects a session that has passed its family expiry", async () => {
    const { guard, tokens } = createGuard({
      activeSession: Object.assign(new SessionEntity(), session, {
        expiresAt: new Date(Date.now() - 1_000),
      }),
    });
    const accessToken = tokens.signAccessToken({
      userId: user.id,
      sessionId: session.id,
      phone: user.phone,
    });

    await expect(
      guard.canActivate(
        executionContext({
          headers: { cookie: `effect_access=${accessToken}` },
        }),
      ),
    ).rejects.toMatchObject({
      response: { error: { code: "SESSION_REVOKED" } },
    });
  });
});
