import { createHmac } from "node:crypto";

import { AuditLogEntity } from "@effect/audit/entities";
import type { RequestContext } from "@effect-erp/contracts";
import { UserEntity, UserStatus } from "@effect/users/entities";
import { IsNull } from "typeorm";
import { describe, expect, it } from "vitest";

import {
  OtpChallengeEntity,
  OtpDeliveryJobEntity,
  RefreshTokenEntity,
  SessionEntity,
} from "../entities/index.js";
import { SessionFixture } from "../test/session.fixture.js";
import { OtpCodeSealer } from "./otp-code-sealer.js";
import { OtpService } from "./otp.service.js";
import { ShortOtpResponseEnvelope } from "./otp-response-envelope.js";
import { RateLimitService } from "./rate-limit.service.js";
import { SessionService } from "./session.service.js";
import { TokenService } from "./token.service.js";

const pepper = "unit-session-otp-pepper-at-least-32-characters";
const jwtAccessSecret = "unit-session-jwt-secret-at-least-32-characters";
const options = {
  pepper,
  ttlSeconds: 120,
  resendSeconds: 60,
  jwtAccessSecret,
  accessTtlSeconds: 900,
  refreshTtlDays: 30,
  cookieSecure: false,
};
const context: RequestContext = {
  requestId: "req_session_unit",
  ipAddress: "127.0.0.1",
  userAgent: "Vitest Browser",
};

type Constructor<T> = new (...args: never[]) => T;
type Row =
  | AuditLogEntity
  | OtpChallengeEntity
  | OtpDeliveryJobEntity
  | RefreshTokenEntity
  | SessionEntity
  | UserEntity;

function otpHash(challengeId: string, code: string): string {
  return createHmac("sha256", pepper)
    .update(`${challengeId}:${code}`)
    .digest("hex");
}

function isNullOperator(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "_type" in value &&
    value._type === "isNull"
  );
}

function isMoreThanOperator(
  value: unknown,
): value is { _type: "moreThan"; _value: Date } {
  return (
    typeof value === "object" &&
    value !== null &&
    "_type" in value &&
    "_value" in value &&
    value._type === "moreThan" &&
    value._value instanceof Date
  );
}

function matchesWhere(row: Row, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, expected]) => {
    const actual = row[key as keyof Row];
    if (isNullOperator(expected)) return actual === null;
    if (isMoreThanOperator(expected))
      return actual instanceof Date && actual > expected._value;
    return actual === expected;
  });
}

type FindAndCountOptions = {
  where: Record<string, unknown>;
  order?: Record<string, "ASC" | "DESC">;
  skip?: number;
  take?: number;
};

function compareValues(left: unknown, right: unknown): number {
  if (left instanceof Date && right instanceof Date)
    return left.getTime() - right.getTime();
  return String(left).localeCompare(String(right));
}

function sortRows<T extends Row>(
  rows: T[],
  order: Record<string, "ASC" | "DESC"> | undefined,
): T[] {
  if (!order) return rows;
  return [...rows].sort((left, right) => {
    for (const [key, direction] of Object.entries(order)) {
      const comparison = compareValues(
        left[key as keyof T],
        right[key as keyof T],
      );
      if (comparison !== 0)
        return direction === "ASC" ? comparison : -comparison;
    }
    return 0;
  });
}

