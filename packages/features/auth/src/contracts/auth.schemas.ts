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

export const RequestOtpSchema = z.object({
  phone: z.string().trim().refine(isIranianMobile, "شماره موبایل معتبر نیست."),
});

export const RequestOtpResponseSchema = z.object({
  accepted: z.literal(true),
  challengeId: z.uuid(),
  retryAfterSeconds: z.number().int().positive(),
});

export type RequestOtpInput = z.input<typeof RequestOtpSchema>;
export type RequestOtpResponse = z.infer<typeof RequestOtpResponseSchema>;
