import { z } from "zod";

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = persianDigits.indexOf(digit);
    return persianIndex >= 0
      ? String(persianIndex)
      : String(arabicDigits.indexOf(digit));
  });
}

function isIranianMobile(value: string): boolean {
  const compact = toEnglishDigits(value).trim().replace(/[\s-]/g, "");
  return /^(?:\+98|0098|98|0)9\d{9}$/.test(compact);
}

export const CreateUserSchema = z.object({
  phone: z.string().trim().refine(isIranianMobile, "شماره موبایل معتبر نیست."),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
});

export type CreateUserInput = z.input<typeof CreateUserSchema>;

export const UpdateUserSchema = CreateUserSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "حداقل یک فیلد باید ارسال شود.",
);
export const UserPageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type UpdateUserInput = z.input<typeof UpdateUserSchema>;
export type UserPageQuery = z.infer<typeof UserPageQuerySchema>;
