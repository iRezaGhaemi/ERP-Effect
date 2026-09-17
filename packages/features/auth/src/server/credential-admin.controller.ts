import { DomainError, UuidIdParamsSchema } from "@effect-erp/contracts";
import { ZodValidationPipe } from "@effect-erp/contracts/server";
import { RequirePermission } from "@effect/access-control/server";
import {
  ResetPasswordSchema,
  SetupCredentialsSchema,
  type ResetPasswordInput,
  type SetupCredentialsInput,
} from "@effect/users/contracts";
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from "@nestjs/common";

import {
  requestContext,
  type RequestWithContext,
} from "./auth.controller.js";
import { PasswordAuthService } from "./password-auth.service.js";

@Controller("users")
export class CredentialAdminController {
  constructor(private readonly passwordAuth: PasswordAuthService) {}

  @Post(":id/credentials")
  @RequirePermission("users:credentials:manage")
  @HttpCode(HttpStatus.NO_CONTENT)
  async setup(
    @Param(new ZodValidationPipe(UuidIdParamsSchema)) params: { id: string },
    @Body(new ZodValidationPipe(SetupCredentialsSchema)) body: SetupCredentialsInput,
    @Req() request: RequestWithContext,
  ): Promise<void> {
    if (!request.user) throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
    await this.passwordAuth.setupCredentials(
      request.user.userId,
      params.id,
      body,
      requestContext(request),
    );
  }

  @Post(":id/password/reset")
  @RequirePermission("users:credentials:manage")
  @HttpCode(HttpStatus.NO_CONTENT)
  async reset(
    @Param(new ZodValidationPipe(UuidIdParamsSchema)) params: { id: string },
    @Body(new ZodValidationPipe(ResetPasswordSchema)) body: ResetPasswordInput,
    @Req() request: RequestWithContext,
  ): Promise<void> {
    if (!request.user) throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
    await this.passwordAuth.resetPassword(
      request.user.userId,
      params.id,
      body,
      requestContext(request),
    );
  }
}
