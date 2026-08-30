import { randomUUID } from "node:crypto";
import { isIP } from "node:net";

import { AuditWriter } from "@effect/audit/server";
import {
  DomainError,
  type Page,
  type RequestContext,
} from "@effect-erp/contracts";
import { UserEntity, UserStatus } from "@effect/users/entities";
import { Inject, Injectable } from "@nestjs/common";
import { DataSource, type EntityManager, IsNull, MoreThan } from "typeorm";

import type { AuthSessionListQuery } from "../contracts/index.js";
import {
  RefreshTokenEntity,
  SessionEntity,
  type SessionRevocationReason,
} from "../entities/index.js";
import { AUTH_OPTIONS, type AuthOptions } from "./auth.options.js";
import { TokenService } from "./token.service.js";

export type UserSummary = {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthResult = {
  user: UserSummary;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
};

export type SessionListItem = {
  id: string;
  device: string;
  ipAddress: string;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
};

export type MeResult = {
  user: UserSummary;
  permissions: string[];
};

type RefreshOutcome =
  { status: "ok"; result: AuthResult } | { status: "revoked" };

function otpInvalid(): DomainError {
  return new DomainError("OTP_INVALID", "کد تأیید نامعتبر است.");
}

function sessionInvalid(): DomainError {
  return new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
}

function sessionRevoked(): DomainError {
  return new DomainError("SESSION_REVOKED", "نشست باطل شده است.");
}

function sessionNotFound(): DomainError {
  return new DomainError("SESSION_NOT_FOUND", "نشست پیدا نشد.");
}

function toUserSummary(user: UserEntity): UserSummary {
  return {
    id: user.id,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function safeUserAgent(userAgent: string): string {
  const trimmed = userAgent.trim();
  return (trimmed.length ? trimmed : "unknown").slice(0, 512);
}

function deviceName(userAgent: string): string {
  const trimmed = userAgent.trim();
  return (trimmed.length ? trimmed : "Unknown device").slice(0, 120);
}

function maskIpAddress(ipAddress: string): string {
  const mappedIpv4 = /^::ffff:(.+)$/i.exec(ipAddress)?.[1];
  const ipv4 = mappedIpv4 && isIP(mappedIpv4) === 4 ? mappedIpv4 : ipAddress;
  if (isIP(ipv4) === 4) {
    return `${ipv4.split(".").slice(0, 3).join(".")}.0`;
  }
  if (isIP(ipAddress) === 6) {
    const [head] = ipAddress.split("::", 1);
    const visibleGroups = (head ?? "").split(":").filter(Boolean).slice(0, 4);
    return `${visibleGroups.join(":")}::`;
  }
  return "unknown";
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

@Injectable()
export class SessionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditWriter: AuditWriter,
    private readonly tokens: TokenService,
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
  ) {}

  async createForLogin(
    user: UserEntity,
    context: RequestContext,
    manager?: EntityManager,
  ): Promise<AuthResult> {
    const work = async (transactionManager: EntityManager) => {
      const result = await this.createActiveSession(
        user,
        context,
        transactionManager,
      );
      await this.auditWriter.write(
        {
          actorId: user.id,
          action: "auth.login_succeeded",
          entityType: "sessions",
          entityId: result.sessionId,
          metadata: {},
          ipAddress: context.ipAddress,
          requestId: context.requestId,
        },
        transactionManager,
      );
      return result;
    };
    return manager ? work(manager) : this.dataSource.transaction(work);
  }

  async refresh(
    rawRefreshToken: string,
    context: RequestContext,
  ): Promise<AuthResult> {
    const tokenHash = this.tokens.hashOpaqueToken(rawRefreshToken);
    const outcome = await this.dataSource.transaction<RefreshOutcome>(
      async (manager) => {
        const refreshTokens = manager.getRepository(RefreshTokenEntity);
        const sessions = manager.getRepository(SessionEntity);
        const users = manager.getRepository(UserEntity);
        const now = new Date();
        const tokenCandidate = await refreshTokens.findOne({
          where: { tokenHash },
        });
        if (!tokenCandidate) throw sessionInvalid();
        const session = await sessions.findOne({
          where: { id: tokenCandidate.sessionId },
          lock: { mode: "pessimistic_write" },
        });
        const token = await refreshTokens.findOne({
          where: { id: tokenCandidate.id, tokenHash },
          lock: { mode: "pessimistic_write" },
        });
        if (!token) throw sessionInvalid();

        if (token.consumedAt) {
          await this.revokeFamily(
            manager,
            token.sessionId,
            now,
            "REFRESH_REUSE",
          );
          await this.auditWriter.write(
            {
              actorId: session?.userId ?? null,
              action: "auth.refresh_reuse_detected",
              entityType: "sessions",
              entityId: token.sessionId,
              metadata: {},
              ipAddress: context.ipAddress,
              requestId: context.requestId,
            },
            manager,
          );
          return { status: "revoked" };
        }

        if (
          !session ||
          session.revokedAt ||
          token.revokedAt ||
          token.expiresAt <= now
        ) {
          throw sessionRevoked();
        }

        if (session.expiresAt <= now) {
          await this.revokeFamily(
            manager,
            token.sessionId,
            now,
            "SESSION_EXPIRED",
          );
          return { status: "revoked" };
        }

        const user = await users.findOne({
          where: { id: session.userId },
          lock: { mode: "pessimistic_read" },
        });
        if (!user || user.status !== UserStatus.ACTIVE) {
          await this.revokeFamily(
            manager,
            token.sessionId,
            now,
            "USER_SUSPENDED",
          );
          return { status: "revoked" };
        }

        const rawReplacement = this.tokens.generateRefreshToken();
        const csrfToken = this.tokens.generateCsrfToken();
        const replacement = refreshTokens.create({
          id: randomUUID(),
          sessionId: session.id,
          tokenHash: this.tokens.hashOpaqueToken(rawReplacement),
          expiresAt: session.expiresAt,
          consumedAt: null,
          revokedAt: null,
          replacedByTokenId: null,
          createdAt: now,
        });
        await refreshTokens.save(replacement);

        token.consumedAt = now;
        token.replacedByTokenId = replacement.id;
        await refreshTokens.save(token);

        session.lastUsedAt = now;
        session.userAgent = safeUserAgent(context.userAgent);
        session.ipAddress = context.ipAddress;
        session.csrfHash = this.tokens.hashOpaqueToken(csrfToken);
        await sessions.save(session);

        await this.auditWriter.write(
          {
            actorId: user.id,
            action: "auth.refresh_succeeded",
            entityType: "sessions",
            entityId: session.id,
            metadata: {},
            ipAddress: context.ipAddress,
            requestId: context.requestId,
          },
          manager,
        );

        return {
          status: "ok",
          result: {
            user: toUserSummary(user),
            sessionId: session.id,
            accessToken: this.tokens.signAccessToken({
              userId: user.id,
              sessionId: session.id,
              phone: user.phone,
            }),
            refreshToken: rawReplacement,
            csrfToken,
          },
        };
      },
    );
    if (outcome.status === "revoked") throw sessionRevoked();
    return outcome.result;
  }

  async logout(
    sessionId: string,
    actorId: string,
    context: RequestContext,
  ): Promise<void> {
    await this.revokeOne(sessionId, actorId, context, "LOGOUT", "auth.logout");
  }

  async logoutAll(userId: string, context: RequestContext): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const sessions = await manager.getRepository(SessionEntity).find({
        where: { userId, revokedAt: IsNull() },
        lock: { mode: "pessimistic_write" },
      });
      const now = new Date();
      for (const session of sessions) {
        session.revokedAt = now;
        session.revokedReason = "LOGOUT_ALL";
        await manager.getRepository(SessionEntity).save(session);
        await manager
          .getRepository(RefreshTokenEntity)
          .update(
            { sessionId: session.id, revokedAt: IsNull() },
            { revokedAt: now },
          );
      }
      await this.auditWriter.write(
        {
          actorId: userId,
          action: "auth.logout_all",
          entityType: "users",
          entityId: userId,
          metadata: { sessionCount: sessions.length },
          ipAddress: context.ipAddress,
          requestId: context.requestId,
        },
        manager,
      );
    });
  }

  async revokeSession(
    sessionId: string,
    actorId: string,
    context: RequestContext,
  ): Promise<void> {
    await this.revokeOne(
      sessionId,
      actorId,
      context,
      "ADMIN_REVOKED",
      "auth.session_revoked",
    );
  }

  async listSessions(
    userId: string,
    currentSessionId: string,
    query: AuthSessionListQuery,
  ): Promise<Page<SessionListItem>> {
    const [sessions, total] = await this.dataSource.manager
      .getRepository(SessionEntity)
      .findAndCount({
        where: {
          userId,
          revokedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        },
        order: { lastUsedAt: "DESC", createdAt: "DESC", id: "DESC" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
    return {
      items: sessions.map((session) => ({
        id: session.id,
        device: deviceName(session.userAgent),
        ipAddress: maskIpAddress(session.ipAddress),
        createdAt: session.createdAt.toISOString(),
        lastUsedAt: session.lastUsedAt.toISOString(),
        current: session.id === currentSessionId,
      })),
      meta: {
        ...query,
        total,
        pageCount: Math.ceil(total / query.pageSize),
      },
    };
  }

  async me(userId: string, permissions: string[]): Promise<MeResult> {
    const user = await this.dataSource.manager
      .getRepository(UserEntity)
      .findOneBy({ id: userId, status: UserStatus.ACTIVE });
    if (!user) throw otpInvalid();
    return { user: toUserSummary(user), permissions };
  }

  private async createActiveSession(
    user: UserEntity,
    context: RequestContext,
    manager: EntityManager,
  ): Promise<AuthResult> {
    const now = new Date();
    const rawRefreshToken = this.tokens.generateRefreshToken();
    const csrfToken = this.tokens.generateCsrfToken();
    const session = manager.getRepository(SessionEntity).create({
      id: randomUUID(),
      userId: user.id,
      userAgent: safeUserAgent(context.userAgent),
      ipAddress: context.ipAddress,
      csrfHash: this.tokens.hashOpaqueToken(csrfToken),
      lastUsedAt: now,
      expiresAt: addDays(now, this.options.refreshTtlDays),
      revokedAt: null,
      revokedReason: null,
      createdAt: now,
    });
    await manager.getRepository(SessionEntity).save(session);
    await manager.getRepository(RefreshTokenEntity).save(
      manager.getRepository(RefreshTokenEntity).create({
        id: randomUUID(),
        sessionId: session.id,
        tokenHash: this.tokens.hashOpaqueToken(rawRefreshToken),
        expiresAt: addDays(now, this.options.refreshTtlDays),
        consumedAt: null,
        revokedAt: null,
        replacedByTokenId: null,
        createdAt: now,
      }),
    );
    return {
      user: toUserSummary(user),
      sessionId: session.id,
      accessToken: this.tokens.signAccessToken({
        userId: user.id,
        sessionId: session.id,
        phone: user.phone,
      }),
      refreshToken: rawRefreshToken,
      csrfToken,
    };
  }

  private async revokeOne(
    sessionId: string,
    actorId: string,
    context: RequestContext,
    reason: SessionRevocationReason,
    action: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const session = await manager.getRepository(SessionEntity).findOne({
        where: { id: sessionId },
        lock: { mode: "pessimistic_write" },
      });
      if (!session) throw sessionNotFound();
      const now = new Date();
      if (!session.revokedAt) {
        session.revokedAt = now;
        session.revokedReason = reason;
        await manager.getRepository(SessionEntity).save(session);
        await manager
          .getRepository(RefreshTokenEntity)
          .update({ sessionId, revokedAt: IsNull() }, { revokedAt: now });
      }
      await this.auditWriter.write(
        {
          actorId,
          action,
          entityType: "sessions",
          entityId: sessionId,
          metadata: {},
          ipAddress: context.ipAddress,
          requestId: context.requestId,
        },
        manager,
      );
    });
  }

  private async revokeFamily(
    manager: EntityManager,
    sessionId: string,
    now: Date,
    reason: SessionRevocationReason,
  ): Promise<void> {
    const session = await manager.getRepository(SessionEntity).findOne({
      where: { id: sessionId },
      lock: { mode: "pessimistic_write" },
    });
    if (session && !session.revokedAt) {
      session.revokedAt = now;
      session.revokedReason = reason;
      await manager.getRepository(SessionEntity).save(session);
    }
    await manager
      .getRepository(RefreshTokenEntity)
      .update({ sessionId, revokedAt: IsNull() }, { revokedAt: now });
  }
}
