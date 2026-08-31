import { DomainError, UuidIdParamsSchema } from "@effect-erp/contracts";
import { ZodValidationPipe } from "@effect-erp/contracts/server";
import { RequirePermission } from "@effect/access-control/server";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
  Param,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { z } from "zod";

import {
  AuthSessionListQuerySchema,
  AuthSessionPageSchema,
  RequestOtpSchema,
  VerifyOtpSchema,
  type AuthSessionListQuery,
  type RequestOtpInput,
  type VerifyOtpInput,
} from "../contracts/index.js";
import { AUTH_OPTIONS, type AuthOptions } from "./auth.options.js";
import { parseCookieHeader } from "./cookie-parser.js";
import { OtpService } from "./otp.service.js";
import { Public } from "./public.decorator.js";
import { type AuthResult, SessionService } from "./session.service.js";

type RequestWithContext = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
  user?: {
    userId: string;
    sessionId: string;
    phone: string;
    permissions: string[];
  };
};

type CookieResponse = {
  cookie: (
    name: string,
    value: string,
    options: Record<string, unknown>,
  ) => void;
  clearCookie: (name: string, options: Record<string, unknown>) => void;
};

function header(
  request: RequestWithContext,
  name: string,
  fallback: string,
): string {
  const value = request.headers[name];
  return Array.isArray(value) ? (value[0] ?? fallback) : (value ?? fallback);
}

function statusFor(error: DomainError): number {
  if (error.code === "RATE_LIMITED") return HttpStatus.TOO_MANY_REQUESTS;
  if (error.code === "OTP_REQUEST_UNAVAILABLE")
    return HttpStatus.SERVICE_UNAVAILABLE;
  if (error.code === "SMS_DELIVERY_FAILED") return HttpStatus.BAD_GATEWAY;
  if (error.code === "SESSION_NOT_FOUND") return HttpStatus.NOT_FOUND;
  if (error.code === "SESSION_INVALID" || error.code === "SESSION_REVOKED")
    return HttpStatus.UNAUTHORIZED;
  return HttpStatus.UNPROCESSABLE_ENTITY;
}

function requestContext(request: RequestWithContext) {
  return {
    requestId: header(request, "x-request-id", "unknown"),
    ipAddress: request.ip ?? request.socket?.remoteAddress ?? "unknown",
    userAgent: header(request, "user-agent", "unknown"),
  };
}

function requireCookie(request: RequestWithContext, name: string): string {
  const value = parseCookieHeader(header(request, "cookie", ""))[name];
  if (!value) throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
  return value;
}

function cookieOptions(
  options: AuthOptions,
  httpOnly: boolean,
  maxAge: number,
) {
  return {
    httpOnly,
    maxAge,
    path: "/",
    sameSite: "lax",
    secure: options.cookieSecure,
  };
}

function publicAuthBody(result: AuthResult) {
  return { user: result.user, sessionId: result.sessionId };
}

function setAuthCookies(
  response: CookieResponse,
  result: AuthResult,
  options: AuthOptions,
): void {
  response.cookie(
    "effect_access",
    result.accessToken,
    cookieOptions(options, true, options.accessTtlSeconds * 1_000),
  );
  response.cookie(
    "effect_refresh",
    result.refreshToken,
    cookieOptions(options, true, options.refreshTtlDays * 86_400_000),
  );
  response.cookie(
    "effect_csrf",
    result.csrfToken,
    cookieOptions(options, false, options.refreshTtlDays * 86_400_000),
  );
}

function clearAuthCookies(
  response: CookieResponse,
  options?: AuthOptions,
): void {
  const clearOptions = {
    path: "/",
    sameSite: "lax",
    secure: options?.cookieSecure ?? false,
  };
  response.clearCookie("effect_access", { ...clearOptions, httpOnly: true });
  response.clearCookie("effect_refresh", { ...clearOptions, httpOnly: true });
  response.clearCookie("effect_csrf", { ...clearOptions, httpOnly: false });
}

async function execute<T>(
  request: RequestWithContext,
  work: () => Promise<T>,
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    const requestId = header(request, "x-request-id", "unknown");
    if (error instanceof DomainError) {
      throw new HttpException(
        {
          error: {
            code: error.code,
            message: error.message,
            fields: error.fields,
            requestId,
          },
        },
        statusFor(error),
      );
    }
    if (error instanceof z.ZodError) {
      throw new HttpException(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "داده ورودی نامعتبر است.",
            fields: {},
            requestId,
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    throw error;
  }
}

@Controller()
export class AuthController {
  constructor(
    private readonly otpService: OtpService,
    @Optional() private readonly sessions?: SessionService,
    @Optional() @Inject(AUTH_OPTIONS) private readonly options?: AuthOptions,
  ) {}

  @Public()
  @Post("auth/otp/request")
  @HttpCode(HttpStatus.ACCEPTED)
  async requestOtp(
    @Body(new ZodValidationPipe(RequestOtpSchema)) body: RequestOtpInput,
    @Req() request: RequestWithContext,
  ) {
    return execute(request, () =>
      this.otpService.request(body, requestContext(request)),
    );
  }

  @Public()
  @Post("auth/otp/verify")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body(new ZodValidationPipe(VerifyOtpSchema)) body: VerifyOtpInput,
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    return execute(request, async () => {
      if (!this.options)
        throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
      const result = await this.otpService.verify(
        body,
        requestContext(request),
      );
      setAuthCookies(response, result, this.options);
      return publicAuthBody(result);
    });
  }

  @Public()
  @Post("auth/refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    return execute(request, async () => {
      if (!this.sessions || !this.options)
        throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
      const result = await this.sessions.refresh(
        requireCookie(request, "effect_refresh"),
        requestContext(request),
      );
      setAuthCookies(response, result, this.options);
      return publicAuthBody(result);
    });
  }

  @Post("auth/logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    return execute(request, async () => {
      if (!this.sessions || !request.user)
        throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
      await this.sessions.logout(
        request.user.sessionId,
        request.user.userId,
        requestContext(request),
      );
      clearAuthCookies(response, this.options);
      return { ok: true };
    });
  }

  @Post("auth/logout-all")
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    return execute(request, async () => {
      if (!this.sessions || !request.user)
        throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
      await this.sessions.logoutAll(
        request.user.userId,
        requestContext(request),
      );
      clearAuthCookies(response, this.options);
      return { ok: true };
    });
  }

  @Get("auth/sessions")
  listSessions(
    @Query(new ZodValidationPipe(AuthSessionListQuerySchema))
    query: AuthSessionListQuery,
    @Req() request: RequestWithContext,
  ) {
    return execute(request, async () => {
      if (!this.sessions || !request.user)
        throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
      const page = await this.sessions.listSessions(
        request.user.userId,
        request.user.sessionId,
        AuthSessionListQuerySchema.parse(query),
      );
      return AuthSessionPageSchema.parse(page);
    });
  }

  @Delete("auth/sessions/:id")
  @RequirePermission("sessions:revoke")
  async revokeSession(
    @Param(new ZodValidationPipe(UuidIdParamsSchema)) params: { id: string },
    @Req() request: RequestWithContext,
  ) {
    return execute(request, async () => {
      if (!this.sessions || !request.user)
        throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
      await this.sessions.revokeSession(
        params.id,
        request.user.userId,
        requestContext(request),
      );
      return { ok: true };
    });
  }

  @Get("me")
  me(@Req() request: RequestWithContext) {
    return execute(request, async () => {
      if (!this.sessions || !request.user)
        throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
      return this.sessions.me(request.user.userId, request.user.permissions);
    });
  }
}
