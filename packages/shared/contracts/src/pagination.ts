import { z } from 'zod';

export const PageMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  pageCount: z.number().int().nonnegative(),
});

export type PageMeta = z.infer<typeof PageMetaSchema>;

export type Page<T> = {
  items: T[];
  meta: PageMeta;
};

export function createPageSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    meta: PageMetaSchema,
  });
}
