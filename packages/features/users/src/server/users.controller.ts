import type { AuthenticatedPrincipal } from "@effect-erp/contracts";
import { DomainError } from "@effect-erp/contracts";
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
  CreateUserSchema,
  UpdateUserSchema,
  UserPageQuerySchema,
} from "../contracts/index.js";
import { UserStatus } from "../entities/index.js";
import { UsersService } from "./users.service.js";

type PrincipalRequest = {
  user: AuthenticatedPrincipal;
  headers: Record<string, string | string[] | undefined>;
};
const RequirePermission = (key: string): MethodDecorator =>
  SetMetadata("effect:required-permission", key);
function errorStatus(code: string): number {
  if (code === "USER_NOT_FOUND") return 404;
  if (code === "PHONE_ALREADY_EXISTS") return 409;
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
  list(@Query() query: unknown, @Req() request: PrincipalRequest) {
    return execute(request, () =>
      this.users.list(UserPageQuerySchema.parse(query)),
    );
  }
  @Post()
  @RequirePermission("users:create")
  create(@Body() body: unknown, @Req() request: PrincipalRequest) {
    return execute(request, () =>
      this.users.create(CreateUserSchema.parse(body), request.user.userId),
    );
  }
  @Get(":id")
  @RequirePermission("users:read")
  get(@Param("id") id: string, @Req() request: PrincipalRequest) {
    return execute(request, () => this.users.get(z.uuid().parse(id)));
  }
  @Patch(":id")
  @RequirePermission("users:update")
  update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: PrincipalRequest,
  ) {
    return execute(request, () =>
      this.users.update(
        z.uuid().parse(id),
        UpdateUserSchema.parse(body),
        request.user.userId,
      ),
    );
  }
  @Post(":id/suspend")
  @RequirePermission("users:suspend")
  suspend(@Param("id") id: string, @Req() request: PrincipalRequest) {
    return execute(request, () =>
      this.users.setStatus(
        z.uuid().parse(id),
        UserStatus.SUSPENDED,
        request.user.userId,
      ),
    );
  }
  @Post(":id/activate")
  @RequirePermission("users:suspend")
  activate(@Param("id") id: string, @Req() request: PrincipalRequest) {
    return execute(request, () =>
      this.users.setStatus(
        z.uuid().parse(id),
        UserStatus.ACTIVE,
        request.user.userId,
      ),
    );
  }
}
