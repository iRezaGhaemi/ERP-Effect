import { createPageSchema } from "@effect-erp/contracts";
import { z } from "zod";

const workspaceNameSchema = z.string().trim().min(1).max(160);

export const WorkspaceStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export const WorkspaceMemberRoleSchema = z.enum(["MANAGER", "MEMBER", "VIEWER"]);
export const VersionSchema = z.number().int().min(1);
export const WorkspacePageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).default(""),
  status: WorkspaceStatusSchema.optional(),
  sort: z.enum(["name", "createdAt", "updatedAt"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export const CreateWorkspaceSchema = z.object({
  customerId: z.uuid(),
  name: workspaceNameSchema,
});
export const UpdateWorkspaceSchema = z
  .object({
    name: workspaceNameSchema.optional(),
    status: WorkspaceStatusSchema.optional(),
    version: VersionSchema,
  })
  .refine(
    ({ version: _version, ...values }) => Object.keys(values).length > 0,
    "حداقل یک فیلد باید ارسال شود.",
  );

export const WorkspaceMemberDtoSchema = z.object({
  userId: z.uuid(),
  role: WorkspaceMemberRoleSchema,
});
export const ReplaceWorkspaceMembersSchema = z.object({
  version: VersionSchema,
  members: z.array(WorkspaceMemberDtoSchema),
});

export const WorkspaceDtoSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
  name: z.string(),
  status: WorkspaceStatusSchema,
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: VersionSchema,
});
export const WorkspaceDetailDtoSchema = WorkspaceDtoSchema.extend({
  members: z.array(WorkspaceMemberDtoSchema),
});
export const WorkspacePageSchema = createPageSchema(WorkspaceDtoSchema);

export type WorkspaceDto = z.infer<typeof WorkspaceDtoSchema>;
export type WorkspaceDetailDto = z.infer<typeof WorkspaceDetailDtoSchema>;
export type WorkspacePageQuery = z.infer<typeof WorkspacePageQuerySchema>;
export type CreateWorkspaceInput = z.input<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.input<typeof UpdateWorkspaceSchema>;
export type ReplaceWorkspaceMembersInput = z.input<
  typeof ReplaceWorkspaceMembersSchema
>;
