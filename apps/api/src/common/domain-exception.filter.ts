import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { DomainError, type FieldErrors } from "@effect-erp/contracts";
import { z } from "zod";

type HttpRequest = {
  headers?: Record<string, string | string[] | undefined>;
  requestId?: string;
};

type HttpResponse = {
  setHeader(name: string, value: string): unknown;
  status(status: number): { json(body: unknown): unknown };
};

type ErrorDetails = {
  code: string;
  message: string;
  fields: FieldErrors;
  requestId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requestId(request: HttpRequest): string {
  if (request.requestId) return request.requestId;
  const header = request.headers?.["x-request-id"];
  const value = Array.isArray(header) ? header[0] : header;
  return value || "unknown";
}

function fields(value: unknown): FieldErrors {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, messages]) =>
      Array.isArray(messages) &&
      messages.every((message) => typeof message === "string")
        ? [[key, messages]]
        : [],
    ),
  );
}

function zodFields(error: z.ZodError): FieldErrors {
  return error.issues.reduce<FieldErrors>((result, issue) => {
    const field = issue.path.join(".") || "_form";
    result[field] = [...(result[field] ?? []), issue.message];
    return result;
  }, {});
}

function domainStatus(code: string): number {
  if (
    code === "AUTHENTICATION_REQUIRED" ||
    code === "SESSION_INVALID" ||
    code === "SESSION_REVOKED"
  )
    return HttpStatus.UNAUTHORIZED;
  if (
    code === "PERMISSION_DENIED" ||
    code === "ORIGIN_INVALID" ||
    code === "CSRF_INVALID"
  )
    return HttpStatus.FORBIDDEN;
  if (
    code === "USER_NOT_FOUND" ||
    code === "ROLE_NOT_FOUND" ||
    code === "PERMISSION_NOT_FOUND" ||
    code === "SESSION_NOT_FOUND"
  )
    return HttpStatus.NOT_FOUND;
  if (code === "PHONE_ALREADY_EXISTS" || code === "ROLE_ALREADY_EXISTS")
    return HttpStatus.CONFLICT;
  if (code === "RATE_LIMITED") return HttpStatus.TOO_MANY_REQUESTS;
  if (code === "SMS_DELIVERY_FAILED") return HttpStatus.BAD_GATEWAY;
  if (code === "OTP_REQUEST_UNAVAILABLE") return HttpStatus.SERVICE_UNAVAILABLE;
  return HttpStatus.UNPROCESSABLE_ENTITY;
}

function codeForStatus(status: HttpStatus): string {
  if (status === HttpStatus.BAD_REQUEST) return "BAD_REQUEST";
  if (status === HttpStatus.UNAUTHORIZED) return "AUTHENTICATION_REQUIRED";
  if (status === HttpStatus.FORBIDDEN) return "FORBIDDEN";
  if (status === HttpStatus.NOT_FOUND) return "NOT_FOUND";
  if (status === HttpStatus.CONFLICT) return "CONFLICT";
  if (status === HttpStatus.UNPROCESSABLE_ENTITY) return "VALIDATION_FAILED";
  if (status === HttpStatus.TOO_MANY_REQUESTS) return "RATE_LIMITED";
  if (status === HttpStatus.SERVICE_UNAVAILABLE) return "SERVICE_UNAVAILABLE";
  return "INTERNAL_SERVER_ERROR";
}

function messageForStatus(status: HttpStatus): string {
  if (status === HttpStatus.UNAUTHORIZED) return "احراز هویت لازم است.";
  if (status === HttpStatus.FORBIDDEN)
    return "دسترسی به این درخواست مجاز نیست.";
  if (status === HttpStatus.NOT_FOUND) return "منبع درخواستی پیدا نشد.";
  if (status === HttpStatus.UNPROCESSABLE_ENTITY)
    return "داده ورودی نامعتبر است.";
  if (status === HttpStatus.TOO_MANY_REQUESTS)
    return "تعداد درخواست‌ها بیش از حد مجاز است.";
  if (status === HttpStatus.SERVICE_UNAVAILABLE)
    return "سرویس موقتاً در دسترس نیست.";
  return "خطای غیرمنتظره‌ای رخ داد.";
}

function existingEnvelope(
  response: unknown,
  currentRequestId: string,
): ErrorDetails | null {
  if (!isRecord(response) || !isRecord(response.error)) return null;
  const error = response.error;
  if (typeof error.code !== "string" || typeof error.message !== "string")
    return null;
  return {
    code: error.code,
    message: error.message,
    fields: fields(error.fields),
    requestId: currentRequestId,
  };
}

function healthFailure(response: unknown): boolean {
  return (
    isRecord(response) &&
    response.status === "error" &&
    isRecord(response.checks)
  );
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<HttpResponse>();
    const currentRequestId = requestId(request);
    response.setHeader("x-request-id", currentRequestId);

    if (exception instanceof DomainError) {
      response.status(domainStatus(exception.code)).json({
        error: {
          code: exception.code,
          message: exception.message,
          fields: exception.fields,
          requestId: currentRequestId,
        },
      });
      return;
    }

    if (exception instanceof z.ZodError) {
      response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "داده ورودی نامعتبر است.",
          fields: zodFields(exception),
          requestId: currentRequestId,
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (healthFailure(exceptionResponse)) {
        response.status(status).json(exceptionResponse);
        return;
      }
      const envelope = existingEnvelope(exceptionResponse, currentRequestId);
      response.status(status).json({
        error: envelope ?? {
          code: codeForStatus(status),
          message: messageForStatus(status),
          fields: {},
          requestId: currentRequestId,
        },
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "خطای غیرمنتظره‌ای رخ داد.",
        fields: {},
        requestId: currentRequestId,
      },
    });
  }
}