function createRepository<T extends Row>(
  rows: T[],
  Entity: Constructor<T>,
  onFindAndCount?: (options: FindAndCountOptions) => void,
) {
  return {
    create(value: Partial<T>): T {
      return Object.assign(new Entity(), value);
    },
    async save(value: T): Promise<T> {
      const id = typeof value.id === "string" ? value.id : null;
      const index = id ? rows.findIndex((row) => row.id === id) : -1;
      if (index >= 0) rows[index] = value;
      else rows.push(value);
      return value;
    },
    async findOne(options: {
      where: Record<string, unknown>;
    }): Promise<T | null> {
      return rows.find((row) => matchesWhere(row, options.where)) ?? null;
    },
    async findOneBy(where: Record<string, unknown>): Promise<T | null> {
      return rows.find((row) => matchesWhere(row, where)) ?? null;
    },
    async find(options: { where: Record<string, unknown> }): Promise<T[]> {
      return rows.filter((row) => matchesWhere(row, options.where));
    },
    async findAndCount(options: FindAndCountOptions): Promise<[T[], number]> {
      onFindAndCount?.(options);
      const matching = sortRows(
        rows.filter((row) => matchesWhere(row, options.where)),
        options.order,
      );
      const total = matching.length;
      const skip = options.skip ?? 0;
      const take = options.take ?? total;
      return [matching.slice(skip, skip + take), total];
    },
    async count(options: { where: Record<string, unknown> }): Promise<number> {
      return rows.filter((row) => matchesWhere(row, options.where)).length;
    },
    async update(
      where: Record<string, unknown>,
      patch: Partial<T>,
    ): Promise<void> {
      for (const row of rows) {
        if (matchesWhere(row, where)) Object.assign(row, patch);
      }
    },
  };
}

function snapshotRows<T extends Row>(rows: T[]) {
  return rows.map((row) => ({ row, values: structuredClone(row) }));
}

function restoreRows<T extends Row>(
  rows: T[],
  snapshot: Array<{ row: T; values: T }>,
): void {
  for (const { row, values } of snapshot) {
    for (const key of Object.keys(row)) {
      delete (row as Record<string, unknown>)[key];
    }
    Object.assign(row, values);
  }
  rows.splice(0, rows.length, ...snapshot.map(({ row }) => row));
}

function createHarness() {
  const rows = {
    audits: [] as AuditLogEntity[],
    challenges: [] as OtpChallengeEntity[],
    deliveryJobs: [] as OtpDeliveryJobEntity[],
    refreshTokens: [] as RefreshTokenEntity[],
    sessions: [] as SessionEntity[],
    users: [] as UserEntity[],
  };
  const sessionListQueries: FindAndCountOptions[] = [];
  const manager = {
    getRepository(Entity: unknown) {
      if (Entity === AuditLogEntity)
        return createRepository(rows.audits, AuditLogEntity);
      if (Entity === OtpChallengeEntity)
        return createRepository(rows.challenges, OtpChallengeEntity);
      if (Entity === OtpDeliveryJobEntity)
        return createRepository(rows.deliveryJobs, OtpDeliveryJobEntity);
      if (Entity === RefreshTokenEntity)
        return createRepository(rows.refreshTokens, RefreshTokenEntity);
      if (Entity === SessionEntity)
        return createRepository(rows.sessions, SessionEntity, (query) =>
          sessionListQueries.push(query),
        );
      if (Entity === UserEntity)
        return createRepository(rows.users, UserEntity);
      throw new Error("Unknown repository.");
    },
  };
  const dataSource = {
    manager,
    async transaction<T>(
      work: (transactionManager: typeof manager) => Promise<T>,
    ) {
      const snapshot = {
        audits: snapshotRows(rows.audits),
        challenges: snapshotRows(rows.challenges),
        deliveryJobs: snapshotRows(rows.deliveryJobs),
        refreshTokens: snapshotRows(rows.refreshTokens),
        sessions: snapshotRows(rows.sessions),
        users: snapshotRows(rows.users),
      };
      try {
        return await work(manager);
      } catch (error) {
        restoreRows(rows.audits, snapshot.audits);
        restoreRows(rows.challenges, snapshot.challenges);
        restoreRows(rows.deliveryJobs, snapshot.deliveryJobs);
        restoreRows(rows.refreshTokens, snapshot.refreshTokens);
        restoreRows(rows.sessions, snapshot.sessions);
        restoreRows(rows.users, snapshot.users);
        throw error;
      }
    },
  };
  const tokenService = new TokenService(options);
  const auditWriter = {
    async write(event: Partial<AuditLogEntity>, transactionManager = manager) {
      const repository = transactionManager.getRepository(AuditLogEntity);
      await repository.save(repository.create(event));
    },
  };
  const sessionService = new SessionService(
    dataSource as never,
    auditWriter as never,
    tokenService,
    options,
  );
  const otpService = new OtpService(
    dataSource as never,
    { findActiveByPhone: async () => null } as never,
    new RateLimitService(dataSource as never, pepper),
    options,
    new OtpCodeSealer(pepper),
    new ShortOtpResponseEnvelope(0),
    auditWriter as never,
    sessionService,
  );
  return {
    dataSource,
    manager,
    otpService,
    refreshTokenRepository: manager.getRepository(RefreshTokenEntity),
    rows,
    sessionListQueries,
    sessionFixture: new SessionFixture(
      dataSource as never,
      tokenService,
      options,
    ),
    sessionService,
  };
}

