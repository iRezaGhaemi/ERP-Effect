import type { AuthenticatedPrincipal } from "@effect-erp/contracts";
import { DomainError, UuidIdParamsSchema } from "@effect-erp/contracts";
import { ZodValidationPipe } from "@effect-erp/contracts/server";
import { RequirePermission } from "@effect/access-control/server";
import { ChangePasswordSchema, type ChangePasswordInput } from "@effect/users/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";

import {
  AuthSessionListQuerySchema,
  AuthSessionPageSchema,
  LoginSchema,
  type AuthSessionListQuery,
  type LoginInput,
} from "../contracts/index.js";
import { AllowPasswordChange } from "./allow-password-change.decorator.js";
import {
  clearAuthCookies,
  type CookieResponse,
  publicAuthBody,
  setAuthCookies,
} from "./auth-cookies.js";
import { AUTH_OPTIONS, type AuthOptions } from "./auth.options.js";
import { parseCookieHeader } from "./cookie-parser.js";
import { PasswordAuthService } from "./password-auth.service.js";
import { Public } from "./public.decorator.js";
import { SessionService } from "./session.service.js";

export type RequestWithContext = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
  user?: AuthenticatedPrincipal;
};

function header(request: RequestWithContext, name: string, fallback: string): string {
  const value = request.headers[name];
  return Array.isArray(value) ? (value[0] ?? fallback) : (value ?? fallback);
}

export function requestContext(request: RequestWithContext) {
  const base = {
    requestId: header(request, "x-request-id", "unknown"),
    ipAddress: request.ip ?? request.socket?.remoteAddress ?? "unknown",
    userAgent: header(request, "user-agent", "unknown"),
  };
  return request.user
    ? {
        ...base,
        auth: {
          sessionId: request.user.sessionId,
          credentialVersion: request.user.credentialVersion,
          mustChangePassword: request.user.mustChangePassword,
        },
      }
    : base;
}

function requireCookie(request: RequestWithContext, name: string): string {
  const value = parseCookieHeader(header(request, "cookie", ""))[name];
  if (!value) throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
  return value;
}

@Controller()
export class AuthController {
  constructor(
    private readonly passwordAuth: PasswordAuthService,
    private readonly sessions: SessionService,
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
  ) {}

  @Public()
  @Post("auth/login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) body: LoginInput,
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const result = await this.passwordAuth.login(body, requestContext(request));
    setAuthCookies(response, result, this.options);
    return publicAuthBody(result);
  }

  @AllowPasswordChange()
  @Post("auth/password/change")
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body(new ZodValidationPipe(ChangePasswordSchema)) body: ChangePasswordInput,
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    if (!request.user) throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
    const result = await this.passwordAuth.changePassword(
      request.user.userId,
      body,
      requestContext(request),
    );
    setAuthCookies(response, result, this.options);
    return publicAuthBody(result);
  }

  @Public()
  @Post("auth/refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const result = await this.sessions.refresh(
      requireCookie(request, "effect_refresh"),
      requestContext(request),
    );
    setAuthCookies(response, result, this.options);
    return publicAuthBody(result);
  }

  @AllowPasswordChange()
  @Post("auth/logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    if (!request.user) throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
    await this.sessions.logout(
      request.user.sessionId,
      request.user.userId,
      requestContext(request),
    );
    clearAuthCookies(response, this.options);
    return { ok: true };
  }

  @Post("auth/logout-all")
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    if (!request.user) throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
    await this.sessions.logoutAll(request.user.userId, requestContext(request));
    clearAuthCookies(response, this.options);
    return { ok: true };
  }

  @Get("auth/sessions")
  async listSessions(
    @Query(new ZodValidationPipe(AuthSessionListQuerySchema)) query: AuthSessionListQuery,
    @Req() request: RequestWithContext,
  ) {
    if (!request.user) throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
    return AuthSessionPageSchema.parse(
      await this.sessions.listSessions(
        request.user.userId,
        request.user.sessionId,
        AuthSessionListQuerySchema.parse(query),
      ),
    );
  }

  @Delete("auth/sessions/:id")
  @RequirePermission("sessions:revoke")
  async revokeSession(
    @Param(new ZodValidationPipe(UuidIdParamsSchema)) params: { id: string },
    @Req() request: RequestWithContext,
  ) {
    if (!request.user) throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
    await this.sessions.revokeSession(
      params.id,
      request.user.userId,
      requestContext(request),
    );
    return { ok: true };
  }

  @AllowPasswordChange()
  @Get("me")
  async me(@Req() request: RequestWithContext) {
    if (!request.user) throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
    return this.sessions.me(request.user.userId, request.user.permissions);
  }
}
