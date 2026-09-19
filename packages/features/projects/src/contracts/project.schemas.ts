import { createPageSchema } from "@effect-erp/contracts";
import { z } from "zod";

const projectNameSchema = z.string().trim().min(1).max(160);
const nullableText = (max: number) =>
  z.string().trim().min(1).max(max).nullable().optional().default(null);
const nullableDate = z.iso.date().nullable().optional().default(null);

function datesAreInOrder({
  startDate,
  dueDate,
}: {
  startDate?: string | null | undefined;
  dueDate?: string | null | undefined;
}): boolean {
  return startDate == null || dueDate == null || dueDate >= startDate;
}

export const ProjectStatusSchema = z.enum([
  "PLANNED",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
]);
export const ProjectMemberRoleSchema = z.enum(["MANAGER", "MEMBER", "VIEWER"]);
export const VersionSchema = z.number().int().min(1);
export const ProjectPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).default(""),
  status: ProjectStatusSchema.optional(),
  workspaceId: z.uuid().optional(),
  sort: z.enum(["name", "dueDate", "createdAt", "updatedAt"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export const CreateProjectSchema = z
  .object({
    workspaceId: z.uuid(),
    name: projectNameSchema,
    description: nullableText(4000),
    startDate: nullableDate,
    dueDate: nullableDate,
  })
  .refine(datesAreInOrder, "تاریخ پایان نمی‌تواند پیش از تاریخ شروع باشد.");
export const UpdateProjectSchema = z
  .object({
    name: projectNameSchema.optional(),
    description: nullableText(4000).optional(),
    status: ProjectStatusSchema.optional(),
    startDate: nullableDate.optional(),
    dueDate: nullableDate.optional(),
    version: VersionSchema,
  })
  .refine(
    ({ version: _version, ...values }) => Object.keys(values).length > 0,
    "حداقل یک فیلد باید ارسال شود.",
  )
  .refine(datesAreInOrder, "تاریخ پایان نمی‌تواند پیش از تاریخ شروع باشد.");

export const ProjectMemberDtoSchema = z.object({
  userId: z.uuid(),
  role: ProjectMemberRoleSchema,
});
export const ReplaceProjectMembersSchema = z.object({
  version: VersionSchema,
  members: z.array(ProjectMemberDtoSchema),
});

export const ProjectDtoSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  status: ProjectStatusSchema,
  startDate: z.iso.date().nullable(),
  dueDate: z.iso.date().nullable(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: VersionSchema,
});
export const ProjectDetailDtoSchema = ProjectDtoSchema.extend({
  members: z.array(ProjectMemberDtoSchema),
});
export const ProjectPageSchema = createPageSchema(ProjectDtoSchema);

export type ProjectDto = z.infer<typeof ProjectDtoSchema>;
export type ProjectDetailDto = z.infer<typeof ProjectDetailDtoSchema>;
export type ProjectPageQuery = z.infer<typeof ProjectPageQuerySchema>;
export type CreateProjectInput = z.input<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.input<typeof UpdateProjectSchema>;
export type ReplaceProjectMembersInput = z.input<typeof ReplaceProjectMembersSchema>;
