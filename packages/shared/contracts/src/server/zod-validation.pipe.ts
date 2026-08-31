import type { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import { z } from "zod";

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodType) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    return this.schema.parse(value);
  }
}
