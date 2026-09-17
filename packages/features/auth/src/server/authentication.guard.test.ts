import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import { SessionEntity } from "../entities/index.js";
import { AuthenticationGuard } from "./authentication.guard.js";
import { ALLOW_PASSWORD_CHANGE_METADATA_KEY } from "./allow-password-change.decorator.js";
import { PUBLIC_ROUTE_METADATA_KEY } from "./public.decorator.js";
import { TokenService } from "./token.service.js";

const options = {
  rateLimitSecret: "guard-rate-limit-secret-at-least-32-characters",
  jwtAccessSecret: "guard-jwt-secret-at-least-32-characters",
  accessTtlSeconds: 900,
  refreshTtlDays: 30,
  cookieSecure: false,
};

const user = {
  id: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f",
  phone: "+989121234567",
  status: "ACTIVE",
  credentialVersion: 3,
  mustChangePassword: false,
};
const session = Object.assign(new SessionEntity(), {
  id: "7f29f0a6-ecae-4f46-afec-c6fe306502bd",
  userId: user.id,
  revokedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
  credentialVersion: user.credentialVersion,
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
  allowPasswordChange = false,
}: {
  activeSession?: SessionEntity | null;
  activeUser?: typeof user | null;
  isPublic?: boolean;
  allowPasswordChange?: boolean;
} = {}) {
  const tokens = new TokenService(options);
  const reflector = {
    getAllAndOverride: vi.fn((key: string) => {
      if (key === PUBLIC_ROUTE_METADATA_KEY && isPublic) return true;
      if (key === ALLOW_PASSWORD_CHANGE_METADATA_KEY && allowPasswordChange)
        return true;
      return undefined;
    }),
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
      credentialVersion: user.credentialVersion,
      mustChangePassword: user.mustChangePassword,
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
        credentialVersion: user.credentialVersion,
        mustChangePassword: false,
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
      credentialVersion: user.credentialVersion,
      mustChangePassword: user.mustChangePassword,
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
      credentialVersion: user.credentialVersion,
      mustChangePassword: user.mustChangePassword,
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
      credentialVersion: user.credentialVersion,
      mustChangePassword: user.mustChangePassword,
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

  it("restricts temporary sessions to the explicit password-change allowlist", async () => {
    const temporaryUser = { ...user, mustChangePassword: true };
    const temporarySession = Object.assign(new SessionEntity(), session, {
      credentialVersion: temporaryUser.credentialVersion,
    });
    const denied = createGuard({
      activeSession: temporarySession,
      activeUser: temporaryUser,
    });
    const token = denied.tokens.signAccessToken({
      userId: temporaryUser.id,
      sessionId: temporarySession.id,
      phone: temporaryUser.phone,
      credentialVersion: temporaryUser.credentialVersion,
      mustChangePassword: true,
    });
    await expect(
      denied.guard.canActivate(
        executionContext({ headers: { cookie: `effect_access=${token}` } }),
      ),
    ).rejects.toMatchObject({
      response: { error: { code: "PASSWORD_CHANGE_REQUIRED" } },
    });

    const allowed = createGuard({
      activeSession: temporarySession,
      activeUser: temporaryUser,
      allowPasswordChange: true,
    });
    await expect(
      allowed.guard.canActivate(
        executionContext({ headers: { cookie: `effect_access=${token}` } }),
      ),
    ).resolves.toBe(true);
  });
});
