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
  Put,
  Query,
  Req,
} from "@nestjs/common";
import { z } from "zod";

import {
  AccessPageQuerySchema,
  CreateRoleSchema,
  ReplacePermissionOverridesSchema,
  ReplaceUserRolesSchema,
  UpdateRoleSchema,
} from "../contracts/index.js";
import { AccessControlService } from "./access-control.service.js";
import { RequirePermission } from "./require-permission.decorator.js";

type RequestWithPrincipal = {
  user: AuthenticatedPrincipal;
  headers: Record<string, string | string[] | undefined>;
};

function statusFor(code: string): number {
  if (code.endsWith("_NOT_FOUND")) return 404;
  if (code === "ROLE_ALREADY_EXISTS") return 409;
  if (code === "SYSTEM_ROLE_PROTECTED" || code === "LAST_ACTIVE_SUPER_ADMIN")
    return 422;
  return 422;
}

async function execute<T>(
  request: RequestWithPrincipal,
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
        statusFor(error.code),
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

@Controller()
export class AccessControlController {
  constructor(private readonly access: AccessControlService) {}

  @Get("roles")
  @RequirePermission("roles:manage")
  listRoles(@Query() query: unknown, @Req() request: RequestWithPrincipal) {
    return execute(request, () =>
      this.access.listRoles(AccessPageQuerySchema.parse(query)),
    );
  }

  @Post("roles")
  @RequirePermission("roles:manage")
  createRole(@Body() body: unknown, @Req() request: RequestWithPrincipal) {
    return execute(request, () =>
      this.access.createRole(CreateRoleSchema.parse(body), request.user.userId),
    );
  }

  @Patch("roles/:id")
  @RequirePermission("roles:manage")
  updateRole(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: RequestWithPrincipal,
  ) {
    return execute(request, () =>
      this.access.updateRole(
        z.uuid().parse(id),
        UpdateRoleSchema.parse(body),
        request.user.userId,
      ),
    );
  }

  @Get("permissions")
  @RequirePermission("roles:manage")
  listPermissions(
    @Query() query: unknown,
    @Req() request: RequestWithPrincipal,
  ) {
    return execute(request, () =>
      this.access.listPermissions(AccessPageQuerySchema.parse(query)),
    );
  }

  @Put("users/:id/roles")
  @RequirePermission("roles:manage")
  replaceRoles(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: RequestWithPrincipal,
  ) {
    return execute(request, async () => {
      const values = ReplaceUserRolesSchema.parse(body);
      await this.access.replaceUserRoles(
        z.uuid().parse(id),
        values.roleIds,
        request.user.userId,
      );
    });
  }

  @Put("users/:id/permission-overrides")
  @RequirePermission("roles:manage")
  replaceOverrides(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: RequestWithPrincipal,
  ) {
    return execute(request, async () => {
      const values = ReplacePermissionOverridesSchema.parse(body);
      await this.access.replaceUserPermissionOverrides(
        z.uuid().parse(id),
        values,
        request.user.userId,
      );
    });
  }
}
