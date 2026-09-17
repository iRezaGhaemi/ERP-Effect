import { AuditWriter } from "@effect/audit/server";
import type { RequestContext } from "@effect-erp/contracts";
import { startPostgresContainer } from "@effect-erp/testing";
import { UserEntity, UserStatus } from "@effect/users/entities";
import { IsNull } from "typeorm";
import { describe, expect, it } from "vitest";

import { createDataSource } from "../../../../platform/database/src/data-source.js";
import { RefreshTokenEntity, SessionEntity } from "../entities/index.js";
import { SessionService } from "./session.service.js";
import { TokenService } from "./token.service.js";

const options = {
  rateLimitSecret: "session-rate-limit-secret-at-least-32-characters",
  jwtAccessSecret: "session-jwt-secret-at-least-32-characters",
  accessTtlSeconds: 900,
  refreshTtlDays: 30,
  cookieSecure: false,
};

const context: RequestContext = {
  requestId: "req_session_integration",
  ipAddress: "127.0.0.1",
  userAgent: "Vitest Browser",
};

describe("SessionService password-era lifecycle", () => {
  it("preserves refresh rotation/reuse defense plus list, logout, revoke, and logout-all", async () => {
    const container = await startPostgresContainer();
    const url = `postgres://effect:effect@${container.getHost()}:${container.getMappedPort(5432)}/effect_erp`;
    const source = createDataSource({ url });
    try {
      await source.initialize();
      await source.runMigrations();
      const users = source.getRepository(UserEntity);
      const user = await users.save(
        users.create({
          phone: "+989121234567",
          firstName: "Session",
          lastName: "Tester",
          status: UserStatus.ACTIVE,
          username: "session.tester",
          passwordHash: "$scrypt$permanent-test-hash",
          mustChangePassword: false,
          temporaryPasswordExpiresAt: null,
          passwordChangedAt: new Date(),
          credentialVersion: 1,
          lastLoginAt: null,
        }),
      );
      const service = new SessionService(
        source,
        new AuditWriter(source),
        new TokenService(options),
        options,
        {},
      );

      const first = await service.createForLogin(user, context);
      const rotated = await service.refresh(first.refreshToken, context);
      expect(rotated.refreshToken).not.toBe(first.refreshToken);
      await expect(service.refresh(first.refreshToken, context)).rejects.toMatchObject({
        code: "SESSION_REVOKED",
      });
      await expect(service.refresh(rotated.refreshToken, context)).rejects.toMatchObject({
        code: "SESSION_REVOKED",
      });
      expect(await source.getRepository(SessionEntity).findOneByOrFail({ id: first.sessionId }))
        .toMatchObject({ revokedReason: "REFRESH_REUSE" });

      const loggedOut = await service.createForLogin(user, context);
      await service.logout(loggedOut.sessionId, user.id, context);
      expect(await source.getRepository(SessionEntity).findOneByOrFail({ id: loggedOut.sessionId }))
        .toMatchObject({ revokedReason: "LOGOUT" });

      const revoked = await service.createForLogin(user, context);
      const final = await service.createForLogin(user, context);
      const page = await service.listSessions(user.id, final.sessionId, { page: 1, pageSize: 20 });
      expect(page.items.map(({ id }) => id)).toEqual(expect.arrayContaining([revoked.sessionId, final.sessionId]));
      expect(page.items.find(({ id }) => id === final.sessionId)?.current).toBe(true);
      expect(page.items[0]?.ipAddress).toBe("127.0.0.0");

      await service.revokeSession(revoked.sessionId, user.id, context);
      expect(await source.getRepository(SessionEntity).findOneByOrFail({ id: revoked.sessionId }))
        .toMatchObject({ revokedReason: "ADMIN_REVOKED" });
      await service.logoutAll(user.id, context);
      expect(await source.getRepository(SessionEntity).findOneByOrFail({ id: final.sessionId }))
        .toMatchObject({ revokedReason: "LOGOUT_ALL" });
      expect(await source.getRepository(RefreshTokenEntity).count({
        where: { sessionId: final.sessionId, revokedAt: IsNull() },
      })).toBe(0);

      const expired = await service.createForLogin(user, context);
      await source.getRepository(SessionEntity).update(
        { id: expired.sessionId },
        { expiresAt: new Date(Date.now() - 1_000) },
      );
      await expect(service.refresh(expired.refreshToken, context)).rejects.toMatchObject({
        code: "SESSION_REVOKED",
      });
      expect(await source.getRepository(SessionEntity).findOneByOrFail({ id: expired.sessionId }))
        .toMatchObject({ revokedReason: "SESSION_EXPIRED" });
      expect(await source.getRepository(RefreshTokenEntity).count({
        where: { sessionId: expired.sessionId, revokedAt: IsNull() },
      })).toBe(0);

      const concurrent = await service.createForLogin(user, context);
      const concurrentResults = await Promise.allSettled([
        service.refresh(concurrent.refreshToken, context),
        service.refresh(concurrent.refreshToken, context),
      ]);
      expect(concurrentResults.map(({ status }) => status).sort()).toEqual([
        "fulfilled",
        "rejected",
      ]);
      expect(await source.getRepository(SessionEntity).findOneByOrFail({ id: concurrent.sessionId }))
        .toMatchObject({ revokedReason: "REFRESH_REUSE" });

      const mappedContext = {
        ...context,
        ipAddress: "::ffff:192.0.2.25",
      };
      const tieA = await service.createForLogin(user, mappedContext);
      const tieB = await service.createForLogin(user, mappedContext);
      await source.query(
        `UPDATE sessions SET last_used_at = $1, created_at = $1
         WHERE id = ANY($2::uuid[])`,
        ["2026-09-01T00:00:00.000Z", [tieA.sessionId, tieB.sessionId]],
      );
      const tiePage = await service.listSessions(user.id, tieA.sessionId, {
        page: 1,
        pageSize: 1,
      });
      expect(tiePage.meta).toMatchObject({ total: 2, pageCount: 2 });
      expect(tiePage.items[0]).toMatchObject({
        id: [tieA.sessionId, tieB.sessionId].sort().at(-1),
        ipAddress: "192.0.2.0",
      });
    } finally {
      if (source.isInitialized) await source.destroy();
      await container.stop();
    }
  });
});
