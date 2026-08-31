import { randomUUID } from "node:crypto";

import { Injectable, type NestMiddleware } from "@nestjs/common";

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined>;
  requestId?: string;
};

type ResponseWithHeaders = {
  setHeader(name: string, value: string): unknown;
};

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;

function firstHeader(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function requestIdFor(request: RequestWithHeaders): string {
  const candidate = firstHeader(request.headers["x-request-id"]).trim();
  return requestIdPattern.test(candidate) ? candidate : randomUUID();
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    request: RequestWithHeaders,
    response: ResponseWithHeaders,
    next: (error?: unknown) => void,
  ): void {
    const requestId = requestIdFor(request);
    request.requestId = requestId;
    request.headers["x-request-id"] = requestId;
    response.setHeader("x-request-id", requestId);
    next();
  }
}
