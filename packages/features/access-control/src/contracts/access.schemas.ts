import { createPageSchema } from "@effect-erp/contracts";
import { z } from "zod";

export const PermissionKeySchema = z.enum([
  "users:read",
  "users:create",
  "users:update",
  "users:suspend",
  "roles:manage",
  "sessions:revoke",
  "audit:read",
]);

export const PermissionEffectSchema = z.enum(["ALLOW", "DENY"]);
export const AccessPageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export const RoleDtoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  isSystem: z.boolean(),
  permissionKeys: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export const PermissionDtoSchema = z.object({
  id: z.uuid(),
  resource: z.string(),
  action: z.string(),
  key: z.string(),
  createdAt: z.date(),
});
export const RolePageSchema = createPageSchema(RoleDtoSchema);
export const PermissionPageSchema = createPageSchema(PermissionDtoSchema);
export const CreateRoleSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
  permissionIds: z
    .array(z.uuid())
    .refine((ids) => new Set(ids).size === ids.length, "مجوز تکراری است.")
    .default([]),
});
export const UpdateRoleSchema = CreateRoleSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "حداقل یک فیلد باید ارسال شود.",
);
export const ReplaceUserRolesSchema = z.object({ roleIds: z.array(z.uuid()) });
export const ReplacePermissionOverridesSchema = z.object({
  overrides: z.array(
    z.object({ permissionId: z.uuid(), effect: PermissionEffectSchema }),
  ),
});

export type PermissionKey = z.infer<typeof PermissionKeySchema>;
export type PermissionEffect = z.infer<typeof PermissionEffectSchema>;
export type AccessPageQuery = z.infer<typeof AccessPageQuerySchema>;
export type CreateRoleInput = z.input<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.input<typeof UpdateRoleSchema>;
export type ReplacePermissionOverridesInput = z.input<
  typeof ReplacePermissionOverridesSchema
>;