function activeUser(): UserEntity {
  return Object.assign(new UserEntity(), {
    id: "6e444c58-63ee-4c74-b39d-f72a5eb84d3f",
    phone: "+989121234567",
    firstName: "کاربر",
    lastName: "فعال",
    status: UserStatus.ACTIVE,
    lastLoginAt: null,
    createdAt: new Date("2026-08-28T00:00:00.000Z"),
    updatedAt: new Date("2026-08-28T00:00:00.000Z"),
  });
}

function deliveredChallenge(userId: string): OtpChallengeEntity {
  const id = "761ff677-7c5e-414b-9565-e9d74082b0b7";
  return Object.assign(new OtpChallengeEntity(), {
    id,
    userId,
    isDecoy: false,
    phone: "+989121234567",
    codeHash: otpHash(id, "123456"),
    attempts: 0,
    expiresAt: new Date(Date.now() + 120_000),
    consumedAt: null,
    invalidatedAt: null,
    requestIp: "127.0.0.1",
    createdAt: new Date("2026-08-28T00:00:01.000Z"),
  });
}

function succeededDeliveryJob(challengeId: string): OtpDeliveryJobEntity {
  return Object.assign(new OtpDeliveryJobEntity(), {
    id: "0b05d1d5-dcdb-4dbf-b477-4c187a7c6b3a",
    challengeId,
    codeCiphertext: null,
    codeNonce: null,
    codeTag: null,
    requestId: "req_delivery",
    status: "SUCCEEDED" as const,
    attempts: 1,
    availableAt: new Date("2026-08-28T00:00:01.000Z"),
    leaseExpiresAt: null,
    leaseToken: null,
    claimVersion: 1,
    completedAt: new Date("2026-08-28T00:00:02.000Z"),
    createdAt: new Date("2026-08-28T00:00:01.000Z"),
    updatedAt: new Date("2026-08-28T00:00:02.000Z"),
  });
}

function rejectedOtpAudits(rows: { audits: AuditLogEntity[] }) {
  return rows.audits.filter(({ action }) => action === "auth.otp_rejected");
}

function expectSafeRejectedOtpAudit(rows: { audits: AuditLogEntity[] }): void {
  expect(rejectedOtpAudits(rows)).toEqual([
    expect.objectContaining({
      actorId: null,
      action: "auth.otp_rejected",
      entityType: "auth",
      entityId: null,
      metadata: {},
      ipAddress: context.ipAddress,
      requestId: context.requestId,
    }),
  ]);
}

