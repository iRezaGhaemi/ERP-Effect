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

export const VerifyOtpSchema = z.object({
  challengeId: z.uuid(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "کد تأیید معتبر نیست."),
});

export const AuthUserSummarySchema = z.object({
  id: z.uuid(),
  phone: z.string().min(1),
  firstName: z.string(),
  lastName: z.string(),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  lastLoginAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const AuthSessionResponseSchema = z.object({
  user: AuthUserSummarySchema,
  sessionId: z.uuid(),
});

export const AuthSessionItemSchema = z.object({
  id: z.uuid(),
  device: z.string(),
  ipAddress: z.string(),
  createdAt: z.iso.datetime(),
  lastUsedAt: z.iso.datetime(),
  current: z.boolean(),
});

export const MeResponseSchema = z.object({
  user: AuthUserSummarySchema,
  permissions: z.array(z.string()),
});

export type RequestOtpInput = z.input<typeof RequestOtpSchema>;
export type RequestOtpResponse = z.infer<typeof RequestOtpResponseSchema>;
export type VerifyOtpInput = z.input<typeof VerifyOtpSchema>;
export type AuthUserSummary = z.infer<typeof AuthUserSummarySchema>;
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>;
export type AuthSessionItem = z.infer<typeof AuthSessionItemSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
