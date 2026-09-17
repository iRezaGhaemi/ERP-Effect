import { PasswordInputSchema, UsernameSchema } from "@effect/users/contracts";
import { z } from "zod";

export const LoginSchema = z.object({
  username: UsernameSchema,
  password: PasswordInputSchema,
});

export type LoginInput = z.input<typeof LoginSchema>;