describe("OTP verification and rotating sessions", () => {
  it("consumes a delivered OTP challenge exactly once", async () => {
    const harness = createHarness();
    const user = activeUser();
    const challenge = deliveredChallenge(user.id);
    harness.rows.users.push(user);
    harness.rows.challenges.push(challenge);
    harness.rows.deliveryJobs.push(succeededDeliveryJob(challenge.id));

    const first = await harness.otpService.verify(
      { challengeId: challenge.id, code: "123456" },
      context,
    );

    expect(first.user.id).toBe(user.id);
    expect(first.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.accessToken).toEqual(expect.any(String));
    expect(first.refreshToken).toEqual(expect.any(String));
    expect(first.csrfToken).toEqual(expect.any(String));
    expect(harness.rows.audits.map(({ action }) => action)).toContain(
      "auth.login_succeeded",
    );
    await expect(
      harness.otpService.verify(
        { challengeId: challenge.id, code: "123456" },
        context,
      ),
    ).rejects.toMatchObject({ code: "OTP_INVALID" });
    await expect(
      harness.refreshTokenRepository.count({
        where: { sessionId: first.sessionId, revokedAt: IsNull() },
      }),
    ).resolves.toBe(1);
    expect(challenge.consumedAt).toEqual(expect.any(Date));
    expect(user.lastLoginAt).toEqual(expect.any(Date));
    expect(harness.rows.audits.map(({ action }) => action)).toContain(
      "auth.login_succeeded",
    );
    expectSafeRejectedOtpAudit(harness.rows);
    expect(challenge.codeHash).not.toBe("123456");
    expect(
      JSON.stringify({
        audits: harness.rows.audits,
        deliveryJobs: harness.rows.deliveryJobs,
        refreshTokens: harness.rows.refreshTokens,
        sessions: harness.rows.sessions,
      }),
    ).not.toContain("123456");
  });

  it("persists failed attempts and invalidates the fifth wrong OTP", async () => {
    const harness = createHarness();
    const user = activeUser();
    const challenge = deliveredChallenge(user.id);
    challenge.attempts = 4;
    harness.rows.users.push(user);
    harness.rows.challenges.push(challenge);
    harness.rows.deliveryJobs.push(succeededDeliveryJob(challenge.id));

    await expect(
      harness.otpService.verify(
        { challengeId: challenge.id, code: "000000" },
        context,
      ),
    ).rejects.toMatchObject({ code: "OTP_INVALID" });

    expect(challenge.attempts).toBe(5);
    expect(challenge.invalidatedAt).toEqual(expect.any(Date));
    expect(challenge.consumedAt).toBeNull();
    expect(harness.rows.sessions).toHaveLength(0);
    expect(harness.rows.refreshTokens).toHaveLength(0);
    expectSafeRejectedOtpAudit(harness.rows);
  });

  it.each(["missing", "expired", "attempts exhausted"] as const)(
    "commits one metadata-safe audit event when verification is %s",
    async (kind) => {
      const harness = createHarness();
      const user = activeUser();
      const challenge = deliveredChallenge(user.id);
      const challengeId =
        kind === "missing"
          ? "0c997665-8368-4790-b2cf-76fe90c6892c"
          : challenge.id;
      if (kind === "expired") challenge.expiresAt = new Date(Date.now() - 1);
      if (kind === "attempts exhausted") challenge.attempts = 5;
      if (kind !== "missing") {
        harness.rows.users.push(user);
        harness.rows.challenges.push(challenge);
        harness.rows.deliveryJobs.push(succeededDeliveryJob(challenge.id));
      }

      await expect(
        harness.otpService.verify({ challengeId, code: "000000" }, context),
      ).rejects.toMatchObject({ code: "OTP_INVALID" });

      expectSafeRejectedOtpAudit(harness.rows);
      expect(JSON.stringify(rejectedOtpAudits(harness.rows))).not.toContain(
        "+989121234567",
      );
      expect(JSON.stringify(rejectedOtpAudits(harness.rows))).not.toContain(
        "000000",
      );
    },
  );

  it.each([
    [
      "pending",
      { invalidatedAt: new Date(), isDecoy: false, status: "PENDING" },
    ],
    ["decoy", { invalidatedAt: null, isDecoy: true, status: "DISCARDED" }],
  ] as const)(
    "rejects %s challenges without issuing a session",
    async (_kind, state) => {
      const harness = createHarness();
      const user = activeUser();
      const challenge = deliveredChallenge(user.id);
      challenge.invalidatedAt = state.invalidatedAt;
      challenge.isDecoy = state.isDecoy;
      if (state.isDecoy) challenge.userId = null;
      const delivery = succeededDeliveryJob(challenge.id);
      delivery.status = state.status;
      harness.rows.users.push(user);
      harness.rows.challenges.push(challenge);
      harness.rows.deliveryJobs.push(delivery);

      await expect(
        harness.otpService.verify(
          { challengeId: challenge.id, code: "123456" },
          context,
        ),
      ).rejects.toMatchObject({ code: "OTP_INVALID" });

      expect(challenge.consumedAt).toBeNull();
      expect(harness.rows.sessions).toHaveLength(0);
      expect(harness.rows.refreshTokens).toHaveLength(0);
      expectSafeRejectedOtpAudit(harness.rows);
    },
  );

  it("revokes the session family when a rotated token is replayed", async () => {
    const harness = createHarness();
    const user = activeUser();
    harness.rows.users.push(user);
    const original = await harness.sessionFixture.createActiveSession({
      userId: user.id,
    });

    const rotated = await harness.sessionService.refresh(
      original.rawRefreshToken,
      context,
    );

    expect(rotated.sessionId).toBe(original.sessionId);
    expect(rotated.refreshToken).not.toBe(original.rawRefreshToken);
    await expect(
      harness.sessionService.refresh(original.rawRefreshToken, context),
    ).rejects.toMatchObject({ code: "SESSION_REVOKED" });
    await expect(
      harness.refreshTokenRepository.count({
        where: { sessionId: original.sessionId, revokedAt: IsNull() },
      }),
    ).resolves.toBe(0);
    expect(
      harness.rows.sessions.find(({ id }) => id === original.sessionId)
        ?.revokedAt,
    ).toEqual(expect.any(Date));
    expect(harness.rows.audits.map(({ action }) => action)).toContain(
      "auth.refresh_reuse_detected",
    );
    expect(JSON.stringify(harness.rows)).not.toContain(
      original.rawRefreshToken,
    );
  });

  it("revokes an expired session family instead of rotating its token", async () => {
    const harness = createHarness();
    const user = activeUser();
    harness.rows.users.push(user);
    const original = await harness.sessionFixture.createActiveSession({
      userId: user.id,
    });
    const session = harness.rows.sessions.find(
      ({ id }) => id === original.sessionId,
    );
    if (!session) throw new Error("Expected fixture session.");
    session.expiresAt = new Date(Date.now() - 1_000);

    await expect(
      harness.sessionService.refresh(original.rawRefreshToken, context),
    ).rejects.toMatchObject({ code: "SESSION_REVOKED" });
    expect(session.revokedAt).toEqual(expect.any(Date));
    await expect(
      harness.refreshTokenRepository.count({
        where: { sessionId: original.sessionId, revokedAt: IsNull() },
      }),
    ).resolves.toBe(0);
  });

  it("paginates active sessions with a stable id tie-breaker", async () => {
    const harness = createHarness();
    const user = activeUser();
    harness.rows.users.push(user);
    const sessions = await Promise.all(
      Array.from({ length: 3 }, () =>
        harness.sessionFixture.createActiveSession({ userId: user.id }),
      ),
    );
    for (const session of harness.rows.sessions) {
      session.createdAt = new Date("2026-08-28T01:00:00.000Z");
      session.lastUsedAt = new Date("2026-08-28T02:00:00.000Z");
    }
    const expectedIds = sessions
      .map(({ sessionId }) => sessionId)
      .sort()
      .reverse();

    const page = await harness.sessionService.listSessions(
      user.id,
      sessions[0]!.sessionId,
      { page: 2, pageSize: 1 },
    );

    expect(page.meta).toEqual({
      page: 2,
      pageSize: 1,
      total: 3,
      pageCount: 3,
    });
    expect(page.items.map(({ id }) => id)).toEqual([expectedIds[1]]);
    expect(harness.sessionListQueries).toHaveLength(1);
    expect(harness.sessionListQueries[0]).toMatchObject({
      order: { lastUsedAt: "DESC", createdAt: "DESC", id: "DESC" },
      skip: 1,
      take: 1,
    });
  });

  it("masks an IPv4-mapped address in the active session list", async () => {
    const harness = createHarness();
    const user = activeUser();
    harness.rows.users.push(user);
    const current = await harness.sessionFixture.createActiveSession({
      userId: user.id,
    });
    const session = harness.rows.sessions.find(
      ({ id }) => id === current.sessionId,
    );
    if (!session) throw new Error("Expected fixture session.");
    session.ipAddress = "::ffff:192.168.42.99";

    const sessions = await harness.sessionService.listSessions(
      user.id,
      current.sessionId,
      { page: 1, pageSize: 20 },
    );

    expect(sessions.items[0]).toMatchObject({
      current: true,
      id: current.sessionId,
      ipAddress: "192.168.42.0",
    });
    expect(JSON.stringify(sessions)).not.toContain("192.168.42.99");
  });
});
