import { DomainError } from "@effect-erp/contracts";
import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import { z } from "zod";

import { RequestOtpSchema } from "../contracts/index.js";
import { OtpService } from "./otp.service.js";

type AnonymousRequest = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
};

function header(
  request: AnonymousRequest,
  name: string,
  fallback: string,
): string {
  const value = request.headers[name];
  return Array.isArray(value) ? (value[0] ?? fallback) : (value ?? fallback);
}

function statusFor(error: DomainError): number {
  if (error.code === "RATE_LIMITED") return HttpStatus.TOO_MANY_REQUESTS;
  if (error.code === "SMS_DELIVERY_FAILED") return HttpStatus.BAD_GATEWAY;
  return HttpStatus.UNPROCESSABLE_ENTITY;
}

@Controller("auth/otp")
export class AuthController {
  constructor(private readonly otpService: OtpService) {}

  @Post("request")
  @HttpCode(HttpStatus.ACCEPTED)
  async requestOtp(@Body() body: unknown, @Req() request: AnonymousRequest) {
    try {
      return await this.otpService.request(RequestOtpSchema.parse(body), {
        requestId: header(request, "x-request-id", "unknown"),
        ipAddress: request.ip ?? request.socket?.remoteAddress ?? "unknown",
        userAgent: header(request, "user-agent", "unknown"),
      });
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
}
