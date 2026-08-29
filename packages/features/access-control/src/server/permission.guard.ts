import type { AuthenticatedPrincipal } from "@effect-erp/contracts";
import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { PermissionKey } from "../contracts/index.js";
import { AccessControlService } from "./access-control.service.js";
import { PERMISSION_METADATA_KEY } from "./require-permission.decorator.js";

type PrincipalRequest = {
  user?: AuthenticatedPrincipal;
  headers?: Record<string, string | string[] | undefined>;
};

function permissionDenied(request: PrincipalRequest): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: "PERMISSION_DENIED",
      message: "دسترسی لازم برای این عملیات وجود ندارد.",
      fields: {},
      requestId: String(request.headers?.["x-request-id"] ?? "unknown"),
    },
  });
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<PermissionKey>(
      PERMISSION_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!key) return true;
    const request = context.switchToHttp().getRequest<PrincipalRequest>();
    const principal = request.user;
    if (!principal) throw permissionDenied(request);
    if (!(await this.access.hasPermission(principal.userId, key)))
      throw permissionDenied(request);
    return true;
  }
}
