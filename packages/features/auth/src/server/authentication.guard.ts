import type { AuthenticatedPrincipal } from "@effect-erp/contracts";
import { AccessControlService } from "@effect/access-control/server";
import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserEntity, UserStatus } from "@effect/users/entities";
import { DataSource } from "typeorm";

import { SessionEntity } from "../entities/index.js";
import { parseCookieHeader } from "./cookie-parser.js";
import { PUBLIC_ROUTE_METADATA_KEY } from "./public.decorator.js";
import { TokenService } from "./token.service.js";

type AuthenticatedRequest = {
  headers?: Record<string, string | string[] | undefined>;
  user?: AuthenticatedPrincipal;
};

function header(request: AuthenticatedRequest, name: string): string {
  const value = request.headers?.[name];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function unauthorized(
  request: AuthenticatedRequest,
  code = "AUTHENTICATION_REQUIRED",
): UnauthorizedException {
  return new UnauthorizedException({
    error: {
      code,
      message: "احراز هویت لازم است.",
      fields: {},
      requestId: header(request, "x-request-id") || "unknown",
    },
  });
}

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
    private readonly tokens: TokenService,
    private readonly access: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rawToken = parseCookieHeader(header(request, "cookie")).effect_access;
    const payload = rawToken ? this.tokens.verifyAccessToken(rawToken) : null;
    if (!payload) throw unauthorized(request);

    const sessionRepository =
      this.dataSource.manager.getRepository(SessionEntity);
    const userRepository = this.dataSource.manager.getRepository(UserEntity);
    const session = await sessionRepository.findOneBy({
      id: payload.sid,
      userId: payload.sub,
    });
    const user = await userRepository.findOneBy({
      id: payload.sub,
      status: UserStatus.ACTIVE,
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !user ||
      user.phone !== payload.phone
    ) {
      throw unauthorized(request, "SESSION_REVOKED");
    }

    request.user = {
      userId: user.id,
      sessionId: session.id,
      phone: user.phone,
      permissions: await this.access.listEffectivePermissions(user.id),
    };
    return true;
  }
}
