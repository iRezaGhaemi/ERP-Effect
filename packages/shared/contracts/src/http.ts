import { z } from "zod";

export const UuidIdParamsSchema = z.object({ id: z.uuid() });
export const OkResponseSchema = z.object({ ok: z.literal(true) });

export type UuidIdParams = z.infer<typeof UuidIdParamsSchema>;
export type OkResponse = z.infer<typeof OkResponseSchema>;
