import { DomainError } from "@effect-erp/contracts";
import {
  CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";

type OriginRequest = {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
};

export const WEB_ORIGIN = "effect:WEB_ORIGIN";

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function header(request: OriginRequest, name: string): string {
  const value = request.headers?.[name];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

@Injectable()
export class OriginGuard implements CanActivate {
  private readonly expectedOrigin: string;

  constructor(@Inject(WEB_ORIGIN) webOrigin: string) {
    this.expectedOrigin = new URL(webOrigin).origin;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<OriginRequest>();
    if (!mutatingMethods.has((request.method ?? "").toUpperCase())) return true;
    if (header(request, "origin") !== this.expectedOrigin)
      throw new DomainError("ORIGIN_INVALID", "مبدأ درخواست مجاز نیست.");
    return true;
  }
}
