import type { AuthenticatedPrincipal } from "@effect-erp/contracts";
import { DomainError, UuidIdParamsSchema } from "@effect-erp/contracts";
import { ZodValidationPipe } from "@effect-erp/contracts/server";
import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  SetMetadata,
} from "@nestjs/common";
import { z } from "zod";

import {
  CreatePasswordUserSchema,
  UpdateUserSchema,
  UserPageQuerySchema,
  type CreatePasswordUserInput,
  type UpdateUserInput,
  type UserPageQuery,
} from "../contracts/index.js";
import { UserStatus } from "../entities/index.js";
import { UsersService } from "./users.service.js";

type PrincipalRequest = {
  user: AuthenticatedPrincipal;
  headers: Record<string, string | string[] | undefined>;
};
const RequirePermission = (key: string): MethodDecorator =>
  SetMetadata("effect:required-permission", [key]);
const RequirePermissions = (...keys: string[]): MethodDecorator =>
  SetMetadata("effect:required-permission", keys);
function errorStatus(code: string): number {
  if (code === "USER_NOT_FOUND") return 404;
  if (code === "PHONE_ALREADY_EXISTS") return 409;
  if (code === "USERNAME_ALREADY_EXISTS") return 409;
  return 422;
}
async function execute<T>(
  request: PrincipalRequest,
  work: () => Promise<T>,
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    const requestId = String(request.headers["x-request-id"] ?? "unknown");
    if (error instanceof DomainError)
      throw new HttpException(
        {
          error: {
            code: error.code,
            message: error.message,
            fields: error.fields,
            requestId,
          },
        },
        errorStatus(error.code),
      );
    if (error instanceof z.ZodError)
      throw new HttpException(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "داده ورودی نامعتبر است.",
            fields: {},
            requestId,
          },
        },
        422,
      );
    throw error;
  }
}

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get()
  @RequirePermission("users:read")
  list(
    @Query(new ZodValidationPipe(UserPageQuerySchema)) query: UserPageQuery,
    @Req() request: PrincipalRequest,
  ) {
    return execute(request, () => this.users.list(query));
  }
  @Post()
  @RequirePermissions("users:create", "users:credentials:manage")
  create(
    @Body(new ZodValidationPipe(CreatePasswordUserSchema)) body: CreatePasswordUserInput,
    @Req() request: PrincipalRequest,
  ) {
    return execute(request, () => this.users.create(body, request.user.userId));
  }
  @Get(":id")
  @RequirePermission("users:read")
  get(
    @Param(new ZodValidationPipe(UuidIdParamsSchema)) params: { id: string },
    @Req() request: PrincipalRequest,
  ) {
    return execute(request, () => this.users.get(params.id));
  }
  @Patch(":id")
  @RequirePermission("users:update")
  update(
    @Param(new ZodValidationPipe(UuidIdParamsSchema)) params: { id: string },
    @Body(new ZodValidationPipe(UpdateUserSchema)) body: UpdateUserInput,
    @Req() request: PrincipalRequest,
  ) {
    return execute(request, () =>
      this.users.update(params.id, body, request.user.userId),
    );
  }
  @Post(":id/suspend")
  @RequirePermission("users:suspend")
  suspend(
    @Param(new ZodValidationPipe(UuidIdParamsSchema)) params: { id: string },
    @Req() request: PrincipalRequest,
  ) {
    return execute(request, () =>
      this.users.setStatus(
        params.id,
        UserStatus.SUSPENDED,
        request.user.userId,
      ),
    );
  }
  @Post(":id/activate")
  @RequirePermission("users:suspend")
  activate(
    @Param(new ZodValidationPipe(UuidIdParamsSchema)) params: { id: string },
    @Req() request: PrincipalRequest,
  ) {
    return execute(request, () =>
      this.users.setStatus(params.id, UserStatus.ACTIVE, request.user.userId),
    );
  }
}
