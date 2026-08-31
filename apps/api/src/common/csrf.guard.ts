import { timingSafeEqual } from "node:crypto";

import type { AuthenticatedPrincipal } from "@effect-erp/contracts";
import { DomainError } from "@effect-erp/contracts";
import { CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";

type CsrfRequest = {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  originalUrl?: string;
  path?: string;
  url?: string;
  user?: AuthenticatedPrincipal;
};

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const csrfExemptPaths = new Set([
  "/api/v1/health/live",
  "/api/v1/health/ready",
  "/api/v1/auth/otp/request",
  "/api/v1/auth/otp/verify",
  "/api/v1/auth/refresh",
]);

function header(request: CsrfRequest, name: string): string {
  const value = request.headers?.[name];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function cookieValue(cookieHeader: string, name: string): string {
  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key !== name) continue;
    try {
      return decodeURIComponent(valueParts.join("="));
    } catch {
      return "";
    }
  }
  return "";
}

function requestPath(request: CsrfRequest): string {
  return (
    (request.path ?? request.originalUrl ?? request.url ?? "").split("?")[0] ??
    ""
  );
}

function tokensMatch(leftToken: string, rightToken: string): boolean {
  const left = Buffer.from(leftToken);
  const right = Buffer.from(rightToken);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<CsrfRequest>();
    if (!mutatingMethods.has((request.method ?? "").toUpperCase())) return true;
    if (!request.user || csrfExemptPaths.has(requestPath(request))) return true;

    const csrfHeader = header(request, "x-csrf-token");
    const csrfCookie = cookieValue(header(request, "cookie"), "effect_csrf");
    if (!tokensMatch(csrfHeader, csrfCookie))
      throw new DomainError("CSRF_INVALID", "توکن CSRF نامعتبر است.");
    return true;
  }
}
