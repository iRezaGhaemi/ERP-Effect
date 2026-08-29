import {
  Controller,
  Get,
  HttpException,
  Query,
  SetMetadata,
} from "@nestjs/common";
import { z } from "zod";

import { AuditQuerySchema } from "../contracts/index.js";
import { AuditQueryService } from "./audit-query.service.js";

const RequirePermission = (key: string): MethodDecorator =>
  SetMetadata("effect:required-permission", key);

@Controller("audit-logs")
export class AuditController {
  constructor(private readonly queryService: AuditQueryService) {}
  @Get()
  @RequirePermission("audit:read")
  async list(@Query() query: unknown) {
    try {
      return await this.queryService.list(AuditQuerySchema.parse(query));
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new HttpException(
          {
            error: {
              code: "VALIDATION_FAILED",
              message: "داده ورودی نامعتبر است.",
              fields: {},
              requestId: "unknown",
            },
          },
          422,
        );
      throw error;
    }
  }
}
