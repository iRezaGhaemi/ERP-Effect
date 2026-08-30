import { randomUUID } from "node:crypto";

import type { DataSource } from "typeorm";

import { RefreshTokenEntity, SessionEntity } from "../entities/index.js";
import type { AuthOptions } from "../server/auth.options.js";
import { TokenService } from "../server/token.service.js";

export class SessionFixture {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tokens: TokenService,
    private readonly options: AuthOptions,
  ) {}

  async createActiveSession(input: {
    userId: string;
  }): Promise<{ sessionId: string; rawRefreshToken: string }> {
    const now = new Date();
    const rawRefreshToken = this.tokens.generateRefreshToken();
    const csrfToken = this.tokens.generateCsrfToken();
    const session = this.dataSource.manager
      .getRepository(SessionEntity)
      .create({
        id: randomUUID(),
        userId: input.userId,
        userAgent: "SessionFixture",
        ipAddress: "127.0.0.1",
        csrfHash: this.tokens.hashOpaqueToken(csrfToken),
        lastUsedAt: now,
        expiresAt: new Date(
          now.getTime() + this.options.refreshTtlDays * 86_400_000,
        ),
        revokedAt: null,
        revokedReason: null,
        createdAt: now,
      });
    await this.dataSource.manager.getRepository(SessionEntity).save(session);
    await this.dataSource.manager.getRepository(RefreshTokenEntity).save(
      this.dataSource.manager.getRepository(RefreshTokenEntity).create({
        id: randomUUID(),
        sessionId: session.id,
        tokenHash: this.tokens.hashOpaqueToken(rawRefreshToken),
        expiresAt: new Date(
          now.getTime() + this.options.refreshTtlDays * 86_400_000,
        ),
        consumedAt: null,
        revokedAt: null,
        replacedByTokenId: null,
        createdAt: now,
      }),
    );
    return { sessionId: session.id, rawRefreshToken };
  }
}
